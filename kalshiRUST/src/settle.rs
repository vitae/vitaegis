/// Last-minute settlement engine.
///
/// KXBTC15M settles on the simple average of the sixty 1-second BRTI prints before close.
/// Kalshi publishes those prints every second (one to three seconds behind the index), so
/// inside the final minute part of the settlement value is already known. The current index
/// level is anchored on Coinbase's real-time feed, shifted by the measured BRTI-minus-
/// Coinbase basis, which removes the published file's lag from the unknown remainder.
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use crate::models::norm_cdf;

pub const BRTI_URL: &str = "https://kalshi-public-docs.s3.amazonaws.com/external/crypto/btc_history.json";
/// How far behind the index the published file runs.
pub const FEED_LAG_SECS: f64 = 3.0;
const SIGMA_WINDOW: usize = 600;
const BASIS_SAMPLES: usize = 30;
const COINBASE_KEEP_MS: i64 = 180_000;

#[derive(Debug, Clone, Default)]
pub struct BrtiState {
    /// Last 60 raw 1-second prints, oldest first.
    pub raw: Vec<f64>,
    /// Last 60 values of the 60-second rolling average, oldest first.
    pub rolling: Vec<f64>,
    /// Unix seconds of the newest print.
    pub as_of: i64,
    history: VecDeque<f64>,
    /// Coinbase mid ticks (unix ms, price), newest last.
    coinbase: VecDeque<(i64, f64)>,
    basis_samples: VecDeque<f64>,
    pub polls: u64,
    pub failures: u64,
}

pub type SharedBrti = Arc<Mutex<BrtiState>>;

pub fn shared() -> SharedBrti {
    Arc::new(Mutex::new(BrtiState::default()))
}

/// What the engine anchors the unknown prints on.
#[derive(Debug, Clone, Copy)]
pub struct Anchor {
    pub price: f64,
    /// Seconds between the anchor's timestamp and now.
    pub age: f64,
    pub from_coinbase: bool,
}

impl BrtiState {
    pub fn ingest(&mut self, raw: Vec<f64>, rolling: Vec<f64>, as_of: i64) {
        if raw.is_empty() {
            return;
        }
        let new_count = if self.as_of == 0 { raw.len() } else { ((as_of - self.as_of).max(0) as usize).min(raw.len()) };
        for p in raw.iter().skip(raw.len() - new_count) {
            self.history.push_back(*p);
        }
        while self.history.len() > SIGMA_WINDOW {
            self.history.pop_front();
        }
        if let (Some(last), Some(cb)) = (raw.last(), self.coinbase_at(as_of * 1000 + 999)) {
            self.basis_samples.push_back(last - cb);
            while self.basis_samples.len() > BASIS_SAMPLES {
                self.basis_samples.pop_front();
            }
        }
        self.raw = raw;
        self.rolling = rolling;
        self.as_of = as_of;
        self.polls += 1;
    }

    pub fn push_coinbase(&mut self, ts_ms: i64, mid: f64) {
        self.coinbase.push_back((ts_ms, mid));
        while self.coinbase.front().map_or(false, |(t, _)| ts_ms - t > COINBASE_KEEP_MS) {
            self.coinbase.pop_front();
        }
    }

    /// Newest Coinbase tick at or before `ts_ms`, if within two seconds of it.
    fn coinbase_at(&self, ts_ms: i64) -> Option<f64> {
        self.coinbase.iter().rev().find(|(t, _)| *t <= ts_ms).filter(|(t, _)| ts_ms - t <= 2000).map(|(_, p)| *p)
    }

    /// Median of recent (BRTI - Coinbase) samples.
    pub fn basis(&self) -> Option<f64> {
        if self.basis_samples.len() < 5 {
            return None;
        }
        let mut v: Vec<f64> = self.basis_samples.iter().copied().collect();
        v.sort_by(|a, b| a.partial_cmp(b).unwrap());
        Some(v[v.len() / 2])
    }

    pub fn fresh(&self, now: i64) -> bool {
        self.as_of > 0 && now - self.as_of <= 10
    }

    /// Coinbase-anchored index level when the tick is fresh and the basis is known,
    /// otherwise the newest published print.
    pub fn anchor(&self, now_ms: i64) -> Option<Anchor> {
        if let (Some((t, mid)), Some(basis)) = (self.coinbase.back(), self.basis()) {
            if now_ms - t <= 2000 {
                return Some(Anchor { price: mid + basis, age: ((now_ms - t) as f64 / 1000.0).max(0.0), from_coinbase: true });
            }
        }
        self.raw.last().map(|p| Anchor { price: *p, age: (now_ms as f64 / 1000.0 - self.as_of as f64).max(0.0), from_coinbase: false })
    }

    /// Std dev of 1-second log returns over the recent history (at least 30 prints).
    pub fn sigma_1s(&self) -> Option<f64> {
        if self.history.len() < 30 {
            return None;
        }
        let rets: Vec<f64> = self.history.iter().zip(self.history.iter().skip(1)).map(|(a, b)| (b / a).ln()).collect();
        let n = rets.len() as f64;
        let mean = rets.iter().sum::<f64>() / n;
        Some((rets.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / (n - 1.0)).sqrt())
    }

    /// The rolling average as published at unix second `t`, when it is in the buffer.
    pub fn rolling_at_time(&self, t: i64) -> Option<f64> {
        let back = self.as_of - t;
        if !(0..60).contains(&back) || self.rolling.len() != 60 {
            return None;
        }
        self.rolling.get(59 - back as usize).copied()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Estimate {
    pub mean: f64,
    pub sd: f64,
    pub known_prints: usize,
    pub p_yes: f64,
}

/// Settlement estimate with `secs_left` to close. `raw` holds the last 60 published prints
/// (oldest first, newest `feed_lag` seconds old). Prints of the settlement minute that are
/// already published are known; the rest are a driftless random walk from the anchor.
pub fn estimate(raw: &[f64], secs_left: f64, feed_lag: f64, anchor: Anchor, sigma_1s: f64, noise_dollars: f64, strike: f64) -> Option<Estimate> {
    if raw.is_empty() || secs_left < -60.0 {
        return None;
    }
    // Print i of the settlement minute (1..=60) lands t_rel = i - 60 + secs_left seconds
    // after now (negative means already in the past).
    let mut known_sum = 0.0;
    let mut known = 0usize;
    let mut unknown: Vec<f64> = Vec::new(); // signed distance from the anchor's timestamp
    for i in 1..=60 {
        let t_rel = i as f64 - 60.0 + secs_left;
        if t_rel <= -feed_lag {
            known += 1;
        } else {
            unknown.push(t_rel + anchor.age);
        }
    }
    if known > raw.len() {
        return None;
    }
    for p in &raw[raw.len() - known..] {
        known_sum += p;
    }
    let mean = (known_sum + unknown.len() as f64 * anchor.price) / 60.0;
    // Brownian covariance from the anchor: min of distances on the same side of it, zero
    // across sides (past and future increments are independent).
    let mut acc = 0.0;
    for &a in &unknown {
        for &b in &unknown {
            if (a >= 0.0) == (b >= 0.0) {
                acc += a.abs().min(b.abs());
            }
        }
    }
    // Random-walk spread plus a floor for feed timing and basis error, in quadrature.
    let sd_walk = sigma_1s * anchor.price * (acc / 3600.0).sqrt();
    let sd = (sd_walk.powi(2) + noise_dollars.powi(2)).sqrt();
    let p_yes = if sd <= 0.0 {
        if mean >= strike { 1.0 } else { 0.0 }
    } else {
        norm_cdf((mean - strike) / sd)
    };
    Some(Estimate { mean, sd, known_prints: known, p_yes })
}

/// Poll the public feed once.
pub async fn poll(client: &reqwest::Client, state: &SharedBrti) -> Result<(), String> {
    let v: serde_json::Value = client
        .get(BRTI_URL)
        .header("Cache-Control", "no-cache")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let series = |k: &str| -> Vec<f64> { v[k].as_array().map(|a| a.iter().filter_map(|x| x.as_f64()).collect()).unwrap_or_default() };
    let raw = series("timeseries_adjusted");
    let rolling = series("timeseries");
    let as_of = v["maturity_ts_ms"].as_i64().map(|ms| ms / 1000).unwrap_or(0);
    if raw.len() < 60 || rolling.len() < 60 || as_of == 0 {
        return Err(format!("unexpected feed shape: {} prints, {} rolling, as_of {}", raw.len(), rolling.len(), as_of));
    }
    state.lock().unwrap().ingest(raw, rolling, as_of);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn flat(n: usize, v: f64) -> Vec<f64> {
        vec![v; n]
    }
    fn anchor(p: f64) -> Anchor {
        Anchor { price: p, age: 0.0, from_coinbase: true }
    }

    #[test]
    fn at_close_everything_is_known() {
        let e = estimate(&flat(60, 100.0), -FEED_LAG_SECS, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 99.0).unwrap();
        assert_eq!(e.known_prints, 60);
        assert!((e.mean - 100.0).abs() < 1e-9);
        assert!(e.sd < 1e-9);
        assert_eq!(e.p_yes, 1.0);
    }

    #[test]
    fn uncertainty_grows_with_time_left() {
        let raw = flat(60, 100.0);
        let a = estimate(&raw, 10.0, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 100.0).unwrap();
        let b = estimate(&raw, 40.0, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 100.0).unwrap();
        let c = estimate(&raw, 80.0, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 100.0).unwrap();
        assert!(a.sd < b.sd && b.sd < c.sd, "{} {} {}", a.sd, b.sd, c.sd);
        assert!(a.known_prints > b.known_prints && b.known_prints > c.known_prints);
    }

    #[test]
    fn known_prints_anchor_the_mean() {
        // 30 settlement prints known at 110, anchor (now) at 100, 27 s left + 3 s lag = 30 unknown.
        let mut raw = flat(30, 90.0);
        raw.extend(flat(30, 110.0));
        let e = estimate(&raw, 27.0, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 104.0).unwrap();
        assert_eq!(e.known_prints, 30);
        assert!((e.mean - 105.0).abs() < 1e-9, "{}", e.mean);
        assert!(e.p_yes > 0.5);
    }

    #[test]
    fn fresh_anchor_tightens_the_estimate() {
        let raw = flat(60, 100.0);
        let stale = estimate(&raw, 20.0, FEED_LAG_SECS, Anchor { price: 100.0, age: FEED_LAG_SECS, from_coinbase: false }, 0.001, 0.0, 100.0).unwrap();
        let live = estimate(&raw, 20.0, FEED_LAG_SECS, anchor(100.0), 0.001, 0.0, 100.0).unwrap();
        assert!(live.sd < stale.sd, "{} {}", live.sd, stale.sd);
    }

    #[test]
    fn basis_and_anchor_come_from_coinbase_when_fresh() {
        let mut s = BrtiState::default();
        for i in 0..10 {
            s.push_coinbase(1_000_000 + i * 1000, 100.0);
            s.ingest(flat(60, 105.0), flat(60, 105.0), 1000 + i);
        }
        assert_eq!(s.basis(), Some(5.0));
        let a = s.anchor(1_000_000 + 9 * 1000 + 500).unwrap();
        assert!(a.from_coinbase);
        assert!((a.price - 105.0).abs() < 1e-9);
        assert!((a.age - 0.5).abs() < 1e-9);
    }

    #[test]
    fn rolling_lookup_by_time() {
        let mut s = BrtiState::default();
        let rolling: Vec<f64> = (0..60).map(|i| i as f64).collect();
        s.ingest(flat(60, 1.0), rolling, 2000);
        assert_eq!(s.rolling_at_time(2000), Some(59.0));
        assert_eq!(s.rolling_at_time(1941), Some(0.0));
        assert_eq!(s.rolling_at_time(1940), None);
    }
}
