/// Realized BTC volatility from two sources: Coinbase 15-minute candles (hours of history,
/// refreshed every few minutes) and the live tick stream (last ~30 minutes). The horizon
/// vol used for pricing takes the larger of the two, which pushes probabilities toward
/// 50% when the market is jumpy and keeps the edge estimate conservative.
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

const TICK_WINDOW_SECS: i64 = 30 * 60;
const TICK_BAR_SECS: i64 = 5;

#[derive(Default)]
pub struct VolState {
    /// Stdev of 15-minute log returns from candles.
    candle_sigma_15m: Option<f64>,
    /// Stdev of 5-second log returns from ticks, scaled to 15 minutes.
    tick_sigma_15m: Option<f64>,
    ticks: VecDeque<(i64, f64)>,
    last_bar: Option<(i64, f64)>,
}

pub type SharedVol = Arc<Mutex<VolState>>;

pub fn shared() -> SharedVol {
    Arc::new(Mutex::new(VolState::default()))
}

impl VolState {
    pub fn push_tick(&mut self, ts: i64, price: f64) {
        let bar = ts - ts.rem_euclid(TICK_BAR_SECS);
        match self.last_bar {
            Some((b, _)) if b == bar => self.last_bar = Some((bar, price)),
            Some((b, p)) => {
                self.ticks.push_back((b, p));
                self.last_bar = Some((bar, price));
                let _ = b;
            }
            None => self.last_bar = Some((bar, price)),
        }
        while self.ticks.front().map_or(false, |(t, _)| ts - t > TICK_WINDOW_SECS) {
            self.ticks.pop_front();
        }
        if self.ticks.len() >= 24 {
            let rets: Vec<f64> = self.ticks.iter().zip(self.ticks.iter().skip(1)).map(|((_, a), (_, b))| (b / a).ln()).collect();
            let sd = stdev(&rets);
            self.tick_sigma_15m = Some(sd * ((900.0 / TICK_BAR_SECS as f64).sqrt()));
        }
    }

    pub fn set_candle_sigma(&mut self, sigma_15m: f64) {
        self.candle_sigma_15m = Some(sigma_15m);
    }

    /// 15-minute sigma used for pricing, or None until either source has data.
    pub fn sigma_15m(&self) -> Option<f64> {
        match (self.candle_sigma_15m, self.tick_sigma_15m) {
            (Some(a), Some(b)) => Some(a.max(b)),
            (a, b) => a.or(b),
        }
    }

    /// Total vol over `secs` seconds (sigma_15m * sqrt(secs / 900)).
    pub fn sigma_for(&self, secs: f64) -> Option<f64> {
        self.sigma_15m().map(|s| s * (secs.max(1.0) / 900.0).sqrt())
    }
}

fn stdev(xs: &[f64]) -> f64 {
    if xs.len() < 2 {
        return 0.0;
    }
    let n = xs.len() as f64;
    let mean = xs.iter().sum::<f64>() / n;
    (xs.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / (n - 1.0)).sqrt()
}

/// Pull the last ~3.5 days of 15-minute candles from Coinbase and return the stdev of
/// close-to-close log returns.
pub async fn fetch_candle_sigma_15m(client: &reqwest::Client) -> Result<f64, Box<dyn std::error::Error>> {
    let v: serde_json::Value = client
        .get("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=900")
        .header("User-Agent", "kalshirust/0.1")
        .send()
        .await?
        .json()
        .await?;
    let mut closes: Vec<f64> = v
        .as_array()
        .ok_or("candles: not an array")?
        .iter()
        .filter_map(|c| c.get(4).and_then(|x| x.as_f64()))
        .collect();
    closes.reverse();
    if closes.len() < 20 {
        return Err("candles: too few rows".into());
    }
    let rets: Vec<f64> = closes.windows(2).map(|w| (w[1] / w[0]).ln()).collect();
    Ok(stdev(&rets))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tick_vol_builds_after_enough_bars() {
        let mut s = VolState::default();
        let mut p = 100.0;
        for i in 0..400 {
            p *= if i % 2 == 0 { 1.001 } else { 0.999 };
            s.push_tick(i * 5, p);
        }
        assert!(s.sigma_15m().unwrap() > 0.0);
    }

    #[test]
    fn horizon_scaling_is_sqrt_time() {
        let mut s = VolState::default();
        s.set_candle_sigma(0.002);
        let a = s.sigma_for(900.0).unwrap();
        let b = s.sigma_for(3600.0).unwrap();
        assert!((b / a - 2.0).abs() < 1e-9);
    }
}
