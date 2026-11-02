//! Replay settled KXBTC15M windows with Kalshi's own minute prices and Coinbase spot, run
//! the live engine's rules over them, and report P&L after fees. Run:
//!
//!   cargo run --release --bin backtest
//!
//! Reads the same .env as the bot (MIN_EDGE_CENTS, MIN_SECS_LEFT, MAX_SECS_LEFT,
//! MAX_ORDER_DOLLARS, MOMENTUM_WEIGHT, BACKTEST_WINDOWS) and, when Supabase is configured,
//! replaces the previous backtest on the HUD.
use std::collections::BTreeMap;
use std::env;
use std::time::Duration;

use serde::Serialize;
use serde_json::{json, Value};

use kalshi_btc_bot::models::{best_edge, clamp_binding, clamp_prob, prob_above, taker_fee, tradable_price, Side};
use kalshi_btc_bot::supa::Supa;

const REST: &str = "https://api.elections.kalshi.com/trade-api/v2";
const COINBASE: &str = "https://api.exchange.coinbase.com/products/BTC-USD/candles";
const SETTLEMENT_LEAD_SECS: f64 = 30.0;
const MOMENTUM_LOOKBACK_SECS: i64 = 120;

#[derive(Debug, Clone)]
struct Window {
    ticker: String,
    strike: f64,
    open_ts: i64,
    close_ts: i64,
    result: String,
    /// end_period_ts -> (yes_ask, yes_bid) in dollars
    book: BTreeMap<i64, (Option<f64>, Option<f64>)>,
    sigma_15m: Option<f64>,
}

#[derive(Debug, Clone, Copy)]
struct Rules {
    min_edge_cents: f64,
    min_secs_left: f64,
    max_secs_left: f64,
    dollars: f64,
    momentum_weight: f64,
    model_weight: f64,
    trades_per_window: usize,
}

#[derive(Debug, Clone, Serialize)]
struct BtTrade {
    ticker: String,
    close_ts: i64,
    entered_secs_left: i64,
    side: String,
    price: f64,
    count: u32,
    cost: f64,
    fee: f64,
    spot: f64,
    strike: f64,
    sigma: f64,
    momentum: f64,
    gbm_prob: f64,
    model_prob: f64,
    yes_bid: Option<f64>,
    yes_ask: Option<f64>,
    edge_cents: f64,
    result: String,
    won: bool,
    pnl: f64,
}

fn envf(k: &str, d: f64) -> f64 {
    env::var(k).ok().and_then(|v| v.parse().ok()).unwrap_or(d)
}

fn parse_ts(s: &str) -> Option<i64> {
    chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.timestamp())
}

fn dollars(v: &Value) -> Option<f64> {
    v.as_str().and_then(|s| s.parse::<f64>().ok()).filter(|x| *x > 0.0 && *x < 1.0)
}

fn stdev(xs: &[f64]) -> f64 {
    if xs.len() < 2 {
        return 0.0;
    }
    let n = xs.len() as f64;
    let mean = xs.iter().sum::<f64>() / n;
    (xs.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / (n - 1.0)).sqrt()
}

async fn settled_windows(client: &reqwest::Client, want: usize) -> Result<Vec<Window>, Box<dyn std::error::Error>> {
    let mut out = Vec::new();
    let mut cursor = String::new();
    while out.len() < want {
        let url = format!("{}/markets?series_ticker=KXBTC15M&status=settled&limit=200{}", REST, if cursor.is_empty() { String::new() } else { format!("&cursor={}", cursor) });
        let v: Value = client.get(&url).send().await?.json().await?;
        let markets = v["markets"].as_array().cloned().unwrap_or_default();
        if markets.is_empty() {
            break;
        }
        for m in &markets {
            let result = m["result"].as_str().unwrap_or("").to_string();
            if result != "yes" && result != "no" {
                continue;
            }
            let (Some(strike), Some(open_ts), Some(close_ts)) = (m["floor_strike"].as_f64(), m["open_time"].as_str().and_then(parse_ts), m["close_time"].as_str().and_then(parse_ts)) else { continue };
            out.push(Window { ticker: m["ticker"].as_str().unwrap_or("").to_string(), strike, open_ts, close_ts, result, book: BTreeMap::new(), sigma_15m: None });
            if out.len() >= want {
                break;
            }
        }
        cursor = v["cursor"].as_str().unwrap_or("").to_string();
        if cursor.is_empty() {
            break;
        }
    }
    Ok(out)
}

/// Coinbase candles as start_ts -> close, fetched in 300-candle chunks.
async fn coinbase_closes(client: &reqwest::Client, granularity: i64, from: i64, to: i64) -> Result<BTreeMap<i64, f64>, Box<dyn std::error::Error>> {
    let mut out = BTreeMap::new();
    let chunk = granularity * 300;
    let mut start = from;
    while start < to {
        let end = (start + chunk).min(to);
        let iso = |t: i64| chrono::DateTime::from_timestamp(t, 0).map(|d| d.to_rfc3339()).unwrap_or_default();
        let url = format!("{}?granularity={}&start={}&end={}", COINBASE, granularity, iso(start), iso(end));
        let v: Value = client.get(&url).header("User-Agent", "kalshirust-backtest/0.1").send().await?.json().await?;
        if let Some(rows) = v.as_array() {
            for r in rows {
                if let (Some(t), Some(c)) = (r.get(0).and_then(|x| x.as_i64()), r.get(4).and_then(|x| x.as_f64())) {
                    out.insert(t, c);
                }
            }
        } else {
            eprintln!("[!] Coinbase {}s candles {}..{}: {}", granularity, start, end, v);
        }
        start = end;
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    Ok(out)
}

async fn kalshi_book(client: &reqwest::Client, w: &Window) -> BTreeMap<i64, (Option<f64>, Option<f64>)> {
    let url = format!("{}/series/KXBTC15M/markets/{}/candlesticks?start_ts={}&end_ts={}&period_interval=1", REST, w.ticker, w.open_ts - 60, w.close_ts + 60);
    let mut out = BTreeMap::new();
    let Ok(resp) = client.get(&url).send().await else { return out };
    let Ok(v) = resp.json::<Value>().await else { return out };
    for c in v["candlesticks"].as_array().cloned().unwrap_or_default() {
        if let Some(t) = c["end_period_ts"].as_i64() {
            out.insert(t, (dollars(&c["yes_ask"]["close_dollars"]), dollars(&c["yes_bid"]["close_dollars"])));
        }
    }
    out
}

/// One model reading at one minute of one window.
struct Reading {
    secs_left: f64,
    spot: f64,
    sigma: f64,
    momentum: f64,
    p_gbm: f64,
    /// Raw model with momentum, before clamp.
    p_raw: f64,
    yes_ask: Option<f64>,
    yes_bid: Option<f64>,
}

fn readings(w: &Window, spot: &BTreeMap<i64, f64>, momentum_weight: f64) -> Vec<Reading> {
    let mut out = Vec::new();
    let Some(sigma_15m) = w.sigma_15m else { return out };
    let mut t = w.open_ts + 60;
    while t < w.close_ts {
        if let (Some(&s), Some(&(ask, bid))) = (spot.get(&(t - 60)), w.book.get(&t)) {
            let rem = (w.close_ts - t) as f64;
            let mom = spot.get(&(t - 60 - MOMENTUM_LOOKBACK_SECS)).map(|p| (s / p).ln()).unwrap_or(0.0);
            let sigma = sigma_15m * ((rem - SETTLEMENT_LEAD_SECS).max(5.0) / 900.0).sqrt();
            out.push(Reading {
                secs_left: rem,
                spot: s,
                sigma,
                momentum: mom,
                p_gbm: prob_above(s, w.strike, sigma),
                p_raw: prob_above(s * (momentum_weight * mom).exp(), w.strike, sigma),
                yes_ask: ask,
                yes_bid: bid,
            });
        }
        t += 60;
    }
    out
}

fn market_mid(ask: Option<f64>, bid: Option<f64>) -> Option<f64> {
    match (ask, bid) {
        (Some(a), Some(b)) => Some((a + b) / 2.0),
        (a, b) => a.or(b),
    }
}

/// The probability the engine acts on: the market's own price pulled toward the model by
/// `model_weight` (1 = trust the model fully, 0 = never disagree with the market).
fn blended(p_model: f64, mid: Option<f64>, model_weight: f64) -> f64 {
    match mid {
        Some(m) => m + model_weight * (p_model - m),
        None => p_model,
    }
}

fn evaluate(windows: &[Window], spot: &BTreeMap<i64, f64>, rules: Rules) -> Vec<BtTrade> {
    let mut trades = Vec::new();
    for w in windows {
        let mut taken = 0usize;
        let mut last_entry_secs = f64::INFINITY;
        for r in readings(w, spot, rules.momentum_weight) {
            if taken >= rules.trades_per_window {
                break;
            }
            if r.secs_left < rules.min_secs_left || r.secs_left > rules.max_secs_left || last_entry_secs - r.secs_left < 60.0 {
                continue;
            }
            if clamp_binding(r.p_raw) {
                continue;
            }
            let p = clamp_prob(blended(clamp_prob(r.p_raw), market_mid(r.yes_ask, r.yes_bid), rules.model_weight));
            let no_ask = r.yes_bid.map(|b| 1.0 - b);
            let Some(e) = best_edge(p, r.yes_ask, no_ask).filter(|e| tradable_price(e.price) && e.cents >= rules.min_edge_cents) else { continue };
            let count = (rules.dollars / e.price).floor() as u32;
            if count == 0 {
                continue;
            }
            let cost = count as f64 * e.price;
            let fee = taker_fee(e.price) * count as f64;
            let side = e.side.as_str().to_string();
            let won = w.result == side;
            let pnl = if won { (1.0 - e.price) * count as f64 - fee } else { -cost - fee };
            trades.push(BtTrade {
                ticker: w.ticker.clone(), close_ts: w.close_ts, entered_secs_left: r.secs_left as i64, side, price: e.price, count, cost, fee,
                spot: r.spot, strike: w.strike, sigma: r.sigma, momentum: r.momentum, gbm_prob: clamp_prob(r.p_gbm), model_prob: p,
                yes_bid: r.yes_bid, yes_ask: r.yes_ask, edge_cents: e.cents, result: w.result.clone(), won, pnl,
            });
            taken += 1;
            last_entry_secs = r.secs_left;
        }
    }
    trades.sort_by_key(|t| t.close_ts);
    trades
}

fn brier(samples: &[(f64, bool)]) -> f64 {
    if samples.is_empty() {
        return f64::NAN;
    }
    samples.iter().map(|(p, y)| (p - if *y { 1.0 } else { 0.0 }).powi(2)).sum::<f64>() / samples.len() as f64
}

/// How well the model, the market, and blends of the two predict the outcome, over every
/// minute inside the entry window. Lower Brier is better; 0.25 is a coin flip.
fn calibration_report(windows: &[Window], spot: &BTreeMap<i64, f64>, rules: Rules) {
    let mut rows: Vec<(f64, f64, bool)> = Vec::new(); // (model, market mid, outcome yes)
    for w in windows {
        for r in readings(w, spot, rules.momentum_weight) {
            if r.secs_left < rules.min_secs_left || r.secs_left > rules.max_secs_left || clamp_binding(r.p_raw) {
                continue;
            }
            if let Some(m) = market_mid(r.yes_ask, r.yes_bid) {
                rows.push((clamp_prob(r.p_raw), m, w.result == "yes"));
            }
        }
    }
    println!();
    println!("==================== CALIBRATION ({} readings inside the entry window) ====================", rows.len());
    println!("{:<14} {:>8}   {}", "forecast", "Brier", "(0.25 = coin flip; lower is better)");
    println!("{:<14} {:>8.4}", "market mid", brier(&rows.iter().map(|(_, m, y)| (*m, *y)).collect::<Vec<_>>()));
    for wgt in [1.0, 0.75, 0.5, 0.25] {
        let b = brier(&rows.iter().map(|(p, m, y)| (m + wgt * (p - m), *y)).collect::<Vec<_>>());
        println!("{:<14} {:>8.4}", format!("model x{:.2}", wgt), b);
    }
    println!("model probability bucket -> how often YES actually happened (n):");
    for lo in (10..90).step_by(10) {
        let b: Vec<&(f64, f64, bool)> = rows.iter().filter(|(p, _, _)| *p >= lo as f64 / 100.0 && *p < (lo + 10) as f64 / 100.0).collect();
        if b.is_empty() {
            continue;
        }
        let yes = b.iter().filter(|(_, _, y)| *y).count();
        let mkt = b.iter().map(|(_, m, _)| m).sum::<f64>() / b.len() as f64;
        println!("  model {:>2}-{:<3}%  realized {:>5.1}%  market said {:>5.1}%  (n={})", lo, lo + 10, yes as f64 / b.len() as f64 * 100.0, mkt * 100.0, b.len());
    }
    println!("where the model disagrees with the market by more than 15 points:");
    for (label, filt) in [("model higher", 1.0), ("model lower", -1.0)] {
        let b: Vec<&(f64, f64, bool)> = rows.iter().filter(|(p, m, _)| (p - m) * filt > 0.15).collect();
        if b.is_empty() {
            continue;
        }
        let yes = b.iter().filter(|(_, _, y)| *y).count() as f64 / b.len() as f64;
        let pm = b.iter().map(|(p, _, _)| p).sum::<f64>() / b.len() as f64;
        let mm = b.iter().map(|(_, m, _)| m).sum::<f64>() / b.len() as f64;
        println!("  {:<13} model avg {:>5.1}%  market avg {:>5.1}%  realized YES {:>5.1}%  (n={})", label, pm * 100.0, mm * 100.0, yes * 100.0, b.len());
    }
}

fn summary(trades: &[BtTrade]) -> (usize, usize, f64, f64) {
    let wins = trades.iter().filter(|t| t.won).count();
    let risked: f64 = trades.iter().map(|t| t.cost + t.fee).sum();
    let pnl: f64 = trades.iter().map(|t| t.pnl).sum();
    (trades.len(), wins, risked, pnl)
}

fn side_of(s: &str) -> Side {
    if s == "yes" { Side::Yes } else { Side::No }
}

fn rows_for(t: &BtTrade) -> (Value, Value) {
    let close_time = chrono::DateTime::from_timestamp(t.close_ts, 0).map(|d| d.to_rfc3339());
    let base = json!({
        "source": "backtest", "mode": "BACKTEST", "live": false,
        "ticker": t.ticker, "title": "BTC 15 min", "close_time": close_time,
        "seconds_to_close": t.entered_secs_left, "spot": t.spot, "strike": t.strike, "vol_window": t.sigma,
        "yes_bid_cents": t.yes_bid.map(|b| (b * 100.0).round() as i64),
        "yes_ask_cents": t.yes_ask.map(|a| (a * 100.0).round() as i64),
        "no_ask_cents": t.yes_bid.map(|b| ((1.0 - b) * 100.0).round() as i64),
        "model_prob": t.model_prob, "edge_cents": t.edge_cents,
        "side": t.side, "price_cents": (t.price * 100.0).round() as i64, "count": t.count,
        "cost_cents": (t.cost * 100.0).round() as i64, "fee_cents": (t.fee * 100.0).round() as i64,
        "client_order_id": format!("backtest-{}", t.ticker),
        "message": format!("entered {}s before close | gbm {:.1}% | momentum {:+.3}% | {} won {:.1}% by model", t.entered_secs_left, t.gbm_prob * 100.0, t.momentum * 100.0, t.side.to_uppercase(), match side_of(&t.side) { Side::Yes => t.model_prob, Side::No => 1.0 - t.model_prob } * 100.0),
    });
    let mut signal = base.clone();
    signal["kind"] = json!("signal");
    let mut settle = base;
    settle["kind"] = json!("settle");
    settle["result"] = json!(t.result);
    settle["pnl_cents"] = json!((t.pnl * 100.0).round() as i64);
    (signal, settle)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.local").ok();
    let client = reqwest::Client::builder().timeout(Duration::from_secs(30)).build()?;
    let want = envf("BACKTEST_WINDOWS", 400.0) as usize;
    let rules = Rules {
        min_edge_cents: envf("MIN_EDGE_CENTS", 2.0),
        min_secs_left: envf("MIN_SECS_LEFT", 90.0),
        max_secs_left: envf("MAX_SECS_LEFT", 300.0),
        dollars: envf("MAX_ORDER_DOLLARS", 5.0),
        momentum_weight: envf("MOMENTUM_WEIGHT", 0.3),
        model_weight: envf("MODEL_WEIGHT", 1.0),
        trades_per_window: envf("TRADES_PER_WINDOW", 2.0) as usize,
    };
    println!("[+] Backtest: last {} settled KXBTC15M windows | rules: edge >= {:.1}c, enter {}-{}s before close, ${:.0}/trade, up to {} per window, momentum {:.2}, model weight {:.2}",
        want, rules.min_edge_cents, rules.min_secs_left as i64, rules.max_secs_left as i64, rules.dollars, rules.trades_per_window, rules.momentum_weight, rules.model_weight);

    let mut windows = settled_windows(&client, want).await?;
    if windows.is_empty() {
        return Err("no settled windows returned".into());
    }
    let earliest = windows.iter().map(|w| w.open_ts).min().unwrap();
    let latest = windows.iter().map(|w| w.close_ts).max().unwrap();
    println!("[+] {} windows from {} to {}", windows.len(),
        chrono::DateTime::from_timestamp(earliest, 0).unwrap().format("%b %d %H:%M"), chrono::DateTime::from_timestamp(latest, 0).unwrap().format("%b %d %H:%M UTC"));

    println!("[+] Fetching Coinbase 15m candles for volatility...");
    let c15 = coinbase_closes(&client, 900, earliest - 26 * 3600, latest).await?;
    println!("[+] Fetching Coinbase 1m candles for spot ({} windows)...", windows.len());
    let c1 = coinbase_closes(&client, 60, earliest - 300, latest + 60).await?;
    println!("[+] {} 15m candles, {} 1m candles", c15.len(), c1.len());

    for w in windows.iter_mut() {
        let closes: Vec<f64> = c15.range((w.open_ts - 24 * 3600)..w.open_ts).map(|(_, c)| *c).collect();
        if closes.len() >= 20 {
            let rets: Vec<f64> = closes.windows(2).map(|p| (p[1] / p[0]).ln()).collect();
            w.sigma_15m = Some(stdev(&rets));
        }
    }

    println!("[+] Fetching Kalshi minute prices for each window...");
    let total = windows.len();
    for (i, w) in windows.iter_mut().enumerate() {
        let book = kalshi_book(&client, w).await;
        w.book = book;
        if (i + 1) % 50 == 0 {
            println!("    {}/{}", i + 1, total);
        }
        tokio::time::sleep(Duration::from_millis(120)).await;
    }
    let usable = windows.iter().filter(|w| w.sigma_15m.is_some() && !w.book.is_empty()).count();
    println!("[+] {} windows usable (have vol and prices)", usable);

    let trades = evaluate(&windows, &c1, rules);
    println!();
    println!("==================== BACKTEST TRADES ====================");
    let mut cum = 0.0;
    for (i, t) in trades.iter().enumerate() {
        cum += t.pnl;
        println!(
            "{:>3}. {} | {}s left | {} @ {}c x{} | spot {:.0} vs {:.0} | model {:.0}% (gbm {:.0}%) edge {:+.1}c | {} {} | {:+.2} | cum {:+.2}",
            i + 1, t.ticker, t.entered_secs_left, t.side.to_uppercase(), (t.price * 100.0).round(), t.count, t.spot, t.strike,
            t.model_prob * 100.0, t.gbm_prob * 100.0, t.edge_cents, t.result.to_uppercase(), if t.won { "WIN " } else { "LOSS" }, t.pnl, cum
        );
    }
    let (n, wins, risked, pnl) = summary(&trades);
    println!("---------------------------------------------------------");
    println!(
        "Windows {} | trades {} | wins {} | losses {} | hit {:.1}% | risked ${:.2} | net ${:+.2} | ROI {:+.1}% | avg ${:+.3}/trade | avg predicted edge {:+.2}c",
        usable, n, wins, n - wins, if n > 0 { wins as f64 / n as f64 * 100.0 } else { 0.0 }, risked, pnl,
        if risked > 0.0 { pnl / risked * 100.0 } else { 0.0 }, if n > 0 { pnl / n as f64 } else { 0.0 },
        if n > 0 { trades.iter().map(|t| t.edge_cents).sum::<f64>() / n as f64 } else { 0.0 }
    );
    for (lo, hi) in [(0.15, 0.30), (0.30, 0.50), (0.50, 0.70), (0.70, 0.86)] {
        let b: Vec<&BtTrade> = trades.iter().filter(|t| t.price >= lo && t.price < hi).collect();
        if !b.is_empty() {
            let w = b.iter().filter(|t| t.won).count();
            println!("  price {:.0}-{:.0}c: {} trades, {} wins ({:.0}%), net ${:+.2}", lo * 100.0, hi * 100.0, b.len(), w, w as f64 / b.len() as f64 * 100.0, b.iter().map(|t| t.pnl).sum::<f64>());
        }
    }

    calibration_report(&windows, &c1, rules);

    println!();
    println!("==================== SENSITIVITY (same data, in-sample: treat as a map, not a result) ====================");
    println!("{:<9} {:<12} {:<9} {:<7} {:>7} {:>6} {:>9} {:>8}", "min edge", "entry window", "momentum", "model", "trades", "hit%", "net $", "ROI%");
    for &mdl in &[1.0, 0.5, 0.25] {
        for &me in &[1.0, 2.0, 3.0] {
            for &(lo, hi) in &[(60.0, 180.0), (90.0, 300.0), (120.0, 420.0)] {
                for &mw in &[0.0, 0.3] {
                    let r = Rules { min_edge_cents: me, min_secs_left: lo, max_secs_left: hi, momentum_weight: mw, model_weight: mdl, ..rules };
                    let tr = evaluate(&windows, &c1, r);
                    let (n, w, risked, p) = summary(&tr);
                    println!("{:<9} {:<12} {:<9} {:<7} {:>7} {:>6.0} {:>+9.2} {:>+8.1}", format!("{:.0}c", me), format!("{}-{}s", lo as i64, hi as i64), format!("{:.1}", mw), format!("x{:.2}", mdl), n,
                        if n > 0 { w as f64 / n as f64 * 100.0 } else { 0.0 }, p, if risked > 0.0 { p / risked * 100.0 } else { 0.0 });
                }
            }
        }
    }

    // Walk-forward: choose the model weight on the older half by Brier, score the newer half.
    let mut by_time: Vec<&Window> = windows.iter().collect();
    by_time.sort_by_key(|w| w.close_ts);
    let half = by_time.len() / 2;
    let (older, newer): (Vec<Window>, Vec<Window>) = (by_time[..half].iter().map(|w| (*w).clone()).collect(), by_time[half..].iter().map(|w| (*w).clone()).collect());
    let mut best = (1.0, f64::INFINITY);
    for wgt in [1.0, 0.75, 0.5, 0.35, 0.25, 0.15] {
        let mut rows = Vec::new();
        for w in &older {
            for r in readings(w, &c1, rules.momentum_weight) {
                if r.secs_left < rules.min_secs_left || r.secs_left > rules.max_secs_left || clamp_binding(r.p_raw) {
                    continue;
                }
                if let Some(m) = market_mid(r.yes_ask, r.yes_bid) {
                    rows.push((m + wgt * (clamp_prob(r.p_raw) - m), w.result == "yes"));
                }
            }
        }
        let b = brier(&rows);
        if b < best.1 {
            best = (wgt, b);
        }
    }
    println!();
    println!("==================== WALK-FORWARD ====================");
    println!("Model weight chosen on the older {} windows by Brier: x{:.2} (Brier {:.4})", older.len(), best.0, best.1);
    let r = Rules { model_weight: best.0, ..rules };
    let tr = evaluate(&newer, &c1, r);
    let (n, w, risked, p) = summary(&tr);
    println!("Applied to the newer {} windows: {} trades | hit {:.0}% | risked ${:.2} | net ${:+.2} | ROI {:+.1}%",
        newer.len(), n, if n > 0 { w as f64 / n as f64 * 100.0 } else { 0.0 }, risked, p, if risked > 0.0 { p / risked * 100.0 } else { 0.0 });
    let tr1 = evaluate(&newer, &c1, Rules { model_weight: 1.0, ..rules });
    let (n1, w1, risked1, p1) = summary(&tr1);
    println!("Same windows with the pure model (x1.00): {} trades | hit {:.0}% | risked ${:.2} | net ${:+.2} | ROI {:+.1}%",
        n1, if n1 > 0 { w1 as f64 / n1 as f64 * 100.0 } else { 0.0 }, risked1, p1, if risked1 > 0.0 { p1 / risked1 * 100.0 } else { 0.0 });

    let body: String = trades.iter().filter_map(|t| serde_json::to_string(t).ok()).map(|l| l + "\n").collect();
    std::fs::write("backtest.jsonl", body)?;
    println!("[+] Wrote backtest.jsonl ({} trades)", trades.len());

    if let Some(s) = Supa::from_env(&client) {
        match s.delete_source("backtest").await {
            Ok(()) => println!("[+] Cleared previous backtest on the HUD"),
            Err(e) => eprintln!("[!] Could not clear previous backtest: {}", e),
        }
        // PostgREST bulk inserts need identical keys per batch, so signals and settles go apart.
        let (signals, settles): (Vec<Value>, Vec<Value>) = trades.iter().map(rows_for).unzip();
        for batch in [signals, settles] {
            for chunk in batch.chunks(100) {
                if let Err(e) = s.insert_many(chunk).await {
                    eprintln!("[!] HUD insert failed: {}", e);
                }
            }
        }
        println!("[+] Pushed {} trades to vitaegis.com/kalshirust", trades.len());
    }
    Ok(())
}
