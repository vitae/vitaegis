/// Market sniper: every scan, price every open Kalshi Bitcoin price market, keep the YES picks that
/// hold up under different volatility, rank them by expected profit, publish the list to the HUD,
/// and paper-trade the best ones. It never places a real order.
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;

use crate::models::{ev_cents, prob_above, prob_yes, taker_fee, Edge, Side, StrikeType};
use crate::paper::{Trade, TradeBook};
use crate::supa::Supa;
use crate::vol::SharedVol;

/// Used until the first discovery pass, or if it fails. The 15-minute market belongs to the two
/// engines in main.rs.
const FALLBACK_SERIES: [&str; 4] = ["KXBTC", "KXBTCD", "BTCD", "BTC"];
const SERIES_REFRESH_SECS: i64 = 3600;
const REQUEST_GAP: Duration = Duration::from_millis(120);
/// Below this a strike is not a Bitcoin price, for example a dominance percentage.
const MIN_BTC_STRIKE: f64 = 1000.0;
const LIST_MIN_PRICE: f64 = 0.15;
const LIST_MAX_PRICE: f64 = 0.95;
const MAX_PWIN: f64 = 0.995;
/// A pick must clear its bars at each of these multiples of the volatility estimate.
const VOL_STRESS: [f64; 3] = [0.75, 1.0, 1.5];
/// 45% a year as a 15-minute sigma, the least used beyond a day: a quiet day says little about next month.
const LONG_VOL_FLOOR_15M: f64 = 0.0024;
const TREND_SECS: i64 = 900;
const PROJECTION_SECS: i64 = 60;

pub struct ScanConfig {
    pub min_edge_cents: f64,
    pub dollars: f64,
    pub max_open: usize,
    pub max_horizon_secs: i64,
    /// Listed picks closing within this long also get a paper trade.
    pub trade_horizon_secs: i64,
    pub min_secs_left: i64,
    /// Paper-trade the candidates (off: the scan still feeds the HUD's snipe list).
    pub trade: bool,
    /// Only candidates whose side has at least this win probability are listed or traded.
    pub min_pwin: f64,
}

impl ScanConfig {
    pub fn from_env() -> Self {
        let f = |k: &str, d: f64| std::env::var(k).ok().and_then(|v| v.parse().ok()).unwrap_or(d);
        Self {
            min_edge_cents: f("SNIPE_MIN_EDGE_CENTS", 3.0),
            dollars: f("SNIPE_DOLLARS", 5.0),
            max_open: f("SNIPE_MAX_OPEN", 5.0) as usize,
            max_horizon_secs: f("SNIPE_MAX_HORIZON_SECS", 34_560_000.0) as i64,
            trade_horizon_secs: f("SNIPE_TRADE_HORIZON_SECS", 86_400.0) as i64,
            min_secs_left: f("SNIPE_MIN_SECS_LEFT", 60.0) as i64,
            trade: std::env::var("SNIPE_TRADES").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false),
            min_pwin: f("SNIPE_MIN_PWIN", 0.75),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Candidate {
    pub ticker: String,
    pub title: String,
    pub subtitle: String,
    pub strike_type: String,
    pub floor: Option<f64>,
    pub cap: Option<f64>,
    pub close_ts: i64,
    pub secs_left: i64,
    pub yes_ask: Option<f64>,
    pub no_ask: Option<f64>,
    pub ask_size: f64,
    pub edge: Edge,
    /// Expected profit on the whole stake, in dollars, at the lowest win chance under stress.
    pub ev_dollars: f64,
    pub note: String,
}

fn dollars(v: &serde_json::Value, key: &str) -> Option<f64> {
    v[key].as_str().and_then(|s| s.parse::<f64>().ok()).filter(|x| *x > 0.0)
}

/// Bitcoin price series: everything Kalshi lists except Bitcoin Cash and the 15-minute market.
fn is_btc_series(ticker: &str, title: &str) -> bool {
    let text = format!("{} {}", ticker, title).to_lowercase();
    (text.contains("btc") || text.contains("bitcoin")) && !text.contains("bch") && !text.contains("bitcoin cash") && ticker != "KXBTC15M"
}

/// Markets that settle on the price at close say so in their rules. The rest resolve YES if the
/// level is touched before the date.
fn is_touch(rules: &str) -> bool {
    !rules.to_lowercase().contains("simple average")
}

/// P(YES) at this total volatility. A level touched by a date is about twice as likely as being
/// beyond it on that date, by the reflection principle for a driftless walk.
fn yes_prob(kind: StrikeType, touch: bool, spot: f64, floor: Option<f64>, cap: Option<f64>, sigma_tau: f64) -> Option<f64> {
    if !touch {
        return prob_yes(kind, spot, floor, cap, sigma_tau);
    }
    match kind {
        StrikeType::Greater | StrikeType::GreaterOrEqual => {
            let k = floor?;
            Some(if spot >= k { 1.0 } else { (2.0 * prob_above(spot, k, sigma_tau)).min(1.0) })
        }
        StrikeType::Less => {
            let k = cap?;
            Some(if spot <= k { 1.0 } else { (2.0 * (1.0 - prob_above(spot, k, sigma_tau))).min(1.0) })
        }
        StrikeType::Between => None,
    }
}

fn horizon_sigma(sigma_15m: f64, secs_left: i64) -> f64 {
    let base = if secs_left > 86_400 { sigma_15m.max(LONG_VOL_FLOOR_15M) } else { sigma_15m };
    base * (secs_left.max(1) as f64 / 900.0).sqrt()
}

/// The lowest P(YES) across the volatility multiples.
fn worst_yes_prob(kind: StrikeType, touch: bool, spot: f64, floor: Option<f64>, cap: Option<f64>, sigma_15m: f64, secs_left: i64) -> Option<f64> {
    let sigma_tau = horizon_sigma(sigma_15m, secs_left);
    let mut worst: Option<f64> = None;
    for mult in VOL_STRESS {
        let p = yes_prob(kind, touch, spot, floor, cap, sigma_tau * mult)?;
        worst = Some(worst.map_or(p, |w: f64| w.min(p)));
    }
    worst
}

/// The highest whole-cent price at which this win chance still clears the edge bar after the fee.
fn max_buy_price(p_win: f64, min_edge_cents: f64) -> Option<f64> {
    (1..=99).rev().map(|c| c as f64 / 100.0).find(|price| (p_win - price - taker_fee(*price)) * 100.0 >= min_edge_cents)
}

fn entry_note(price: f64, p_win: f64, max_buy: Option<f64>, projected: Option<f64>, trend: Option<f64>, touch: bool) -> String {
    let trend_text = match trend {
        Some(t) if t.abs() < 0.0002 => "BTC flat over the last 15 min".to_string(),
        Some(t) => format!("BTC trending {} {:.2}% over the last 15 min", if t > 0.0 { "up" } else { "down" }, t.abs() * 100.0),
        None => "BTC trend not available yet".to_string(),
    };
    let entry = match max_buy {
        Some(m) => format!("Buy YES up to {:.0}c any time before close, now {:.0}c", m * 100.0, price * 100.0),
        None => format!("No buy price clears the bar, now {:.0}c", price * 100.0),
    };
    let next = match (max_buy, projected) {
        (Some(m), Some(n)) if (n - m).abs() >= 0.005 => format!(" If that trend holds for {} s, the buy-up-to price moves to {:.0}c. That is a projection, not a forecast.", PROJECTION_SECS, n * 100.0),
        _ => String::new(),
    };
    let how = if touch { "Pays if BTC touches the level before close" } else { "Pays on the 60 s average at close" };
    format!("{}. {}.{} Win chance {:.0}% at 0.75x, 1x and 1.5x volatility. {}.", trend_text, entry, next, p_win * 100.0, how)
}

async fn open_markets(client: &reqwest::Client, rest_base: &str, series: &str) -> Vec<serde_json::Value> {
    let url = format!("{}/markets", rest_base);
    let mut out = Vec::new();
    let mut cursor = String::new();
    loop {
        let mut query = vec![("series_ticker", series), ("status", "open"), ("limit", "200")];
        if !cursor.is_empty() {
            query.push(("cursor", cursor.as_str()));
        }
        let page = match client.get(&url).query(&query).send().await {
            Ok(r) => r.json::<serde_json::Value>().await.ok(),
            Err(e) => {
                eprintln!("[!] Scanner: {} fetch failed: {}", series, e);
                None
            }
        };
        let Some(page) = page else { break };
        let Some(rows) = page["markets"].as_array() else { break };
        out.extend(rows.iter().cloned());
        let next = page["cursor"].as_str().unwrap_or("").to_string();
        if next.is_empty() || rows.is_empty() {
            break;
        }
        cursor = next;
        sleep(REQUEST_GAP).await;
    }
    out
}

fn is_price_market(m: &serde_json::Value) -> bool {
    let strike = m["floor_strike"].as_f64().or(m["cap_strike"].as_f64());
    m["strike_type"].as_str().and_then(StrikeType::parse).is_some() && strike.map_or(false, |k| k >= MIN_BTC_STRIKE)
}

/// The Bitcoin series with open price markets, found from Kalshi's list and refreshed hourly.
#[derive(Default)]
pub struct SeriesCache {
    tickers: Vec<String>,
    refreshed_ts: i64,
}

impl SeriesCache {
    async fn current(&mut self, client: &reqwest::Client, rest_base: &str) -> Vec<String> {
        let now = chrono::Utc::now().timestamp();
        if now - self.refreshed_ts >= SERIES_REFRESH_SECS {
            self.refreshed_ts = now;
            let found = discover_series(client, rest_base).await;
            if !found.is_empty() {
                println!("[SNIPER] watching {} Bitcoin price series: {}", found.len(), found.join(", "));
                self.tickers = found;
            }
        }
        if self.tickers.is_empty() {
            FALLBACK_SERIES.iter().map(|s| s.to_string()).collect()
        } else {
            self.tickers.clone()
        }
    }
}

async fn discover_series(client: &reqwest::Client, rest_base: &str) -> Vec<String> {
    let url = format!("{}/series", rest_base);
    let listing = match client.get(&url).query(&[("category", "Crypto")]).send().await {
        Ok(r) => r.json::<serde_json::Value>().await.ok(),
        Err(e) => {
            eprintln!("[!] Scanner: series list failed: {}", e);
            None
        }
    };
    let mut out = Vec::new();
    let rows = listing.as_ref().and_then(|v| v["series"].as_array()).cloned().unwrap_or_default();
    for row in rows {
        let ticker = row["ticker"].as_str().unwrap_or("");
        if !is_btc_series(ticker, row["title"].as_str().unwrap_or("")) {
            continue;
        }
        if open_markets(client, rest_base, ticker).await.iter().any(is_price_market) {
            out.push(ticker.to_string());
        }
        sleep(REQUEST_GAP).await;
    }
    out
}

/// Prices every open market in `series`. Returns how many YES prices it checked, and the picks.
pub async fn candidates(client: &reqwest::Client, rest_base: &str, vol: &SharedVol, spot: f64, cfg: &ScanConfig, series: &[String]) -> (usize, Vec<Candidate>) {
    let now = chrono::Utc::now().timestamp();
    let (sigma_15m, trend) = {
        let v = vol.lock().unwrap();
        (v.sigma_15m(), v.momentum(TREND_SECS))
    };
    let Some(sigma_15m) = sigma_15m else { return (0, Vec::new()) };
    let projected_spot = trend.map(|t| spot * (t * PROJECTION_SECS as f64 / TREND_SECS as f64).exp());
    let mut priced = 0;
    let mut out = Vec::new();
    for s in series {
        for m in open_markets(client, rest_base, s).await {
            if !is_price_market(&m) {
                continue;
            }
            let Some(kind) = m["strike_type"].as_str().and_then(StrikeType::parse) else { continue };
            let Some(close_ts) = m["close_time"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp()) else { continue };
            let secs_left = close_ts - now;
            if secs_left < cfg.min_secs_left || secs_left > cfg.max_horizon_secs {
                continue;
            }
            let Some(price) = dollars(&m, "yes_ask_dollars").filter(|p| (LIST_MIN_PRICE..=LIST_MAX_PRICE).contains(p)) else { continue };
            let floor = m["floor_strike"].as_f64();
            let cap = m["cap_strike"].as_f64();
            let touch = is_touch(m["rules_primary"].as_str().unwrap_or(""));
            let Some(p) = worst_yes_prob(kind, touch, spot, floor, cap, sigma_15m, secs_left) else { continue };
            priced += 1;
            if p > MAX_PWIN || p < cfg.min_pwin {
                continue;
            }
            let cents = ev_cents(p, Side::Yes, price);
            if cents < cfg.min_edge_cents {
                continue;
            }
            let max_buy = max_buy_price(p, cfg.min_edge_cents);
            let projected = projected_spot
                .and_then(|sp| worst_yes_prob(kind, touch, sp, floor, cap, sigma_15m, secs_left - PROJECTION_SECS))
                .and_then(|p2| max_buy_price(p2.min(MAX_PWIN), cfg.min_edge_cents));
            let no_ask = dollars(&m, "no_ask_dollars").filter(|p| *p < 1.0);
            out.push(Candidate {
                ticker: m["ticker"].as_str().unwrap_or("").to_string(),
                title: m["title"].as_str().unwrap_or("").to_string(),
                subtitle: m["yes_sub_title"].as_str().or(m["subtitle"].as_str()).unwrap_or("").to_string(),
                strike_type: m["strike_type"].as_str().unwrap_or("").to_string(),
                floor,
                cap,
                close_ts,
                secs_left,
                yes_ask: Some(price),
                no_ask,
                ask_size: dollars(&m, "yes_ask_size_fp").unwrap_or(0.0),
                edge: Edge { side: Side::Yes, price, cents, p_yes: p },
                ev_dollars: (cfg.dollars / price).floor() * cents / 100.0,
                note: entry_note(price, p, max_buy, projected, trend, touch),
            });
        }
        sleep(REQUEST_GAP).await;
    }
    out.sort_by(|a, b| b.ev_dollars.partial_cmp(&a.ev_dollars).unwrap_or(std::cmp::Ordering::Equal));
    (priced, out)
}

fn watch_row(c: &Candidate, spot: f64, mode: &str, live: bool) -> serde_json::Value {
    json!({
        "kind": "watch",
        "source": "sniper",
        "mode": mode,
        "live": live,
        "ticker": c.ticker,
        "title": c.title,
        "subtitle": c.subtitle,
        "close_time": chrono::DateTime::from_timestamp(c.close_ts, 0).map(|d| d.to_rfc3339()),
        "seconds_to_close": c.secs_left,
        "spot": spot,
        "strike": c.floor,
        "cap_strike": c.cap,
        "strike_type": c.strike_type,
        "yes_ask_cents": c.yes_ask.map(|p| (p * 100.0).round() as i64),
        "no_ask_cents": c.no_ask.map(|p| (p * 100.0).round() as i64),
        "model_prob": c.edge.p_yes,
        "side": c.edge.side.as_str(),
        "price_cents": (c.edge.price * 100.0).round() as i64,
        "edge_cents": c.edge.cents,
        "message": c.note,
    })
}

/// One full pass: publish the top candidates and paper-trade those over the edge bar.
pub async fn scan(
    client: &reqwest::Client,
    rest_base: &str,
    vol: &SharedVol,
    spot: f64,
    supa: Option<&Supa>,
    book: &Arc<Mutex<TradeBook>>,
    cfg: &ScanConfig,
    series: &mut SeriesCache,
    mode: &str,
    live: bool,
) {
    if spot <= 0.0 {
        return;
    }
    let tickers = series.current(client, rest_base).await;
    let (priced, list) = candidates(client, rest_base, vol, spot, cfg, &tickers).await;
    if list.is_empty() {
        println!("[SNIPER] {} YES prices checked in {} series; none with P(win) >= {:.0}% and edge >= {:.0}c under every volatility case", priced, tickers.len(), cfg.min_pwin * 100.0, cfg.min_edge_cents);
        return;
    }
    let top: Vec<&Candidate> = list.iter().take(15).collect();
    println!("[SNIPER] {} YES prices checked in {} series; {} picks:", priced, tickers.len(), list.len());
    for c in top.iter().take(5) {
        println!(
            "         ${:+.2} on ${:.0}  {} {} | YES @ {}c | win {:.0}% | edge {:+.1}c | {}m left",
            c.ev_dollars, cfg.dollars, c.ticker, c.subtitle, (c.edge.price * 100.0).round(), c.edge.p_yes * 100.0, c.edge.cents, c.secs_left / 60
        );
    }
    if let Some(s) = supa {
        for c in &top {
            s.event(watch_row(c, spot, mode, live));
        }
    }

    if !cfg.trade {
        return;
    }
    let mut book = book.lock().await;
    for c in list.iter().filter(|c| c.secs_left <= cfg.trade_horizon_secs) {
        if !book.can_record("sniper") || book.open_count("sniper") >= cfg.max_open {
            break;
        }
        if book.has_open(&c.ticker) {
            continue;
        }
        let count = (cfg.dollars / c.edge.price).floor() as u32;
        if count == 0 || c.ask_size < count as f64 {
            continue;
        }
        let cost = count as f64 * c.edge.price;
        let fee = crate::models::taker_fee(c.edge.price) * count as f64;
        let now = chrono::Utc::now().timestamp();
        println!(
            "[SNIPER PAPER] {} {} | buy {} x{} @ {}c (${:.2}) | model {:.0}% | edge {:+.1}c",
            c.ticker, c.subtitle, c.edge.side.as_str().to_uppercase(), count, (c.edge.price * 100.0).round(),
            cost, c.edge.p_yes * 100.0, c.edge.cents
        );
        book.record(
            Trade {
                mode: format!("PAPER-{}", mode),
                source: "sniper".into(),
                ticker: c.ticker.clone(),
                title: format!("{} {}", c.title, c.subtitle).trim().to_string(),
                side: c.edge.side.as_str().into(),
                price: c.edge.price,
                count,
                cost,
                fee,
                model_prob: c.edge.p_yes,
                gbm_prob: c.edge.p_yes,
                momentum: 0.0,
                edge_cents: c.edge.cents,
                spot,
                strike: c.floor.or(c.cap).unwrap_or(0.0),
                placed_ts: now,
                close_ts: c.close_ts,
                client_order_id: format!("sniper-{}-{}", c.ticker, now),
                order_id: None,
                result: None,
                pnl: None,
                note: String::new(),
            },
            supa,
            &format!("sniper | {} | {}m left | GBM on {} with horizon vol", c.strike_type, c.secs_left / 60, c.subtitle),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scans_bitcoin_price_series_but_not_bitcoin_cash_or_the_15_minute_market() {
        assert!(is_btc_series("KXBTCD", "Bitcoin price Above/below"));
        assert!(is_btc_series("KXBTCMAXMON", "Bitcoin monthly one touch"));
        assert!(!is_btc_series("KXBTC15M", "BTC 15 min"));
        assert!(!is_btc_series("KXBCH15M", "Bitcoin Cash 15 Minute"));
        assert!(!is_btc_series("KXETHD", "Ethereum price"));
    }

    #[test]
    fn rejects_strikes_that_are_not_bitcoin_prices() {
        assert!(is_price_market(&json!({"strike_type": "greater", "floor_strike": 80000.0})));
        assert!(!is_price_market(&json!({"strike_type": "greater", "floor_strike": 60.0})));
        assert!(!is_price_market(&json!({"floor_strike": 80000.0})));
    }

    #[test]
    fn tells_touch_markets_from_markets_settled_at_close() {
        assert!(!is_touch("If the simple average of the sixty seconds of BRTI is above..."));
        assert!(is_touch("If the price of BTC through Nov 30 is ever above $97500"));
    }

    #[test]
    fn touching_a_level_is_about_twice_as_likely_as_ending_beyond_it() {
        let end = yes_prob(StrikeType::Greater, false, 78_000.0, Some(90_000.0), None, 0.2).unwrap();
        let touch = yes_prob(StrikeType::Greater, true, 78_000.0, Some(90_000.0), None, 0.2).unwrap();
        assert!((touch - 2.0 * end).abs() < 1e-9);
        let below = yes_prob(StrikeType::Less, true, 78_000.0, None, Some(60_000.0), 0.2).unwrap();
        assert!(below > yes_prob(StrikeType::Less, false, 78_000.0, None, Some(60_000.0), 0.2).unwrap());
        assert_eq!(yes_prob(StrikeType::Between, true, 78_000.0, Some(70_000.0), Some(80_000.0), 0.2), None);
    }

    #[test]
    fn long_horizons_use_a_volatility_floor() {
        let quiet = 0.001;
        assert!((horizon_sigma(quiet, 900) - quiet).abs() < 1e-12);
        let week = 7 * 86_400;
        assert!((horizon_sigma(quiet, week) - LONG_VOL_FLOOR_15M * (week as f64 / 900.0).sqrt()).abs() < 1e-12);
    }

    #[test]
    fn a_pick_is_judged_at_its_worst_volatility_case() {
        let worst = worst_yes_prob(StrikeType::Greater, false, 78_000.0, Some(77_000.0), None, 0.002, 3_600).unwrap();
        let normal = yes_prob(StrikeType::Greater, false, 78_000.0, Some(77_000.0), None, horizon_sigma(0.002, 3_600)).unwrap();
        assert!(worst < normal);
    }

    #[test]
    fn max_buy_price_keeps_the_edge_after_the_fee() {
        assert_eq!(max_buy_price(0.80, 3.0), Some(0.75));
        assert_eq!(max_buy_price(0.01, 3.0), None);
    }

    #[test]
    fn the_note_gives_trend_entry_and_a_labeled_projection() {
        let note = entry_note(0.68, 0.78, Some(0.73), Some(0.70), Some(-0.0014), false);
        assert!(note.contains("BTC trending down 0.14%"), "{note}");
        assert!(note.contains("Buy YES up to 73c"), "{note}");
        assert!(note.contains("now 68c"), "{note}");
        assert!(note.contains("moves to 70c"), "{note}");
        assert!(note.contains("projection, not a forecast"), "{note}");
    }
}
