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
    fn picks_the_cheaper_mispriced_side() {
        let e = best_edge(0.30, Some(0.45), Some(0.56)).unwrap();
        assert!(matches!(e.side, Side::No));
        assert!(e.cents > 10.0);
    }
}
