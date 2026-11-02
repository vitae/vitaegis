/// Pricing for Kalshi BTC binaries: driftless GBM on the settlement horizon, Kalshi's
/// quadratic taker fee, and the fee-adjusted edge of the better side.
///
/// Research notes behind the choices (see STRATEGY.md): the market is close to calibrated,
/// the taker fee (max 1.75c at 50c) is the dominant cost, and clamping the model to
/// [0.10, 0.90] improved calibration out of sample.

pub const PROB_FLOOR: f64 = 0.10;
pub const PROB_CEIL: f64 = 0.90;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum StrikeType {
    GreaterOrEqual,
    Greater,
    Less,
    Between,
}

impl StrikeType {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "greater_or_equal" => Some(Self::GreaterOrEqual),
            "greater" => Some(Self::Greater),
            "less" => Some(Self::Less),
            "between" => Some(Self::Between),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Side {
    Yes,
    No,
}

impl Side {
    pub fn as_str(&self) -> &'static str {
        match self {
            Side::Yes => "yes",
            Side::No => "no",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Edge {
    pub side: Side,
    /// Price paid for that side, in dollars (0..1).
    pub price: f64,
    /// Expected value per contract after the taker fee, in cents.
    pub cents: f64,
    pub p_yes: f64,
}

/// Standard normal CDF.
pub fn norm_cdf(x: f64) -> f64 {
    0.5 * (1.0 + erf(x / std::f64::consts::SQRT_2))
}

/// P(S_T >= strike) under driftless GBM with total horizon vol `sigma_tau`
/// (already scaled by sqrt(time), e.g. sigma_15m * sqrt(secs / 900)).
pub fn prob_above(spot: f64, strike: f64, sigma_tau: f64) -> f64 {
    if sigma_tau <= 0.0 {
        return if spot >= strike { 1.0 } else { 0.0 };
    }
    let d = ((spot / strike).ln() + 0.5 * sigma_tau * sigma_tau) / sigma_tau;
    norm_cdf(d - sigma_tau)
}

/// P(YES) for any Kalshi BTC strike layout.
pub fn prob_yes(kind: StrikeType, spot: f64, floor: Option<f64>, cap: Option<f64>, sigma_tau: f64) -> Option<f64> {
    Some(match kind {
        StrikeType::GreaterOrEqual | StrikeType::Greater => prob_above(spot, floor?, sigma_tau),
        StrikeType::Less => 1.0 - prob_above(spot, cap?, sigma_tau),
        StrikeType::Between => {
            let hi = prob_above(spot, floor?, sigma_tau);
            let lo = prob_above(spot, cap?, sigma_tau);
            (hi - lo).max(0.0)
        }
    })
}

pub fn clamp_prob(p: f64) -> f64 {
    p.max(PROB_FLOOR).min(PROB_CEIL)
}

/// True when the raw model sits outside the clamp. A clamped probability against a
/// near-certain market is the clamp talking, not an edge, so no trade is taken then.
pub fn clamp_binding(p_raw: f64) -> bool {
    !(PROB_FLOOR..=PROB_CEIL).contains(&p_raw)
}

/// Prices the bot will pay. Below 15c is longshot territory, which prediction markets
/// systematically overprice; above 85c the fee eats most of the payoff.
pub const MIN_ENTRY_PRICE: f64 = 0.15;
pub const MAX_ENTRY_PRICE: f64 = 0.85;

pub fn tradable_price(price: f64) -> bool {
    (MIN_ENTRY_PRICE..=MAX_ENTRY_PRICE).contains(&price)
}

/// Kalshi taker fee per contract in dollars: 0.07 * P * (1 - P).
pub fn taker_fee(price: f64) -> f64 {
    0.07 * price * (1.0 - price)
}

/// Fee-adjusted EV of buying `side` at `price`, in cents per contract.
pub fn ev_cents(p_yes: f64, side: Side, price: f64) -> f64 {
    let p_win = match side {
        Side::Yes => p_yes,
        Side::No => 1.0 - p_yes,
    };
    (p_win * (1.0 - price) - (1.0 - p_win) * price - taker_fee(price)) * 100.0
}

/// The better of buying YES at `yes_ask` or NO at `no_ask`, or None when neither is quoted.
pub fn best_edge(p_yes: f64, yes_ask: Option<f64>, no_ask: Option<f64>) -> Option<Edge> {
    let mut best: Option<Edge> = None;
    for (side, ask) in [(Side::Yes, yes_ask), (Side::No, no_ask)] {
        let Some(price) = ask else { continue };
        if !(0.01..=0.99).contains(&price) {
            continue;
        }
        let cents = ev_cents(p_yes, side, price);
        if best.map_or(true, |b| cents > b.cents) {
            best = Some(Edge { side, price, cents, p_yes });
        }
    }
    best
}

/// V2 order terms for buying `side` at `cost` dollars per contract. V2 quotes everything on
/// the YES book: buying YES is a bid at the YES price, buying NO is an ask at 1 - cost.
pub fn v2_order_terms(side: Side, cost: f64) -> (&'static str, String) {
    match side {
        Side::Yes => ("bid", format!("{:.4}", cost)),
        Side::No => ("ask", format!("{:.4}", 1.0 - cost)),
    }
}

/// Cost per contract of a V2 fill. `average_fill_price` is on the YES book, so a NO fill
/// costs 1 - price. If that would exceed the limit by more than a tick the response was
/// already in NO terms, and the value is used as it came.
pub fn v2_fill_cost(side: Side, average_fill_price: f64, limit: f64) -> f64 {
    match side {
        Side::Yes => average_fill_price,
        Side::No => {
            let cost = 1.0 - average_fill_price;
            if cost > limit + 0.011 {
                average_fill_price
            } else {
                cost
            }
        }
    }
}

fn erf(x: f64) -> f64 {
    // Abramowitz & Stegun 7.1.26, |error| < 1.5e-7
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();
    let t = 1.0 / (1.0 + p * x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * (-x * x).exp();
    sign * y
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn at_the_money_is_a_coin_flip() {
        let p = prob_above(100.0, 100.0, 0.01);
        assert!((p - 0.5).abs() < 0.01, "{p}");
    }

    #[test]
    fn far_in_the_money_goes_to_one() {
        assert!(prob_above(110.0, 100.0, 0.01) > 0.999);
        assert!(prob_above(90.0, 100.0, 0.01) < 0.001);
    }

    #[test]
    fn between_is_bounded() {
        let p = prob_yes(StrikeType::Between, 100.0, Some(99.0), Some(101.0), 0.01).unwrap();
        assert!(p > 0.0 && p < 1.0);
    }

    #[test]
    fn fee_peaks_at_fifty_cents() {
        assert!((taker_fee(0.5) - 0.0175).abs() < 1e-9);
        assert!(taker_fee(0.9) < taker_fee(0.5));
    }

    #[test]
    fn fair_price_has_negative_edge_after_fee() {
        let e = ev_cents(0.5, Side::Yes, 0.5);
        assert!((e + 1.75).abs() < 1e-9, "{e}");
    }

    #[test]
    fn v2_terms_quote_the_yes_book() {
        assert_eq!(v2_order_terms(Side::Yes, 0.91), ("bid", "0.9100".to_string()));
        assert_eq!(v2_order_terms(Side::No, 0.30), ("ask", "0.7000".to_string()));
        assert_eq!(v2_order_terms(Side::No, 0.905), ("ask", "0.0950".to_string()));
    }

    #[test]
    fn v2_fill_cost_is_in_the_buyers_terms() {
        assert!((v2_fill_cost(Side::Yes, 0.91, 0.91) - 0.91).abs() < 1e-9);
        assert!((v2_fill_cost(Side::No, 0.70, 0.30) - 0.30).abs() < 1e-9);
        assert!((v2_fill_cost(Side::No, 0.72, 0.30) - 0.28).abs() < 1e-9);
        assert!((v2_fill_cost(Side::No, 0.30, 0.30) - 0.30).abs() < 1e-9);
    }

    #[test]
    fn picks_the_cheaper_mispriced_side() {
        let e = best_edge(0.30, Some(0.45), Some(0.56)).unwrap();
        assert!(matches!(e.side, Side::No));
        assert!(e.cents > 10.0);
    }
}
