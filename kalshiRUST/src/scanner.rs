/// Market sniper: every scan, price every open Kalshi BTC market with the GBM model,
/// rank by fee-adjusted edge, publish the list to the HUD, and paper-trade the best ones.
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::models::{best_edge, clamp_binding, prob_yes, tradable_price, Edge, StrikeType};
use crate::paper::{Trade, TradeBook};
use crate::supa::Supa;
use crate::vol::SharedVol;

/// Series swept each scan: 15-minute, hourly range, hourly above/below, daily above/below,
/// daily range.
const SERIES: [&str; 5] = ["KXBTC15M", "KXBTC", "KXBTCD", "BTCD", "BTC"];
pub struct ScanConfig {
    pub min_edge_cents: f64,
    pub dollars: f64,
    pub max_open: usize,
    pub max_horizon_secs: i64,
    pub min_secs_left: i64,
}

impl ScanConfig {
    pub fn from_env() -> Self {
        let f = |k: &str, d: f64| std::env::var(k).ok().and_then(|v| v.parse().ok()).unwrap_or(d);
        Self {
            min_edge_cents: f("SNIPE_MIN_EDGE_CENTS", 3.0),
            dollars: f("SNIPE_DOLLARS", 5.0),
            max_open: f("SNIPE_MAX_OPEN", 5.0) as usize,
            max_horizon_secs: f("SNIPE_MAX_HORIZON_SECS", 86_400.0) as i64,
            min_secs_left: f("SNIPE_MIN_SECS_LEFT", 60.0) as i64,
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
}

fn dollars(v: &serde_json::Value, key: &str) -> Option<f64> {
    v[key].as_str().and_then(|s| s.parse::<f64>().ok()).filter(|x| *x > 0.0)
}

async fn open_markets(client: &reqwest::Client, rest_base: &str, series: &str) -> Vec<serde_json::Value> {
    let url = format!("{}/markets?series_ticker={}&status=open&limit=200", rest_base, series);
    match client.get(&url).send().await {
        Ok(r) => r.json::<serde_json::Value>().await.ok().and_then(|v| v["markets"].as_array().cloned()).unwrap_or_default(),
        Err(e) => {
            eprintln!("[!] Scanner: {} fetch failed: {}", series, e);
            Vec::new()
        }
    }
}

pub async fn candidates(client: &reqwest::Client, rest_base: &str, vol: &SharedVol, spot: f64, cfg: &ScanConfig) -> Vec<Candidate> {
    let now = chrono::Utc::now().timestamp();
    let mut out = Vec::new();
    for series in SERIES {
        for m in open_markets(client, rest_base, series).await {
            let Some(kind) = m["strike_type"].as_str().and_then(StrikeType::parse) else { continue };
            let Some(close_ts) = m["close_time"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp()) else { continue };
            let secs_left = close_ts - now;
            if secs_left < cfg.min_secs_left || secs_left > cfg.max_horizon_secs {
                continue;
            }
            let floor = m["floor_strike"].as_f64();
            let cap = m["cap_strike"].as_f64();
            let yes_ask = dollars(&m, "yes_ask_dollars").filter(|p| *p < 1.0);
            let no_ask = dollars(&m, "no_ask_dollars").filter(|p| *p < 1.0);
            if yes_ask.is_none() && no_ask.is_none() {
                continue;
            }
            let Some(sigma) = vol.lock().unwrap().sigma_for(secs_left as f64) else { continue };
            let Some(p) = prob_yes(kind, spot, floor, cap, sigma) else { continue };
            // Markets the model calls near-certain are where its vol error shows up as a
            // fake edge on the cheap side, so they are dropped, not clamped.
            if clamp_binding(p) {
                continue;
            }
            let Some(edge) = best_edge(p, yes_ask, no_ask).filter(|e| tradable_price(e.price)) else { continue };
            let ask_size = match edge.side {
                crate::models::Side::Yes => dollars(&m, "yes_ask_size_fp").unwrap_or(0.0),
                crate::models::Side::No => dollars(&m, "no_ask_size_fp").unwrap_or(0.0),
            };
            out.push(Candidate {
                ticker: m["ticker"].as_str().unwrap_or("").to_string(),
                title: m["title"].as_str().unwrap_or("").to_string(),
                subtitle: m["yes_sub_title"].as_str().or(m["subtitle"].as_str()).unwrap_or("").to_string(),
                strike_type: m["strike_type"].as_str().unwrap_or("").to_string(),
                floor,
                cap,
                close_ts,
                secs_left,
                yes_ask,
                no_ask,
                ask_size,
                edge,
            });
        }
    }
    out.sort_by(|a, b| b.edge.cents.partial_cmp(&a.edge.cents).unwrap_or(std::cmp::Ordering::Equal));
    out
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
    mode: &str,
    live: bool,
) {
    if spot <= 0.0 {
        return;
    }
    let list = candidates(client, rest_base, vol, spot, cfg).await;
    if list.is_empty() {
        println!("[SNIPER] no priceable markets this pass");
        return;
    }
    let top: Vec<&Candidate> = list.iter().take(15).collect();
    println!("[SNIPER] {} markets priced; top edges:", list.len());
    for c in top.iter().take(5) {
        println!(
            "         {:+.1}c  {} {} | buy {} @ {}c | model {:.0}% | {}m left",
            c.edge.cents, c.ticker, c.subtitle, c.edge.side.as_str().to_uppercase(),
            (c.edge.price * 100.0).round(), c.edge.p_yes * 100.0, c.secs_left / 60
        );
    }
    if let Some(s) = supa {
        for c in &top {
            s.event(watch_row(c, spot, mode, live));
        }
    }

    let mut book = book.lock().await;
    for c in list.iter().filter(|c| c.edge.cents >= cfg.min_edge_cents) {
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
            },
            supa,
        );
    }
}
