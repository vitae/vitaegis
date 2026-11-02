use std::collections::VecDeque;
use std::time::{Duration, Instant};
use statrs::distribution::{ContinuousCDF, Normal};

const SETTLEMENT_WINDOW_SECS: usize = 60;
const QUADRATIC_FEE_MULT: f64 = 0.07; // Kalshi KXBTC15M: 0.07 * C * P * (1 - P)
/// The published BRTI file refreshes about once a second, so a healthy print can be about a
/// second old by the time it is used.
const MAX_PRINT_AGE: Duration = Duration::from_secs(3);
/// The Kalshi book is event-driven: a quiet top of book is still the current quote, and an
/// immediate-or-cancel order cannot fill at a price that has gone.
const MAX_BOOK_AGE: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Copy)]
pub struct BrtiPrint {
    pub price: f64,
    pub received_at: Instant,
}

#[derive(Debug, Clone, Copy)]
pub struct KalshiBookTop {
    pub yes_bid: f64,
    pub yes_ask: f64,
    pub no_bid: f64,
    pub no_ask: f64,
    pub updated_at: Instant,
}

#[derive(Debug, PartialEq, Clone)]
pub enum ExecutionSignal {
    Hold,
    PostMaker { side: Side, price_dollars: f64, contracts: u32, ev_cents: f64 },
    SnipeTaker { side: Side, max_price_dollars: f64, contracts: u32, net_edge_cents: f64 },
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Side {
    Yes,
    No,
}

pub struct KxBtc15mEngine {
    pub target_strike: f64,
    prints: VecDeque<BrtiPrint>,
    ewma_var_1s: f64,
    last_price: Option<f64>,
    alpha: f64,
    /// Dollar floor on the settlement estimate's spread: feed timing and basis error.
    noise_dollars: f64,
}

impl KxBtc15mEngine {
    pub fn new(target_strike: f64, noise_dollars: f64) -> Self {
        Self {
            target_strike,
            prints: VecDeque::with_capacity(SETTLEMENT_WINDOW_SECS + 5),
            ewma_var_1s: 1e-7,
            last_price: None,
            alpha: 0.15,
            noise_dollars,
        }
    }

    pub fn on_brti_second_print(&mut self, price: f64, now: Instant) {
        if let Some(prev) = self.last_price {
            let ret = (price / prev).ln();
            self.ewma_var_1s = self.alpha * (ret * ret) + (1.0 - self.alpha) * self.ewma_var_1s;
        }
        self.last_price = Some(price);

        if self.prints.len() == SETTLEMENT_WINDOW_SECS {
            self.prints.pop_front();
        }
        self.prints.push_back(BrtiPrint { price, received_at: now });
    }

    #[inline(always)]
    pub fn taker_fee_per_contract(price_dollars: f64) -> f64 {
        QUADRATIC_FEE_MULT * price_dollars * (1.0 - price_dollars)
    }

    #[inline(always)]
    pub fn snap_to_valid_tick(price_dollars: f64) -> f64 {
        let clamped = price_dollars.clamp(0.001, 0.999);
        if clamped < 0.10 || clamped > 0.90 {
            (clamped * 1000.0).round() / 1000.0
        } else {
            (clamped * 100.0).round() / 100.0
        }
    }

    pub fn compute_true_yes_probability(&self, secs_to_expiration: f64) -> Option<f64> {
        let current_spot = self.last_price?;
        let sigma_1s = self.ewma_var_1s.sqrt().max(1e-5);
        let sigma_dollar_1s = current_spot * sigma_1s;

        if secs_to_expiration <= 0.0 {
            let avg = self.current_60s_average()?;
            return Some(if avg >= self.target_strike { 1.0 } else { 0.0 });
        }

        if secs_to_expiration < 60.0 {
            let rem_secs = secs_to_expiration.ceil() as usize;
            let locked_count = SETTLEMENT_WINDOW_SECS.saturating_sub(rem_secs);
            // Too few prints would understate the locked sum and fake a confident answer.
            if self.prints.len() < locked_count {
                return None;
            }

            let locked_sum: f64 = self.prints.iter().rev().take(locked_count).map(|p| p.price).sum();
            let m = rem_secs as f64;
            let required_remaining_sum = (60.0 * self.target_strike) - locked_sum;
            let expected_remaining_sum = m * current_spot;

            let sum_variance = (sigma_dollar_1s * sigma_dollar_1s) * m * (m + 1.0) * (2.0 * m + 1.0) / 6.0;
            let noise_sum = 60.0 * self.noise_dollars;
            let sum_std = (sum_variance + noise_sum * noise_sum).sqrt().max(1e-6);

            let z = (expected_remaining_sum - required_remaining_sum) / sum_std;
            let normal = Normal::new(0.0, 1.0).ok()?;
            return Some(normal.cdf(z).clamp(0.0001, 0.9999));
        }

        let pre_window_secs = secs_to_expiration - 60.0;
        let var_pre_window = (sigma_dollar_1s * sigma_dollar_1s) * pre_window_secs;
        let var_during_window = (sigma_dollar_1s * sigma_dollar_1s) * (60.0 * 61.0 * 121.0) / (6.0 * 3600.0);
        let total_std = (var_pre_window + var_during_window + self.noise_dollars * self.noise_dollars).sqrt().max(1e-6);

        let z = (current_spot - self.target_strike) / total_std;
        let normal = Normal::new(0.0, 1.0).ok()?;
        Some(normal.cdf(z).clamp(0.0001, 0.9999))
    }

    pub fn evaluate_signal(
        &self,
        book: &KalshiBookTop,
        secs_to_expiration: f64,
        now: Instant,
        min_net_edge_cents: f64,
    ) -> ExecutionSignal {
        let last_print_time = match self.prints.back() {
            Some(p) => p.received_at,
            None => return ExecutionSignal::Hold,
        };
        if now.duration_since(last_print_time) > MAX_PRINT_AGE
            || now.duration_since(book.updated_at) > MAX_BOOK_AGE
        {
            return ExecutionSignal::Hold;
        }

        let true_p_yes = match self.compute_true_yes_probability(secs_to_expiration) {
            Some(p) => p,
            None => return ExecutionSignal::Hold,
        };
        let true_p_no = 1.0 - true_p_yes;

        let yes_fee = Self::taker_fee_per_contract(book.yes_ask);
        let yes_net_edge_dollars = true_p_yes - book.yes_ask - yes_fee;
        if yes_net_edge_dollars * 100.0 >= min_net_edge_cents {
            return ExecutionSignal::SnipeTaker {
                side: Side::Yes,
                max_price_dollars: Self::snap_to_valid_tick(book.yes_ask),
                contracts: self.size_position(yes_net_edge_dollars, book.yes_ask),
                net_edge_cents: yes_net_edge_dollars * 100.0,
            };
        }

        let no_fee = Self::taker_fee_per_contract(book.no_ask);
        let no_net_edge_dollars = true_p_no - book.no_ask - no_fee;
        if no_net_edge_dollars * 100.0 >= min_net_edge_cents {
            return ExecutionSignal::SnipeTaker {
                side: Side::No,
                max_price_dollars: Self::snap_to_valid_tick(book.no_ask),
                contracts: self.size_position(no_net_edge_dollars, book.no_ask),
                net_edge_cents: no_net_edge_dollars * 100.0,
            };
        }

        if secs_to_expiration > 45.0 && (book.yes_ask - book.yes_bid) >= 0.02 {
            let target_maker_yes = Self::snap_to_valid_tick(true_p_yes - 0.015);
            if target_maker_yes > book.yes_bid && target_maker_yes < book.yes_ask {
                let maker_ev_cents = (true_p_yes - target_maker_yes) * 100.0;
                return ExecutionSignal::PostMaker {
                    side: Side::Yes,
                    price_dollars: target_maker_yes,
                    contracts: 25,
                    ev_cents: maker_ev_cents,
                };
            }
        }

        ExecutionSignal::Hold
    }

    fn size_position(&self, net_edge_dollars: f64, ask_price: f64) -> u32 {
        let b = (1.0 - ask_price) / ask_price.max(0.01);
        let kelly_fraction = (net_edge_dollars / b).clamp(0.0, 0.15);
        ((kelly_fraction * 500.0).round() as u32).clamp(10, 150)
    }

    fn current_60s_average(&self) -> Option<f64> {
        if self.prints.is_empty() {
            return None;
        }
        let sum: f64 = self.prints.iter().map(|p| p.price).sum();
        Some(sum / (self.prints.len() as f64))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn engine(strike: f64, noise: f64, prices: &[f64], at: Instant) -> KxBtc15mEngine {
        let mut e = KxBtc15mEngine::new(strike, noise);
        for p in prices {
            e.on_brti_second_print(*p, at);
        }
        e
    }

    fn book(yes_bid: f64, yes_ask: f64, at: Instant) -> KalshiBookTop {
        KalshiBookTop { yes_bid, yes_ask, no_bid: 1.0 - yes_ask, no_ask: 1.0 - yes_bid, updated_at: at }
    }

    #[test]
    fn locked_prints_above_the_strike_make_yes_likely() {
        let e = engine(100.0, 0.0, &[100.2; 60], Instant::now());
        assert!(e.compute_true_yes_probability(20.0).unwrap() > 0.9);
    }

    #[test]
    fn at_the_money_is_about_even() {
        let e = engine(100.0, 0.0, &[100.0; 60], Instant::now());
        let p = e.compute_true_yes_probability(120.0).unwrap();
        assert!((p - 0.5).abs() < 0.01, "{p}");
    }

    #[test]
    fn the_noise_floor_stops_false_certainty() {
        let now = Instant::now();
        let sharp = engine(100.0, 0.0, &[100.2; 60], now).compute_true_yes_probability(5.0).unwrap();
        let noisy = engine(100.0, 4.0, &[100.2; 60], now).compute_true_yes_probability(5.0).unwrap();
        assert!(sharp > 0.99 && noisy < 0.6, "{sharp} {noisy}");
    }

    #[test]
    fn too_few_prints_give_no_estimate() {
        let e = engine(100.0, 0.0, &[100.2; 5], Instant::now());
        assert!(e.compute_true_yes_probability(20.0).is_none());
    }

    #[test]
    fn a_stale_print_holds() {
        let now = Instant::now();
        let e = engine(100.0, 0.0, &[100.2; 60], now);
        let later = now + Duration::from_secs(10);
        assert_eq!(e.evaluate_signal(&book(0.88, 0.90, later), 20.0, later, 2.0), ExecutionSignal::Hold);
    }

    #[test]
    fn a_second_old_print_on_this_feed_still_signals() {
        let now = Instant::now();
        let e = engine(100.0, 0.0, &[100.2; 60], now);
        let later = now + Duration::from_secs(1);
        assert!(matches!(e.evaluate_signal(&book(0.88, 0.90, later), 20.0, later, 2.0), ExecutionSignal::SnipeTaker { side: Side::Yes, .. }));
    }

    #[test]
    fn a_quiet_book_is_not_stale() {
        let now = Instant::now();
        let e = engine(100.0, 0.0, &[100.2; 60], now + Duration::from_secs(5));
        let later = now + Duration::from_secs(6);
        assert!(matches!(e.evaluate_signal(&book(0.88, 0.90, now), 20.0, later, 2.0), ExecutionSignal::SnipeTaker { .. }));
    }

    #[test]
    fn it_signals_no_when_the_average_is_below_the_strike() {
        let now = Instant::now();
        let e = engine(100.0, 0.0, &[99.8; 60], now);
        assert!(matches!(e.evaluate_signal(&book(0.09, 0.10, now), 20.0, now, 2.0), ExecutionSignal::SnipeTaker { side: Side::No, .. }));
    }
}
