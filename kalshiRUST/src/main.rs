use kalshi_btc_bot::{analytics, models, paper, scanner, settle, supa, vol};

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use std::{env, fs};
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::tungstenite::handshake::client::Request;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use base64::Engine as _;

use analytics::{ExecutionSignal, KalshiBookTop, KxBtc15mEngine};
use models::{best_edge, clamp_binding, clamp_prob, prob_above, taker_fee, tradable_price, v2_fill_cost, v2_order_terms, Side};
use paper::{Trade, TradeBook};
use kalshi_btc_bot::{reconcile, ufc};
use scanner::ScanConfig;
use std::collections::VecDeque;
use supa::Supa;
use vol::SharedVol;

/// KXBTC15M settles on the 60-second BRTI average before close; its midpoint is ~30 s out.
const SETTLEMENT_LEAD_SECS: f64 = 30.0;
/// Lookback for the late-window momentum term.
const MOMENTUM_LOOKBACK_SECS: i64 = 120;
/// The settlement engine takes over this many seconds before close.
const SETTLE_WINDOW_SECS: f64 = 90.0;
/// Too close to settlement to get an order through.
const SETTLE_MIN_SECS_LEFT: f64 = 4.0;
/// A window's second settlement trade waits this long after the first, so it is a new
/// opportunity rather than the same one at a worse price.
const SETTLE_REENTRY_SECS: i64 = 10;
/// A window's second trade must rest on this many published settlement prints: a
/// calculation, not a projection.
const SETTLE_SECOND_MIN_KNOWN: usize = 15;
/// Sharp-rise rules, the only trades NORMAL makes: each check buys the side whose mid rose over the prior
/// 60 s, if the rise and price fit a rule of (smallest rise, lowest price, highest price). On 2,958 windows:
/// 326 trades, 77% wins, $0.40 a trade after fees, about $3.96 a day, worst drop $36.24, positive in all
/// three parts of the month, t=2.46. Those rules were chosen on the same data, so expect less.
const SHARP_RULES: &[(f64, f64, f64)] = &[(0.10, 0.70, 0.82), (0.18, 0.50, 0.70)];
const SHARP_CHECKS_SECS_LEFT: &[f64] = &[120.0, 60.0];
const SHARP_LOOKBACK_SECS: i64 = 60;
/// A check this late, or a lookback this far short of 60 s, is skipped.
const SHARP_SLACK_SECS: i64 = 5;
/// Win rate above price used for expected profit, below the 7.4c measured.
const SHARP_EDGE: f64 = 0.05;
/// A live order's limit sits this far above the ask it was priced on. The signals are rises, so
/// the ask keeps moving while the order is in flight: 7 of 7 live orders at the exact ask got no
/// fill. The order still fills at the book's price, and paying 2c more keeps the rule positive.
const IOC_CUSHION: f64 = 0.02;
const RECONCILE_SECS: u64 = 120;
const RECONCILE_PUBLISH_SECS: i64 = 3600;
/// The last-90 slot never buys a side whose mid fell by this much over the lookback.
const FALLING_LOOKBACK_SECS: i64 = 30;
const FALLING_MOVE: f64 = 0.01;
/// Too little history to rule out a fall counts as falling.
const FALLING_MIN_HISTORY_SECS: i64 = 15;
/// NORMAL places no settlement or early trades, so these bands only mark its range.
const NORMAL_PRICE_BANDS: &[(f64, f64)] = &[(0.50, 0.82)];
const ALL_PRICES: &[(f64, f64)] = &[(0.0, 1.0)];
/// At or below this price a $5 stake wins at least $3 (5 * (1 - p) / p >= 3).
const BIG_WIN_MAX_PRICE: f64 = 0.625;

/// Entry rules for one mode. NORMAL is the measured-edge default; RISK is the turbo mode
/// the HUD's red button switches on.
#[derive(Debug, Clone)]
struct ModeParams {
    name: String,
    max_order_dollars: f64,
    min_edge_cents: f64,
    bets_per_window: usize,
    min_secs_left: f64,
    max_secs_left: f64,
    /// Settlement engine, first trade of the window: minimum win probability and minimum
    /// number of published settlement prints behind it. NORMAL waits for prints (a
    /// calculation); RISK may act on the projection before the settlement minute begins.
    settle_min_pwin: f64,
    settle_min_known: usize,
    /// Minimum fee-adjusted edge, in cents per contract, for a settlement trade.
    settle_min_edge_cents: f64,
    /// Second trade of the window.
    settle_second_min_pwin: f64,
    settle_second_min_known: usize,
    /// Stake as a multiple of Kelly on the bankroll; 0 means a flat stake.
    kelly_mult: f64,
    /// Flat stakes: multiplier on a sure bet. 1 keeps every trade the same size.
    sure_mult: f64,
    /// Trades the settlement engine may take in a window.
    settle_trades: usize,
    /// The early engine trades before the settlement minute on a model blend, with no
    /// probability floor. It is not settlement math, so NORMAL keeps it off.
    early_engine: bool,
    /// Highest price the settlement engine will pay in this mode.
    max_price: f64,
    /// Minimum expected profit, in dollars, on the stake it would put down.
    min_ev_dollars: f64,
    /// Whether the sharp-rise slot trades in this mode.
    sharp_slot: bool,
    /// The prices this mode will buy at in the settlement slot.
    price_bands: &'static [(f64, f64)],
}

fn mode_params(name: &str) -> ModeParams {
    let f = |k: &str, d: f64| env::var(k).ok().and_then(|v| v.parse().ok()).unwrap_or(d);
    if name.eq_ignore_ascii_case("RISK") {
        ModeParams {
            name: "RISK".into(),
            max_order_dollars: f("RISK_MAX_ORDER_DOLLARS", 100.0),
            min_edge_cents: f("RISK_MIN_EDGE_CENTS", 1.0),
            bets_per_window: 2,
            min_secs_left: f("RISK_MIN_SECS_LEFT", 30.0),
            max_secs_left: f("RISK_MAX_SECS_LEFT", 420.0),
            settle_min_pwin: f("RISK_SETTLE_MIN_PWIN", 0.6),
            settle_min_known: f("RISK_SETTLE_MIN_KNOWN", 0.0) as usize,
            settle_min_edge_cents: f("RISK_SETTLE_MIN_EDGE_CENTS", 5.0),
            settle_second_min_pwin: f("RISK_SETTLE_SECOND_MIN_PWIN", 0.7),
            settle_second_min_known: f("RISK_SETTLE_SECOND_MIN_KNOWN", 0.0) as usize,
            kelly_mult: f("RISK_KELLY_MULT", 0.75),
            sure_mult: 1.0,
            settle_trades: 2,
            early_engine: env::var("RISK_EARLY_ENGINE").map(|v| !v.eq_ignore_ascii_case("false")).unwrap_or(true),
            max_price: f("RISK_SETTLE_MAX_PRICE", 0.97),
            min_ev_dollars: f("RISK_MIN_EV_DOLLARS", 0.5),
            sharp_slot: false,
            price_bands: ALL_PRICES,
        }
    } else {
        ModeParams {
            name: "NORMAL".into(),
            max_order_dollars: f("MAX_ORDER_DOLLARS", 5.0),
            min_edge_cents: f("MIN_EDGE_CENTS", 2.0),
            bets_per_window: f("BETS_PER_WINDOW", 2.0) as usize,
            min_secs_left: f("MIN_SECS_LEFT", 90.0),
            max_secs_left: f("MAX_SECS_LEFT", 300.0),
            settle_min_pwin: f("SETTLE_MIN_PWIN", 0.75),
            settle_min_known: f("SETTLE_MIN_KNOWN", 0.0) as usize,
            settle_min_edge_cents: f("SETTLE_MIN_EDGE_CENTS", 2.0),
            settle_second_min_pwin: f("SETTLE_SECOND_MIN_PWIN", 0.95),
            settle_second_min_known: SETTLE_SECOND_MIN_KNOWN,
            kelly_mult: 0.0,
            sure_mult: f("SURE_BET_MULT", 1.0),
            settle_trades: 0,
            early_engine: env::var("EARLY_ENGINE").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false),
            max_price: f("SETTLE_MAX_PRICE", 0.97),
            min_ev_dollars: f("MIN_EV_DOLLARS", 0.15),
            sharp_slot: true,
            price_bands: NORMAL_PRICE_BANDS,
        }
    }
}

struct Ctx {
    client: reqwest::Client,
    rest_base: &'static str,
    ws_host: &'static str,
    live: bool,
    api_key_id: String,
    pem_path: String,
    supa: Option<Supa>,
    vol: SharedVol,
    mode: Arc<std::sync::Mutex<String>>,
    book: Arc<Mutex<TradeBook>>,
    /// Fraction of the last two minutes' move carried into the forecast (0 = pure GBM).
    momentum_weight: f64,
    /// How far the forecast moves from the market mid toward the model (1 = pure model).
    model_weight: f64,
    /// Published 1-second BRTI prints plus the Coinbase anchor for the settlement engine.
    brti: settle::SharedBrti,
    /// Dollar floor on the settlement estimate's spread (feed timing + basis error).
    settle_noise_dollars: f64,
    /// The analytics engine must agree before a settlement trade. Off, it only logs.
    analytics_veto: bool,
    /// Bankroll for Kelly sizing: the env value, capped by the live balance when live.
    bankroll_dollars: f64,
    /// Stop opening live trades once today's realized loss reaches this many dollars.
    daily_loss_limit: f64,
}

/// Dollars for a settlement trade. A flat stake when the mode's Kelly multiple is 0
/// (NORMAL), scaled by `sure_mult` on a sure bet; otherwise that multiple of Kelly on the bankroll, where
/// Kelly for a binary at price p with win probability q is (q - p) / (1 - p), floored at $5
/// and capped by the mode.
fn settle_size(mode: &ModeParams, p_win: f64, price: f64, bankroll: f64, sure: bool) -> f64 {
    if mode.kelly_mult <= 0.0 {
        return if sure { mode.max_order_dollars * mode.sure_mult } else { mode.max_order_dollars };
    }
    let f_star = ((p_win - price) / (1.0 - price)).max(0.0);
    (mode.kelly_mult * bankroll * f_star).max(5.0).min(mode.max_order_dollars)
}

fn in_price_band(bands: &[(f64, f64)], price: f64) -> bool {
    bands.iter().any(|(lo, hi)| price >= lo - 1e-9 && price <= hi + 1e-9)
}

/// Whether `side`'s mid is falling, from (time, YES mid) samples, oldest first.
fn side_is_falling(samples: &VecDeque<(i64, f64)>, side: Side, now: i64) -> bool {
    let Some(&(_, latest)) = samples.back() else { return true };
    let Some(&(then_ts, then)) = samples.iter().find(|(t, _)| *t >= now - FALLING_LOOKBACK_SECS) else { return true };
    if now - then_ts < FALLING_MIN_HISTORY_SECS {
        return true;
    }
    let change = match side {
        Side::Yes => latest - then,
        Side::No => then - latest,
    };
    change <= -FALLING_MOVE
}

/// How far the YES mid moved over the sharp-rise lookback, from (time, YES mid) samples, oldest first.
/// None when the samples do not reach back far enough.
fn sharp_move(samples: &VecDeque<(i64, f64)>, now: i64) -> Option<f64> {
    let &(_, latest) = samples.back()?;
    let &(then_ts, then) = samples.iter().find(|(t, _)| *t >= now - SHARP_LOOKBACK_SECS)?;
    (now - then_ts >= SHARP_LOOKBACK_SECS - SHARP_SLACK_SECS).then_some(latest - then)
}

/// The limit a live immediate-or-cancel order is sent at, for a signal priced at `price`.
fn ioc_limit(price: f64) -> f64 {
    ((price + IOC_CUSHION).min(0.99) * 100.0).round() / 100.0
}

/// What the sharp-rise slot would buy after a 60 s move in the YES mid, or None when the rise and price
/// fit no rule, or expected profit after fees is not positive.
fn sharp_entry(moved: f64, yes_bid: f64, yes_ask: f64) -> Option<models::Edge> {
    let side = if moved > 0.0 { Side::Yes } else { Side::No };
    let price = match side {
        Side::Yes => yes_ask,
        Side::No => 1.0 - yes_bid,
    };
    if !SHARP_RULES.iter().any(|(rise, lo, hi)| moved.abs() >= rise - 1e-9 && price >= lo - 1e-9 && price <= hi + 1e-9) {
        return None;
    }
    let p_win = (price + SHARP_EDGE).min(1.0);
    let p_yes = match side {
        Side::Yes => p_win,
        Side::No => 1.0 - p_win,
    };
    let cents = models::ev_cents(p_yes, side, price);
    (cents > 0.0).then_some(models::Edge { side, price, cents, p_yes })
}

/// This machine's name for the HUD. systemd services have no HOSTNAME variable.
fn host_label() -> String {
    env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .ok()
        .or_else(|| fs::read_to_string("/etc/hostname").ok().map(|h| h.trim().to_string()))
        .filter(|h| !h.is_empty())
        .unwrap_or_else(|| "bot".into())
}

/// Every open fight market on Kalshi.
async fn ufc_markets(client: &reqwest::Client, rest_base: &str) -> Vec<ufc::FightMarket> {
    let url = format!("{}/markets", rest_base);
    let mut out = Vec::new();
    let mut cursor = String::new();
    loop {
        let mut query = vec![("series_ticker", ufc::SERIES), ("status", "open"), ("limit", "200")];
        if !cursor.is_empty() {
            query.push(("cursor", cursor.as_str()));
        }
        let page = match client.get(&url).query(&query).send().await {
            Ok(r) => r.json::<serde_json::Value>().await.ok(),
            Err(e) => {
                println!("[UFC] Could not read Kalshi's fights: {}", e);
                None
            }
        };
        let Some(page) = page else { break };
        let rows = page["markets"].as_array().cloned().unwrap_or_default();
        let empty = rows.is_empty();
        out.extend(rows.iter().filter_map(ufc::parse_market));
        let next = page["cursor"].as_str().unwrap_or("").to_string();
        if next.is_empty() || empty {
            break;
        }
        cursor = next;
    }
    out
}

/// Copies each new site bet once, if its win chance beats Kalshi's price plus the fee.
async fn ufc_loop(ctx: Arc<Ctx>) {
    let live = ctx.live && env::var("UFC_LIVE").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false);
    let number = |key: &str, default: f64| env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default);
    let stake = number("UFC_DOLLARS", 5.0);
    let max_open = number("UFC_MAX_OPEN", 5.0) as usize;
    let poll = number("UFC_POLL_SECS", 900.0) as u64;
    println!("[+] UFC copy from {}: {} | ${:.0} a pick, up to {} open, checked every {} s", ufc::SITE, if live { "LIVE" } else { "paper" }, stake, max_open, poll);
    let mut last_seen = String::new();
    loop {
        let page = match ctx.client.get(ufc::SITE).send().await {
            Ok(r) => r.text().await.ok(),
            Err(e) => {
                println!("[UFC] Could not read the site: {}", e);
                None
            }
        };
        let picks = page.as_deref().map(ufc::parse_picks).unwrap_or_default();
        let markets = if picks.is_empty() { Vec::new() } else { ufc_markets(&ctx.client, ctx.rest_base).await };
        let mut lines = vec![format!("{} pending bets on the site, {} fight markets open on Kalshi", picks.len(), markets.len())];
        for pick in &picks {
            let Some(market) = ufc::find_market(pick, &markets) else {
                lines.push(format!("{} vs {}: no open Kalshi market", pick.fighter_a, pick.fighter_b));
                continue;
            };
            let allowed = {
                let b = ctx.book.lock().await;
                !b.trades.iter().any(|t| t.source == "ufc" && t.ticker.starts_with(&market.event_ticker))
                    && b.open_count("ufc") < max_open
                    && !(live && b.daily_stopped(ctx.daily_loss_limit))
            };
            if !allowed {
                continue;
            }
            let Some(bet) = ufc::decide(pick.ai_win, market.yes_ask, stake) else {
                lines.push(format!("{}: site says {:.1}%, Kalshi asks {}, not profitable", pick.pick, pick.ai_win * 100.0, market.yes_ask.map_or("nothing".to_string(), |a| format!("{:.0}c", a * 100.0))));
                continue;
            };
            let client_order_id = format!("ufc-{}-{}", market.ticker, chrono::Utc::now().timestamp_millis());
            let (mut count, mut price, mut fee, mut order_id) = (bet.count, bet.price, taker_fee(bet.price) * bet.count as f64, None);
            if live {
                let outcome = place_order(&ctx, &market.ticker, Side::Yes, bet.price, bet.count, &client_order_id).await.map_err(|e| e.to_string());
                match outcome {
                    Ok(fill) if fill.filled > 0.0 => {
                        count = (fill.filled.round() as u32).max(1);
                        if let Some(avg) = fill.average_price {
                            price = v2_fill_cost(Side::Yes, avg, bet.price);
                        }
                        fee = fill.fee_per_contract.map_or(taker_fee(price) * fill.filled, |per| per * fill.filled);
                        order_id = Some(fill.order_id);
                    }
                    Ok(_) => {
                        lines.push(format!("{}: order got no fill", pick.pick));
                        continue;
                    }
                    Err(e) => {
                        println!("[UFC] Order failed on {}: {}", market.ticker, e);
                        continue;
                    }
                }
            }
            let note = format!(
                "copied from mma-ai.net | {} | site {:.1}% vs Kalshi {:.0}c | edge {:+.1}c{}",
                pick.event, pick.ai_win * 100.0, bet.price * 100.0, bet.edge_cents,
                pick.site_ev.map_or(String::new(), |ev| format!(" | site EV {:+.1}%", ev))
            );
            println!("[UFC] {} {} x{} @ {:.0}c | {}", if live { "LIVE" } else { "PAPER" }, market.fighter, count, price * 100.0, note);
            ctx.book.lock().await.record(
                Trade {
                    mode: if live { "LIVE-UFC".into() } else { "PAPER-UFC".into() },
                    source: "ufc".into(),
                    ticker: market.ticker.clone(),
                    title: format!("{} to beat {}", market.fighter, pick.opponent()),
                    side: "yes".into(),
                    price,
                    count,
                    cost: count as f64 * price,
                    fee,
                    model_prob: pick.ai_win,
                    gbm_prob: pick.ai_win,
                    momentum: 0.0,
                    edge_cents: bet.edge_cents,
                    spot: 0.0,
                    strike: 0.0,
                    placed_ts: chrono::Utc::now().timestamp(),
                    close_ts: market.expected_ts,
                    client_order_id,
                    order_id,
                    result: None,
                    pnl: None,
                    note: String::new(),
                },
                ctx.supa.as_ref(),
                &note,
            );
        }
        let summary = lines.join(" | ");
        if summary != last_seen {
            println!("[UFC] {}", summary);
            last_seen = summary;
        }
        sleep(Duration::from_secs(poll)).await;
    }
}

/// Reads Kalshi's records on a timer, compares them with the book, and publishes the result. Open
/// positions and today's loss from Kalshi feed the per-window limit and the daily stop.
async fn reconcile_loop(ctx: Arc<Ctx>) {
    let started = chrono::Utc::now().timestamp();
    let since = env::var("RECONCILE_SINCE").ok().and_then(|v| v.parse().ok()).unwrap_or(started);
    println!("[+] Exchange check: Kalshi's records since {} against the book, every {} s", since, RECONCILE_SECS);
    let mut last: Option<reconcile::Report> = None;
    let mut last_published = 0i64;
    let mut reported = std::collections::HashSet::new();
    loop {
        match reconcile::fetch(&ctx.client, ctx.rest_base, &ctx.api_key_id, &ctx.pem_path, since).await {
            Err(e) => println!("[RECONCILE] Could not read Kalshi's records: {}", e),
            Ok((fills, settlements)) => {
                let now = chrono::Utc::now();
                let day_start = now.date_naive().and_hms_opt(0, 0, 0).map(|d| d.and_utc().timestamp()).unwrap_or(0);
                let report = {
                    let mut b = ctx.book.lock().await;
                    let r = reconcile::reconcile(&fills, &settlements, &b.trades, since, day_start, now.timestamp());
                    b.exchange_open = r.open_tickers.iter().cloned().collect();
                    b.exchange_pnl_today = Some(r.net_today);
                    r
                };
                let changed = last.as_ref() != Some(&report);
                if changed || now.timestamp() - last_published >= RECONCILE_PUBLISH_SECS {
                    println!(
                        "[RECONCILE] {} | Kalshi: {} fills, {} settled, net ${:+.2}, today ${:+.2} | book: {} settled, net ${:+.2} | open {}",
                        if report.problems.is_empty() { "MATCH" } else { "MISMATCH" },
                        report.fills, report.settled_markets, report.net, report.net_today, report.book_settled, report.book_net, report.open_tickers.len()
                    );
                    if let Some(s) = &ctx.supa {
                        s.event(json!({
                            "kind": "reconcile",
                            "source": "bot",
                            "mode": ctx.mode_label(),
                            "live": true,
                            "pnl_cents": (report.net * 100.0).round() as i64,
                            "message": serde_json::to_string(&report).unwrap_or_default(),
                        }));
                    }
                    last_published = now.timestamp();
                }
                for problem in &report.problems {
                    if reported.insert(problem.clone()) {
                        println!("[RECONCILE] PROBLEM {}", problem);
                        if let Some(s) = &ctx.supa {
                            s.event(json!({ "kind": "error", "source": "bot", "mode": ctx.mode_label(), "live": true, "message": format!("exchange check: {}", problem) }));
                        }
                    }
                }
                last = Some(report);
            }
        }
        sleep(Duration::from_secs(RECONCILE_SECS)).await;
    }
}

/// Signed GET against the trade API; `path` is relative to the v2 base (e.g. "/portfolio/balance").
async fn kalshi_get(client: &reqwest::Client, rest_base: &str, api_key_id: &str, pem_path: &str, path: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let signature = sign_message(pem_path, &format!("{}GET/trade-api/v2{}", ts, path))?;
    let resp = client
        .get(format!("{}{}", rest_base, path))
        .header("KALSHI-ACCESS-KEY", api_key_id)
        .header("KALSHI-ACCESS-SIGNATURE", &signature)
        .header("KALSHI-ACCESS-TIMESTAMP", &ts)
        .send()
        .await?;
    let status = resp.status();
    let v: serde_json::Value = resp.json().await.unwrap_or(json!({}));
    if !status.is_success() {
        return Err(format!("{} {}", status, v).into());
    }
    Ok(v)
}

async fn kalshi_balance(client: &reqwest::Client, rest_base: &str, api_key_id: &str, pem_path: &str) -> Result<f64, Box<dyn std::error::Error>> {
    let v = kalshi_get(client, rest_base, api_key_id, pem_path, "/portfolio/balance").await?;
    Ok(v["balance_dollars"].as_str().and_then(|s| s.parse::<f64>().ok()).or_else(|| v["balance"].as_f64().map(|c| c / 100.0)).unwrap_or(0.0))
}

impl Ctx {
    fn mode(&self) -> ModeParams {
        mode_params(&self.mode.lock().unwrap())
    }
    fn mode_label(&self) -> String {
        format!("{}-{}", if self.live { "LIVE" } else { "PAPER" }, self.mode().name)
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.local").ok();
    env_logger::init();
    println!("[+] KALSHIRUST starting: Kalshi 15m BTC engine + market sniper");

    let env_type = env::var("KALSHI_ENVIRONMENT").unwrap_or_else(|_| "demo".to_string());
    let (rest_base, ws_host): (&'static str, &'static str) = if env_type == "production" {
        ("https://api.elections.kalshi.com/trade-api/v2", "api.elections.kalshi.com")
    } else {
        ("https://demo-api.kalshi.co/trade-api/v2", "demo-api.kalshi.co")
    };
    println!("[+] Kalshi environment: {}", env_type);

    let client = reqwest::Client::builder().timeout(Duration::from_secs(20)).build()?;
    let api_key_id = env::var("KALSHI_API_KEY_ID")?;
    let pem_path = env::var("KALSHI_PRIVATE_KEY_PATH")?;
    let mut live = env::var("LIVE_TRADING").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false);
    let mut bankroll: f64 = env::var("BANKROLL_DOLLARS").ok().and_then(|v| v.parse().ok()).unwrap_or(100.0);
    let daily_loss_limit: f64 = env::var("DAILY_LOSS_LIMIT_DOLLARS").ok().and_then(|v| v.parse().ok()).unwrap_or(30.0);
    if live {
        match kalshi_balance(&client, rest_base, &api_key_id, &pem_path).await {
            Ok(bal) => {
                println!("[LIVE] Kalshi balance ${:.2} | daily loss stop ${:.0}", bal, daily_loss_limit);
                if bal < 5.0 {
                    eprintln!("[!] Balance is under $5: running PAPER until the account is funded. Restart after funding.");
                    live = false;
                } else {
                    bankroll = bankroll.min(bal);
                }
            }
            Err(e) => {
                eprintln!("[!] Could not read the Kalshi balance ({}): running PAPER.", e);
                live = false;
            }
        }
    }
    // The trade limit ends a paper run. A live bot stops on STOP or the daily loss limit.
    let bot_limit: usize = if live { usize::MAX } else { env::var("PAPER_TRADE_LIMIT").ok().and_then(|v| v.parse().ok()).unwrap_or(8) };
    let sniper_limit: usize = env::var("SNIPE_TRADE_LIMIT").ok().and_then(|v| v.parse().ok()).unwrap_or(20);
    let initial_mode = env::var("MODE").unwrap_or_else(|_| "NORMAL".into()).to_uppercase();
    let supa = Supa::from_env(&client);
    if supa.is_none() {
        eprintln!("[!] Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY): HUD will not update.");
    }

    let ctx = Arc::new(Ctx {
        client: client.clone(),
        rest_base,
        ws_host,
        live,
        api_key_id,
        pem_path,
        supa,
        vol: vol::shared(),
        mode: Arc::new(std::sync::Mutex::new(initial_mode)),
        book: Arc::new(Mutex::new(TradeBook::load("trades.jsonl", bot_limit, sniper_limit))),
        momentum_weight: env::var("MOMENTUM_WEIGHT").ok().and_then(|v| v.parse().ok()).unwrap_or(0.3),
        model_weight: env::var("MODEL_WEIGHT").ok().and_then(|v| v.parse().ok()).unwrap_or(0.15),
        brti: settle::shared(),
        settle_noise_dollars: env::var("SETTLE_NOISE_DOLLARS").ok().and_then(|v| v.parse().ok()).unwrap_or(4.0),
        analytics_veto: env::var("ANALYTICS_VETO").map(|v| !v.eq_ignore_ascii_case("false")).unwrap_or(true),
        bankroll_dollars: bankroll,
        daily_loss_limit,
    });

    {
        let b = ctx.book.lock().await;
        let m = ctx.mode();
        println!(
            "[+] {} | mode {} (${:.0} max, {:.1}c min edge, {} bet/window, early engine {}, settlement engine {}) | 15m trades {}/{} logged, sniper {}/{}, {} pending",
            if live { "LIVE TRADING" } else { "PAPER (LIVE_TRADING=false)" },
            m.name, m.max_order_dollars, m.min_edge_cents, m.bets_per_window,
            if m.early_engine { format!("{}-{}s before close", m.min_secs_left as i64, m.max_secs_left as i64) } else { "off".to_string() },
            if m.settle_trades == 0 { "logging only".to_string() } else { format!("first trade needs P(win) >= {:.0}% on >= {} known prints", m.settle_min_pwin * 100.0, m.settle_min_known) },
            b.count_source("bot"), bot_limit, b.count_source("sniper"), sniper_limit, b.pending()
        );
    }

    println!("[+] Analytics engine: {}", if ctx.analytics_veto { "must agree before any settlement trade" } else { "logging only" });
    let rules = SHARP_RULES.iter().map(|(rise, lo, hi)| format!("{:.0}c+ into {:.0}-{:.0}c", rise * 100.0, lo * 100.0, hi * 100.0)).collect::<Vec<_>>().join(", ");
    println!("[+] Sharp-rise rules: {} over the prior {} s, checked with {:?} s left", rules, SHARP_LOOKBACK_SECS, SHARP_CHECKS_SECS_LEFT);

    // Coinbase spot: feeds both the watch channel and the tick-vol estimator.
    let (spot_tx, spot_rx) = tokio::sync::watch::channel(0.0_f64);
    {
        let vol = ctx.vol.clone();
        let brti = ctx.brti.clone();
        tokio::spawn(async move {
            loop {
                if let Ok((stream, _)) = connect_async("wss://ws-feed.exchange.coinbase.com").await {
                    let (mut w, mut r) = stream.split();
                    let sub = json!({ "type": "subscribe", "product_ids": ["BTC-USD"], "channels": ["ticker"] });
                    if w.send(Message::Text(sub.to_string())).await.is_ok() {
                        while let Some(Ok(Message::Text(txt))) = r.next().await {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                let f = |k: &str| v[k].as_str().and_then(|s| s.parse::<f64>().ok());
                                if let Some(p) = f("price") {
                                    let _ = spot_tx.send(p);
                                    vol.lock().unwrap().push_tick(chrono::Utc::now().timestamp(), p);
                                    // Mid of the top of book is the index-like price; the
                                    // exchange timestamp keeps the basis aligned to BRTI's clock.
                                    let mid = match (f("best_bid"), f("best_ask")) {
                                        (Some(b), Some(a)) => (a + b) / 2.0,
                                        _ => p,
                                    };
                                    let ts_ms = v["time"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp_millis())
                                        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
                                    brti.lock().unwrap().push_coinbase(ts_ms, mid);
                                }
                            }
                        }
                    }
                }
                sleep(Duration::from_secs(5)).await;
            }
        });
    }

    // BRTI: Kalshi republishes the index's last 60 one-second prints every second.
    {
        let c = ctx.clone();
        tokio::spawn(async move {
            let mut announced = false;
            let mut tick = tokio::time::interval(Duration::from_secs(1));
            loop {
                tick.tick().await;
                match settle::poll(&c.client, &c.brti).await {
                    Ok(()) => {
                        if !announced {
                            let b = c.brti.lock().unwrap();
                            println!("[BRTI] feed live: index {:.2} | 60s avg {:.2} | as of {}s ago", b.raw.last().copied().unwrap_or(0.0), b.rolling.last().copied().unwrap_or(0.0),
                                chrono::Utc::now().timestamp() - b.as_of);
                            announced = true;
                        }
                    }
                    Err(e) => {
                        let mut b = c.brti.lock().unwrap();
                        b.failures += 1;
                        if b.failures % 30 == 1 {
                            eprintln!("[!] BRTI feed: {}", e);
                        }
                    }
                }
            }
        });
    }

    // Candle vol: refreshed every 5 minutes.
    {
        let c = ctx.clone();
        tokio::spawn(async move {
            loop {
                match vol::fetch_candle_sigma_15m(&c.client).await {
                    Ok(s) => {
                        c.vol.lock().unwrap().set_candle_sigma(s);
                        println!("[VOL] 15m realized sigma from candles: {:.4}% ({:.2}% over 1h)", s * 100.0, s * 2.0 * 100.0);
                    }
                    Err(e) => eprintln!("[!] Candle vol fetch failed: {}", e),
                }
                sleep(Duration::from_secs(300)).await;
            }
        });
    }

    // Mode: the HUD's RISK button writes kalshirust_config; poll it every 10 s.
    if let Some(s) = ctx.supa.clone() {
        let c = ctx.clone();
        // Startup stamp for the HUD's uptime and trades-since-start readout.
        s.patch_config(json!({
            "bot_started_at": chrono::Utc::now().to_rfc3339(),
            "host_name": host_label(),
            "host_status": "running",
            "host_seen_at": chrono::Utc::now().to_rfc3339(),
        }));
        tokio::spawn(async move {
            loop {
                if let Some(m) = s.mode().await {
                    let m = m.to_uppercase();
                    let mut cur = c.mode.lock().unwrap();
                    if *cur != m {
                        println!("[MODE] {} -> {} (from HUD)", *cur, m);
                        *cur = m;
                    }
                }
                // Heartbeat for the HUD's RUN / STOP control: this host, this bot, alive now.
                s.patch_config(json!({
                    "host_name": host_label(),
                    "host_status": "running",
                    "host_seen_at": chrono::Utc::now().to_rfc3339(),
                }));
                sleep(Duration::from_secs(10)).await;
            }
        });
    }

    // Exchange check: Kalshi's fills and settlements against the book, live only.
    if ctx.live {
        let c = ctx.clone();
        tokio::spawn(async move { reconcile_loop(c).await });
    }

    // UFC picks from mma-ai.net, off unless UFC_COPY=true. Paper unless UFC_LIVE=true on a live bot.
    if env::var("UFC_COPY").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false) {
        let c = ctx.clone();
        tokio::spawn(async move { ufc_loop(c).await });
    }

    // Sniper: every 60 s, paper only.
    {
        let c = ctx.clone();
        let rx = spot_rx.clone();
        tokio::spawn(async move {
            let cfg = ScanConfig::from_env();
            let mut series = scanner::SeriesCache::default();
            sleep(Duration::from_secs(15)).await;
            loop {
                let spot = *rx.borrow();
                let mode = c.mode().name;
                scanner::scan(&c.client, c.rest_base, &c.vol, spot, c.supa.as_ref(), &c.book, &cfg, &mut series, &mode, false).await;
                sleep(Duration::from_secs(60)).await;
            }
        });
    }

    let mut spot_rx = spot_rx;
    let mut windows_seen: Vec<String> = Vec::new();
    let mut last_settled = usize::MAX;
    loop {
        {
            let mut b = ctx.book.lock().await;
            b.settle(&ctx.client, ctx.rest_base, ctx.supa.as_ref()).await;
            if !windows_seen.is_empty() && b.settled_bot_count() != last_settled {
                last_settled = b.settled_bot_count();
                let mut traded = 0usize;
                let mut net = 0.0;
                let mut pending = 0usize;
                for w in &windows_seen {
                    let (n, pnl) = b.window_pnl(w);
                    if n > 0 {
                        traded += 1;
                    }
                    match pnl {
                        Some(p) => net += p,
                        None if n > 0 => pending += 1,
                        None => {}
                    }
                }
                let per = net / windows_seen.len() as f64;
                println!(
                    "[WINDOWS] {} observed | {} traded | {} with trades pending | net ${:+.2} | ${:+.2} per window | ${:+.2} per day at 96 windows | target ${:.0}/window ({})",
                    windows_seen.len(), traded, pending, net, per, per * 96.0,
                    if ctx.mode().name == "RISK" { 3.0 } else { 1.0 }, ctx.mode().name
                );
            }
            if b.is_done() {
                b.print_summary();
                println!("[+] {} settled 15m trades and nothing pending. Exiting.", b.bot_limit());
                return Ok(());
            }
            if !b.can_record("bot") {
                println!("[*] 15m trade limit reached; waiting for {} trade(s) to settle...", b.pending());
                drop(b);
                sleep(Duration::from_secs(30)).await;
                continue;
            }
        }

        match discover_active_kxbtc15m(&ctx.client, ctx.rest_base).await {
            Ok(Some((ticker, strike, close_ts))) => {
                println!("[+] Active 15m contract: {} | strike ${:.2} | closes in {}s", ticker, strike, close_ts - chrono::Utc::now().timestamp());
                if !windows_seen.contains(&ticker) && close_ts > chrono::Utc::now().timestamp() {
                    windows_seen.push(ticker.clone());
                }
                if ctx.live {
                    let b = ctx.book.lock().await;
                    if b.daily_stopped(ctx.daily_loss_limit) {
                        println!("[STOP] Daily loss limit ${:.0} reached (${:+.2} realized today). No new live trades until 00:00 UTC.", ctx.daily_loss_limit, b.live_pnl_today());
                    }
                }
                if let Err(e) = run_window(&ctx, ticker, strike, close_ts, &mut spot_rx).await {
                    eprintln!("[!] WebSocket stream error: {}. Reconnecting in 3s...", e);
                    if let Some(s) = &ctx.supa {
                        s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": ctx.live, "message": format!("ws: {}", e) }));
                    }
                }
            }
            Ok(None) => println!("[*] No active KXBTC15M contract found. Retrying..."),
            Err(e) => eprintln!("[!] REST discovery error: {}", e),
        }
        sleep(Duration::from_secs(3)).await;
    }
}

async fn discover_active_kxbtc15m(client: &reqwest::Client, rest_base: &str) -> Result<Option<(String, f64, i64)>, Box<dyn std::error::Error>> {
    let url = format!("{}/markets?series_ticker=KXBTC15M&status=open&limit=1", rest_base);
    let resp: serde_json::Value = client.get(&url).send().await?.json().await?;
    if let Some(first) = resp["markets"].as_array().and_then(|a| a.first()) {
        let ticker = first["ticker"].as_str().unwrap_or("").to_string();
        let strike = first["floor_strike"].as_f64();
        let close_ts = first["close_time"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp());
        if let (false, Some(strike), Some(close_ts)) = (ticker.is_empty(), strike, close_ts) {
            return Ok(Some((ticker, strike, close_ts)));
        }
    }
    Ok(None)
}

fn price_field(msg: &serde_json::Value, dollars: &str, cents: &str) -> Option<f64> {
    msg[dollars]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .or_else(|| msg[cents].as_f64().map(|c| c / 100.0))
        .filter(|p| *p > 0.0 && *p < 1.0)
}

/// One 15-minute window. Two engines share the stream:
/// - early engine (entry window set by the mode): GBM + momentum forecast blended toward
///   the market, trades only on a fee-adjusted edge;
/// - settlement engine (final 90 s): the published 1-second BRTI prints make part of the
///   settlement average known, so the forecast is a calculation rather than a model.
async fn run_window(
    ctx: &Arc<Ctx>,
    ticker: String,
    strike: f64,
    close_ts: i64,
    spot_rx: &mut tokio::sync::watch::Receiver<f64>,
) -> Result<(), Box<dyn std::error::Error>> {
    let ws_url = format!("wss://{}/trade-api/ws/v2", ctx.ws_host);
    let timestamp = chrono::Utc::now().timestamp_millis().to_string();
    let signature = sign_message(&ctx.pem_path, &format!("{}GET/trade-api/ws/v2", timestamp))?;
    let request = Request::builder()
        .method("GET")
        .uri(&ws_url)
        .header("Host", ctx.ws_host)
        .header("KALSHI-ACCESS-KEY", &ctx.api_key_id)
        .header("KALSHI-ACCESS-SIGNATURE", &signature)
        .header("KALSHI-ACCESS-TIMESTAMP", &timestamp)
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", tokio_tungstenite::tungstenite::handshake::client::generate_key())
        .body(())?;

    let (ws_stream, _) = connect_async(request).await?;
    let (mut write, mut read) = ws_stream.split();
    write
        .send(Message::Text(json!({ "id": 1, "cmd": "subscribe", "params": { "channels": ["ticker"], "market_tickers": [ticker] } }).to_string()))
        .await?;

    let mut yes_ask: Option<f64> = None;
    let mut yes_bid: Option<f64> = None;
    let mut bets_early = 0usize;
    let mut bets_settle = 0usize;
    let mut last_settle_entry = 0i64;
    let mut window_side: Option<&'static str> = None;
    let mut last_early_attempt = 0i64;
    let mut last_status = 0i64;
    let mut last_print = 0i64;
    let mut calib: Vec<(i64, f64, f64, f64, Option<f64>)> = Vec::new();
    let mut engine = KxBtc15mEngine::new(strike, ctx.settle_noise_dollars);
    let mut engine_as_of = 0i64;
    let mut book_updated = Instant::now();
    let mut veto_logged = false;
    let mut sharp_next = 0usize;
    let mut mid_samples: VecDeque<(i64, f64)> = VecDeque::new();
    let mut falling_logged = false;
    let mut maker_logged = false;
    let mut calib_marks: Vec<i64> = vec![60, 45, 30, 15, 5];
    let mut tick = tokio::time::interval(Duration::from_secs(1));

    loop {
        let from_feed = tokio::select! {
            msg = read.next() => {
                match msg {
                    None => break,
                    Some(Err(e)) => return Err(e.into()),
                    Some(Ok(Message::Text(txt))) => {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                            if v["type"].as_str() == Some("ticker") {
                                let m = &v["msg"];
                                book_updated = Instant::now();
                                if let Some(a) = price_field(m, "yes_ask_dollars", "yes_ask") { yes_ask = Some(a); }
                                if let Some(b) = price_field(m, "yes_bid_dollars", "yes_bid") { yes_bid = Some(b); }
                            }
                        }
                        true
                    }
                    Some(Ok(_)) => continue,
                }
            }
            _ = tick.tick() => false,
            // Coinbase ticks drive the settlement engine: the book lags them by a second or more.
            changed = spot_rx.changed() => { if changed.is_err() { break; } true },
        };

        let now = chrono::Utc::now().timestamp();
        let rem = (close_ts - now) as f64;
        if rem <= 0.0 {
            break;
        }
        let last_minute = rem <= SETTLE_WINDOW_SECS;
        if from_feed && !last_minute {
            continue;
        }
        let no_ask = yes_bid.map(|b| 1.0 - b);
        let spot = *spot_rx.borrow();
        let mode = ctx.mode();

        // New BRTI prints go to the analytics engine as they arrive.
        {
            let b = ctx.brti.lock().unwrap();
            if b.as_of > engine_as_of && !b.raw.is_empty() {
                let fresh = if engine_as_of == 0 { b.raw.len() } else { ((b.as_of - engine_as_of) as usize).min(b.raw.len()) };
                let received = Instant::now();
                for p in &b.raw[b.raw.len() - fresh..] {
                    engine.on_brti_second_print(*p, received);
                }
                engine_as_of = b.as_of;
            }
        }

        if let (Some(bid), Some(ask)) = (yes_bid, yes_ask) {
            mid_samples.push_back((now, (bid + ask) / 2.0));
            while mid_samples.front().map_or(false, |(t, _)| *t < now - SHARP_LOOKBACK_SECS - SHARP_SLACK_SECS) {
                mid_samples.pop_front();
            }
        }

        // ---- sharp-rise slot ----------------------------------------------------------
        if mode.sharp_slot && sharp_next < SHARP_CHECKS_SECS_LEFT.len() && rem <= SHARP_CHECKS_SECS_LEFT[sharp_next] {
            let on_time = rem >= SHARP_CHECKS_SECS_LEFT[sharp_next] - SHARP_SLACK_SECS as f64;
            sharp_next += 1;
            match (yes_bid, yes_ask, sharp_move(&mid_samples, now)) {
                (Some(bid), Some(ask), Some(moved)) if on_time => match sharp_entry(moved, bid, ask) {
                    Some(edge) if window_side.map_or(false, |w| w != edge.side.as_str()) => {
                        println!("[SHARP] {} | {:.0}s left | {} @ {:.1}c is against the trade already made, skipped", ticker, rem, edge.side.as_str().to_uppercase(), edge.price * 100.0);
                    }
                    Some(edge) if side_is_falling(&mid_samples, edge.side, now) => {
                        println!("[FALLING] {} | {} @ {:.1}c has a falling price, no trade", ticker, edge.side.as_str().to_uppercase(), edge.price * 100.0);
                    }
                    Some(edge) => {
                        let p_win = match edge.side { Side::Yes => edge.p_yes, Side::No => 1.0 - edge.p_yes };
                        let dollars = settle_size(&mode, p_win, edge.price, ctx.bankroll_dollars, false);
                        let count = (dollars / edge.price).floor();
                        let allowed = { let b = ctx.book.lock().await; b.can_record("bot") && b.open_on(&ticker) < mode.bets_per_window && !(ctx.live && b.daily_stopped(ctx.daily_loss_limit)) };
                        if count >= 1.0 && allowed {
                            let note = format!("sharp-rise slot | {:.0}s left | YES mid {:+.1}c in {} s | assumed edge {:.2}c", rem, moved * 100.0, SHARP_LOOKBACK_SECS, SHARP_EDGE * 100.0);
                            if enter(ctx, &ticker, strike, close_ts, spot, edge.p_yes, edge.p_yes, moved, edge, dollars, "BTC 15 min (sharp rise)", "sharp", &note).await {
                                window_side = Some(edge.side.as_str());
                            }
                        }
                    }
                    None => println!("[SHARP] {} | {:.0}s left | YES mid {:+.1}c in {} s, YES {:.0}c/{:.0}c | fits no rule, no trade", ticker, rem, moved * 100.0, SHARP_LOOKBACK_SECS, bid * 100.0, ask * 100.0),
                },
                _ => println!("[SHARP] {} | {:.0}s left | no price history for the check, no trade", ticker, rem),
            }
        }

        // ---- settlement engine -------------------------------------------------------
        if last_minute {
            // Millisecond time left and the feed's measured lag keep the known/unknown
            // split aligned to the actual print timestamps.
            let now_ms = chrono::Utc::now().timestamp_millis();
            let rem_s = (close_ts * 1000 - now_ms) as f64 / 1000.0;
            let (est, feed_fresh, sigma_1s, anchor) = {
                let b = ctx.brti.lock().unwrap();
                let fresh = b.fresh(now);
                // Per-second vol: the larger of the last ten minutes of prints and the 15-minute
                // candle vol scaled to one second. The tick estimate alone is built from the calm
                // minutes before close and understated a $40 final-minute move (z = -2.8).
                let s_tick = b.sigma_1s().unwrap_or(0.00005);
                let s_candle = ctx.vol.lock().unwrap().sigma_15m().map(|s| s / 30.0).unwrap_or(0.0);
                let s1 = s_tick.max(s_candle);
                let anchor = b.anchor(now_ms);
                let lag = (now_ms as f64 / 1000.0 - b.as_of as f64).clamp(1.0, 10.0);
                let est = match (fresh, anchor) {
                    (true, Some(a)) => settle::estimate(&b.raw, rem_s, lag, a, s1, ctx.settle_noise_dollars, strike),
                    _ => None,
                };
                (est, fresh, s1, anchor)
            };
            // Analytics engine: the unknown stretch runs from its newest print, not from now.
            let a_secs = rem_s + (now_ms as f64 / 1000.0 - engine_as_of as f64).clamp(1.0, 10.0);
            let a_p = engine.compute_true_yes_probability(a_secs);
            let a_signal = match (yes_bid, yes_ask) {
                (Some(bid), Some(ask)) => engine.evaluate_signal(
                    &KalshiBookTop { yes_bid: bid, yes_ask: ask, no_bid: 1.0 - ask, no_ask: 1.0 - bid, updated_at: book_updated },
                    a_secs,
                    Instant::now(),
                    mode.settle_min_edge_cents,
                ),
                _ => ExecutionSignal::Hold,
            };
            let a_label = format!("analytics P(up) {} {}", a_p.map_or("-".to_string(), |p| format!("{:.1}%", p * 100.0)), match &a_signal {
                ExecutionSignal::Hold => "hold".to_string(),
                ExecutionSignal::PostMaker { side, price_dollars, .. } => format!("maker {:?} @ {:.1}c", side, price_dollars * 100.0),
                ExecutionSignal::SnipeTaker { side, net_edge_cents, .. } => format!("taker {:?} {:+.2}c", side, net_edge_cents),
            });
            // Resting orders need tracking this bot does not have, so that branch only logs.
            if let ExecutionSignal::PostMaker { side, price_dollars, contracts, ev_cents } = &a_signal {
                if !maker_logged {
                    println!("[MAKER IDEA] {} | {:?} x{} @ {:.1}c, {:+.2}c expected | not placed", ticker, side, contracts, price_dollars * 100.0, ev_cents);
                    maker_logged = true;
                }
            }
            let anchor_label = anchor.map_or("-".to_string(), |a| if a.from_coinbase { format!("coinbase+basis {:.2} ({:.1}s old)", a.price, a.age) } else { format!("brti print {:.2} ({:.1}s old)", a.price, a.age) });
            if let Some(est) = est {
                if let Some(mark) = calib_marks.first().copied() {
                    if rem <= mark as f64 {
                        calib.push((rem as i64, est.mean, est.sd, est.p_yes, a_p));
                        calib_marks.remove(0);
                    }
                }
                let edge = best_edge(est.p_yes, yes_ask, no_ask).filter(|e| e.price >= 0.05 && e.price <= mode.max_price);
                if now - last_print >= 5 {
                    println!(
                        "[SETTLE] {} | {}s left | known {}/60 | est {:.2} ± {:.2} vs strike {:.2} ({:+.2}) | P(up) {:.1}% | yes {}c/{}c | best {} {:+.2}c | sigma1s {:.4}% | anchor {} | {}",
                        ticker, rem as i64, est.known_prints, est.mean, est.sd, strike, est.mean - strike, est.p_yes * 100.0,
                        yes_bid.map_or("-".into(), |b| format!("{:.0}", b * 100.0)), yes_ask.map_or("-".into(), |a| format!("{:.0}", a * 100.0)),
                        edge.map_or("-".into(), |e| e.side.as_str().to_uppercase()), edge.map_or(0.0, |e| e.cents), sigma_1s * 100.0, anchor_label, a_label
                    );
                    last_print = now;
                }
                if now - last_status >= 5 {
                    if let Some(s) = &ctx.supa {
                        s.event(json!({
                            "kind": "status", "source": "bot", "mode": ctx.mode_label(), "live": ctx.live,
                            "ticker": ticker, "close_time": chrono::DateTime::from_timestamp(close_ts, 0).map(|d| d.to_rfc3339()),
                            "seconds_to_close": rem as i64, "spot": spot, "strike": strike, "vol_window": est.sd / strike,
                            "yes_bid_cents": yes_bid.map(|b| (b * 100.0).round() as i64),
                            "yes_ask_cents": yes_ask.map(|a| (a * 100.0).round() as i64),
                            "no_ask_cents": no_ask.map(|a| (a * 100.0).round() as i64),
                            "model_prob": est.p_yes, "edge_cents": edge.map(|e| e.cents),
                            "side": edge.map(|e| e.side.as_str()), "price_cents": edge.map(|e| (e.price * 100.0).round() as i64),
                            "message": format!("settlement engine | {}/60 prints known | est {:.2} ± {:.2} | strike {:.2} | {}", est.known_prints, est.mean, est.sd, strike, a_label),
                        }));
                    }
                    last_status = now;
                }
                if let Some(edge) = edge {
                    let settle_p_win = match edge.side { Side::Yes => est.p_yes, Side::No => 1.0 - est.p_yes };
                    let a_agrees = match &a_signal {
                        ExecutionSignal::SnipeTaker { side, .. } => matches!((side, edge.side), (analytics::Side::Yes, Side::Yes) | (analytics::Side::No, Side::No)),
                        _ => false,
                    };
                    let a_p_win = a_p.map(|p| match edge.side { Side::Yes => p, Side::No => 1.0 - p });
                    // With both engines in play the lower win chance is the one that counts.
                    let p_win = if ctx.analytics_veto { a_p_win.map_or(0.0, |a| settle_p_win.min(a)) } else { settle_p_win };
                    // Before 3 settlement prints exist the estimate is a projection, so the bar is
                    // higher: at least 90% and 3c of edge. With prints in hand the mode's floor applies.
                    // Big-win trades (a $5 stake pays $3 or more, i.e. price <= 62.5c) are worth
                    // taking at the mode's floor even on a projection: at 80% they clear +15c a
                    // contract after fees.
                    let projection = est.known_prints < 3 && edge.price > BIG_WIN_MAX_PRICE;
                    let (pwin_floor, known_floor) = if bets_settle == 0 {
                        (if projection { mode.settle_min_pwin.max(0.9) } else { mode.settle_min_pwin }, mode.settle_min_known)
                    } else {
                        (mode.settle_second_min_pwin, mode.settle_second_min_known)
                    };
                    let edge_floor = if projection { mode.settle_min_edge_cents.max(3.0) } else { mode.settle_min_edge_cents };
                    // A sure bet: a near-certain call resting on published settlement prints. In the
                    // live record every call at this level from 45 s down has been right.
                    let sure = p_win >= mode.settle_second_min_pwin && est.known_prints >= mode.settle_second_min_known;
                    let dollars = settle_size(&mode, p_win, edge.price, ctx.bankroll_dollars, sure);
                    // Expected profit on the whole stake: what ranks trades, since a 5c edge on a
                    // 30c contract is worth five times a 5c edge on a 93c one.
                    let ev_dollars = (dollars / edge.price).floor() * edge.cents / 100.0;
                    let settle_ok = in_price_band(mode.price_bands, edge.price) && bets_settle < mode.settle_trades && now - last_settle_entry >= SETTLE_REENTRY_SECS && rem >= SETTLE_MIN_SECS_LEFT && edge.cents >= edge_floor && ev_dollars >= mode.min_ev_dollars && settle_p_win >= pwin_floor && est.known_prints >= known_floor && window_side.map_or(true, |w| w == edge.side.as_str());
                    let analytics_ok = !ctx.analytics_veto || (a_agrees && p_win >= pwin_floor);
                    if settle_ok && !analytics_ok && !veto_logged {
                        println!("[VETO] {} | settlement math: buy {} @ {:.1}c at {:.1}% | {} | no trade", ticker, edge.side.as_str().to_uppercase(), edge.price * 100.0, settle_p_win * 100.0, a_label);
                        veto_logged = true;
                    }
                    let falling = settle_ok && analytics_ok && mode.sharp_slot && side_is_falling(&mid_samples, edge.side, now);
                    if falling && !falling_logged {
                        println!("[FALLING] {} | {} @ {:.1}c has a falling price, no trade", ticker, edge.side.as_str().to_uppercase(), edge.price * 100.0);
                        falling_logged = true;
                    }
                    if settle_ok && analytics_ok && !falling {
                        let count = (dollars / edge.price).floor() as u32;
                        let allowed = { let b = ctx.book.lock().await; b.can_record("bot") && b.open_on(&ticker) < mode.bets_per_window && !(ctx.live && b.daily_stopped(ctx.daily_loss_limit)) };
                        if count >= 1 && allowed {
                            last_settle_entry = now;
                            let file_size = match &a_signal { ExecutionSignal::SnipeTaker { contracts, .. } => *contracts, _ => 0 };
                            let note = format!("settlement engine{} | {}s left | {}/60 prints known | est {:.2} ± {:.2} vs strike {:.2} | {} | analytics alone would size {} contracts", if sure && mode.kelly_mult <= 0.0 && mode.sure_mult > 1.0 { " | sure bet, stake raised" } else { "" }, rem as i64, est.known_prints, est.mean, est.sd, strike, a_label, file_size);
                            let p_yes_used = match edge.side { Side::Yes => p_win, Side::No => 1.0 - p_win };
                            if enter(ctx, &ticker, strike, close_ts, spot, p_yes_used, a_p.unwrap_or(est.p_yes), 0.0, edge, dollars, "BTC 15 min (last minute)", "settle", &note).await {
                                bets_settle += 1;
                                window_side = Some(edge.side.as_str());
                            }
                        }
                    }
                }
            } else if now - last_print >= 5 {
                println!("[SETTLE] {} | {}s left | BRTI feed {} | yes {}c/{}c", ticker, rem as i64, if feed_fresh { "ok, warming up" } else { "STALE" },
                    yes_bid.map_or("-".into(), |b| format!("{:.0}", b * 100.0)), yes_ask.map_or("-".into(), |a| format!("{:.0}", a * 100.0)));
                last_print = now;
            }
            continue;
        }

        // ---- early engine -----------------------------------------------------------
        if spot <= 0.0 {
            continue;
        }
        let horizon = (rem - SETTLEMENT_LEAD_SECS).max(5.0);
        let (sigma, momentum) = {
            let v = ctx.vol.lock().unwrap();
            (v.sigma_for(horizon), v.momentum(MOMENTUM_LOOKBACK_SECS))
        };
        let Some(sigma) = sigma else {
            if now - last_print >= 15 {
                println!("[*] waiting for volatility data...");
                last_print = now;
            }
            continue;
        };
        let p_gbm = clamp_prob(prob_above(spot, strike, sigma));
        let mom = momentum.unwrap_or(0.0);
        let p_raw = prob_above(spot * (ctx.momentum_weight * mom).exp(), strike, sigma);
        let market_mid = match (yes_ask, yes_bid) {
            (Some(a), Some(b)) => Some((a + b) / 2.0),
            (a, b) => a.or(b),
        };
        let p_yes = clamp_prob(match market_mid {
            Some(m) => m + ctx.model_weight * (clamp_prob(p_raw) - m),
            None => p_raw,
        });
        let edge = best_edge(p_yes, yes_ask, no_ask).filter(|e| tradable_price(e.price) && !clamp_binding(p_raw));

        if now - last_print >= 15 {
            println!(
                "[TICK] {} | {}s left | spot {:.2} vs strike {:.2} ({:+.3}%) | gbm {:.1}% mom {:+.3}% -> model P(up) {:.1}% | yes {}c/{}c | best {} {:+.2}c | {}",
                ticker, rem as i64, spot, strike, (spot / strike - 1.0) * 100.0, p_gbm * 100.0, mom * 100.0, p_yes * 100.0,
                yes_bid.map_or("-".into(), |b| format!("{:.0}", b * 100.0)),
                yes_ask.map_or("-".into(), |a| format!("{:.0}", a * 100.0)),
                edge.map_or("-".into(), |e| e.side.as_str().to_uppercase()), edge.map_or(0.0, |e| e.cents), mode.name
            );
            last_print = now;
        }
        if now - last_status >= 15 {
            if let Some(s) = &ctx.supa {
                s.event(json!({
                    "kind": "status", "source": "bot", "mode": ctx.mode_label(), "live": ctx.live,
                    "ticker": ticker, "close_time": chrono::DateTime::from_timestamp(close_ts, 0).map(|d| d.to_rfc3339()),
                    "seconds_to_close": rem as i64, "spot": spot, "strike": strike, "vol_window": sigma,
                    "yes_bid_cents": yes_bid.map(|b| (b * 100.0).round() as i64),
                    "yes_ask_cents": yes_ask.map(|a| (a * 100.0).round() as i64),
                    "no_ask_cents": no_ask.map(|a| (a * 100.0).round() as i64),
                    "model_prob": p_yes,
                    "edge_cents": edge.map(|e| e.cents),
                    "side": edge.map(|e| e.side.as_str()),
                    "price_cents": edge.map(|e| (e.price * 100.0).round() as i64),
                    "message": format!("gbm {:.1}% | 2m momentum {:+.3}% | momentum weight {:.2} | model weight {:.2}", p_gbm * 100.0, mom * 100.0, ctx.momentum_weight, ctx.model_weight),
                }));
            }
            last_status = now;
        }

        let Some(edge) = edge else { continue };
        let in_window = rem >= mode.min_secs_left && rem <= mode.max_secs_left;
        if !mode.early_engine || bets_early >= mode.bets_per_window || !in_window || edge.cents < mode.min_edge_cents || now - last_early_attempt < SETTLE_REENTRY_SECS {
            continue;
        }
        let allowed = { let b = ctx.book.lock().await; b.can_record("bot") && b.open_on(&ticker) < mode.bets_per_window && !(ctx.live && b.daily_stopped(ctx.daily_loss_limit)) };
        // Sized by the odds it just computed, never the mode's whole cap.
        let early_p_win = match edge.side { Side::Yes => p_yes, Side::No => 1.0 - p_yes };
        let early_dollars = settle_size(&mode, early_p_win, edge.price, ctx.bankroll_dollars, false);
        if !allowed || (early_dollars / edge.price).floor() < 1.0 || !in_price_band(mode.price_bands, edge.price) {
            continue;
        }
        last_early_attempt = now;
        let note = format!("early engine | {}s left | gbm {:.1}% | momentum {:+.3}% | model weight {:.2}", rem as i64, p_gbm * 100.0, mom * 100.0, ctx.model_weight);
        if enter(ctx, &ticker, strike, close_ts, spot, p_yes, p_gbm, mom, edge, early_dollars, "BTC 15 min", "vitaegis", &note).await {
            bets_early += 1;
        }
    }

    // The window closed: read the settlement value off the feed and score the estimates.
    if !calib.is_empty() {
        sleep(Duration::from_secs(5)).await;
        let settled = {
            let b = ctx.brti.lock().unwrap();
            b.rolling_at_time(close_ts)
        };
        if let Some(s) = settled {
            let outcome = if s >= strike { "YES" } else { "NO" };
            println!("[SETTLE CHECK] {} settled {:.2} vs strike {:.2} -> {}", ticker, s, strike, outcome);
            let mut lines = Vec::new();
            for (secs, mean, sd, p, a) in &calib {
                let z = if *sd > 0.0 { (s - mean) / sd } else { 0.0 };
                let called = if *p >= 0.5 { "YES" } else { "NO" };
                let a_called = a.map(|x| if x >= 0.5 { "YES" } else { "NO" });
                lines.push(format!("{}s: est {:.2} ± {:.2} (z {:+.2}) P(up) {:.0}% -> called {} {} [analytics {} {}]", secs, mean, sd, z, p * 100.0, called, if called == outcome { "ok" } else { "MISS" },
                    a.map_or("-".to_string(), |x| format!("{:.0}%", x * 100.0)), a_called.map_or("-", |c| if c == outcome { "ok" } else { "MISS" })));
                let _ = std::fs::OpenOptions::new().create(true).append(true).open("settle_calib.jsonl").and_then(|mut f| {
                    use std::io::Write;
                    writeln!(f, "{}", json!({ "ticker": ticker, "strike": strike, "settled": s, "secs_left": secs, "mean": mean, "sd": sd, "p_yes": p, "z": z, "correct": called == outcome, "analytics_p_yes": a, "analytics_correct": a_called.map(|c| c == outcome) }))
                });
            }
            for l in &lines {
                println!("               {}", l);
            }
            if let Some(sup) = &ctx.supa {
                sup.event(json!({ "kind": "status", "source": "bot", "mode": ctx.mode_label(), "live": ctx.live, "ticker": ticker, "strike": strike, "spot": s,
                    "seconds_to_close": 0, "message": format!("settled {:.2} ({}) | {}", s, outcome, lines.join(" | ")) }));
            }
        }
    }
    Ok(())
}

/// Record a trade, placing it first when live. True when a position now exists.
#[allow(clippy::too_many_arguments)]
async fn enter(
    ctx: &Arc<Ctx>,
    ticker: &str,
    strike: f64,
    close_ts: i64,
    spot: f64,
    p_yes: f64,
    p_gbm: f64,
    momentum: f64,
    edge: models::Edge,
    dollars: f64,
    title: &str,
    tag: &str,
    note: &str,
) -> bool {
    let now = chrono::Utc::now().timestamp();
    let limit = if ctx.live { ioc_limit(edge.price) } else { edge.price };
    let mut count = (dollars / limit).floor() as u32;
    let mut price = edge.price;
    let mut fee = taker_fee(edge.price) * count as f64;
    let client_order_id = format!("{}-{}-{}", tag, ticker, chrono::Utc::now().timestamp_millis());
    println!(
        "[SIGNAL] {} | buy {} x{} @ {:.1}c (${:.2}, fee ${:.2}) | P(win) {:.1}% | edge {:+.2}c | {} | {}",
        ticker, edge.side.as_str().to_uppercase(), count, price * 100.0, count as f64 * price, fee,
        match edge.side { Side::Yes => p_yes, Side::No => 1.0 - p_yes } * 100.0, edge.cents, note, ctx.mode_label()
    );
    let order_id = if ctx.live {
        match place_order(ctx, ticker, edge.side, limit, count, &client_order_id).await {
            Ok(fill) if fill.filled <= 0.0 => {
                println!("[LIVE] order {} got no fill up to {:.1}c (ask was {:.1}c): the book moved, nothing bought", fill.order_id, limit * 100.0, edge.price * 100.0);
                if let Some(s) = &ctx.supa {
                    s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": true, "ticker": ticker, "message": format!("no fill up to {:.1}c, ask was {:.1}c (book moved), nothing bought", limit * 100.0, edge.price * 100.0) }));
                }
                return false;
            }
            Ok(fill) => {
                // Whole contracts on the record; fills smaller than one still count as one.
                count = (fill.filled.round() as u32).max(1);
                if let Some(avg) = fill.average_price {
                    price = v2_fill_cost(edge.side, avg, limit);
                }
                fee = match fill.fee_per_contract {
                    Some(per) => per * fill.filled,
                    None => taker_fee(price) * fill.filled,
                };
                println!("[LIVE ORDER] {} filled {:.2} @ {:.2}c, fee ${:.2} -> order {}", ticker, fill.filled, price * 100.0, fee, fill.order_id);
                Some(fill.order_id)
            }
            Err(e) => {
                eprintln!("[!] Order failed: {}", e);
                if let Some(s) = &ctx.supa {
                    s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": true, "ticker": ticker, "message": format!("order: {}", e) }));
                }
                return false;
            }
        }
    } else {
        println!("[PAPER] would buy {} {} x{} @ {:.1}c (LIVE_TRADING=false)", edge.side.as_str().to_uppercase(), ticker, count, price * 100.0);
        None
    };
    ctx.book.lock().await.record(
        Trade {
            mode: ctx.mode_label(),
            source: "bot".into(),
            ticker: ticker.to_string(),
            title: title.to_string(),
            side: edge.side.as_str().into(),
            price,
            count,
            cost: count as f64 * price,
            fee,
            model_prob: p_yes,
            gbm_prob: p_gbm,
            momentum,
            edge_cents: edge.cents,
            spot,
            strike,
            placed_ts: now,
            close_ts,
            client_order_id,
            order_id,
            result: None,
            pnl: None,
            note: String::new(),
        },
        ctx.supa.as_ref(),
        note,
    );
    true
}

/// What an immediate-or-cancel order did, final as soon as the call returns.
struct Fill {
    order_id: String,
    filled: f64,
    average_price: Option<f64>,
    fee_per_contract: Option<f64>,
}

/// Buy `side` through the V2 order API. Immediate-or-cancel: it takes what is available at
/// `cost` or better and the rest is cancelled, so nothing can rest and fill unrecorded.
async fn place_order(ctx: &Ctx, ticker: &str, side: Side, cost: f64, count: u32, client_order_id: &str) -> Result<Fill, Box<dyn std::error::Error>> {
    let path = "/trade-api/v2/portfolio/events/orders";
    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let signature = sign_message(&ctx.pem_path, &format!("{}POST{}", ts, path))?;
    let (book_side, price) = v2_order_terms(side, cost);
    let body = json!({
        "ticker": ticker,
        "client_order_id": client_order_id,
        "side": book_side,
        "count": format!("{}.00", count),
        "price": price,
        "time_in_force": "immediate_or_cancel",
        "self_trade_prevention_type": "taker_at_cross",
    });
    let resp = ctx
        .client
        .post(format!("{}/portfolio/events/orders", ctx.rest_base))
        .header("KALSHI-ACCESS-KEY", &ctx.api_key_id)
        .header("KALSHI-ACCESS-SIGNATURE", &signature)
        .header("KALSHI-ACCESS-TIMESTAMP", &ts)
        .json(&body)
        .send()
        .await?;
    let status = resp.status();
    let v: serde_json::Value = resp.json().await.unwrap_or(json!({}));
    if !status.is_success() {
        return Err(format!("{} {}", status, v).into());
    }
    let dollars = |k: &str| v[k].as_str().and_then(|x| x.parse::<f64>().ok());
    Ok(Fill {
        order_id: v["order_id"].as_str().unwrap_or("unknown").to_string(),
        filled: dollars("fill_count").ok_or_else(|| format!("no fill_count in order response: {}", v))?,
        average_price: dollars("average_fill_price"),
        fee_per_contract: dollars("average_fee_paid"),
    })
}

fn sign_message(pem_path: &str, msg: &str) -> Result<String, Box<dyn std::error::Error>> {
    let pem = fs::read_to_string(pem_path)?;
    let clean = pem.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der = base64::engine::general_purpose::STANDARD.decode(clean)?;
    let key = if pem.contains("BEGIN RSA PRIVATE KEY") {
        ring::signature::RsaKeyPair::from_der(&der)
    } else {
        ring::signature::RsaKeyPair::from_pkcs8(&der)
    }
    .map_err(|e| format!("invalid private key at {}: {:?}", pem_path, e))?;
    let mut sig = vec![0; key.public().modulus_len()];
    key.sign(&ring::signature::RSA_PSS_SHA256, &ring::rand::SystemRandom::new(), msg.as_bytes(), &mut sig)
        .map_err(|e| format!("{:?}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&sig))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_stakes_are_flat_unless_a_sure_bet_multiplier_is_set() {
        let mut m = mode_params("NORMAL");
        assert_eq!(settle_size(&m, 0.97, 0.90, 100.0, true), m.max_order_dollars);
        m.sure_mult = 2.0;
        assert_eq!(settle_size(&m, 0.85, 0.80, 100.0, false), m.max_order_dollars);
        assert_eq!(settle_size(&m, 0.97, 0.90, 100.0, true), m.max_order_dollars * 2.0);
    }

    #[test]
    fn normal_makes_up_to_two_sharp_trades_a_window() {
        std::env::remove_var("BETS_PER_WINDOW");
        let m = mode_params("NORMAL");
        assert_eq!((m.bets_per_window, m.settle_trades), (2, 0));
        assert_eq!(SHARP_CHECKS_SECS_LEFT, &[120.0, 60.0]);
    }

    #[test]
    fn live_orders_are_sent_a_little_above_the_ask_and_sized_to_that_limit() {
        assert!((ioc_limit(0.75) - 0.77).abs() < 1e-9);
        assert!((ioc_limit(0.98) - 0.99).abs() < 1e-9);
        assert_eq!((5.0 / ioc_limit(0.75)).floor() as u32, 6);
    }

    #[test]
    fn sharp_slot_buys_the_side_that_rose() {
        let up = sharp_entry(0.30, 0.59, 0.60).unwrap();
        assert!(matches!(up.side, Side::Yes));
        assert!((up.price - 0.60).abs() < 1e-9);
        let down = sharp_entry(-0.30, 0.39, 0.40).unwrap();
        assert!(matches!(down.side, Side::No));
        assert!((down.price - 0.61).abs() < 1e-9);
        assert!((down.p_yes - (1.0 - 0.61 - SHARP_EDGE)).abs() < 1e-9);
    }

    #[test]
    fn sharp_slot_needs_a_rise_and_price_that_fit_a_rule() {
        assert!(sharp_entry(0.09, 0.74, 0.75).is_none());
        assert!(sharp_entry(0.10, 0.74, 0.75).is_some());
        assert!(sharp_entry(-0.10, 0.25, 0.26).is_some());
        assert!(sharp_entry(0.09, 0.69, 0.70).is_none());
        assert!(sharp_entry(0.10, 0.69, 0.70).is_some());
        assert!(sharp_entry(0.17, 0.59, 0.60).is_none());
        assert!(sharp_entry(0.18, 0.59, 0.60).is_some());
        assert!(sharp_entry(0.30, 0.82, 0.83).is_none());
        assert!(sharp_entry(0.30, 0.48, 0.49).is_none());
        assert!(sharp_entry(-0.30, 0.10, 0.11).is_none());
    }

    #[test]
    fn sharp_slot_only_trades_with_positive_expected_profit() {
        let e = sharp_entry(0.30, 0.49, 0.50).unwrap();
        assert!(e.cents > 0.0 && e.cents < SHARP_EDGE * 100.0);
    }

    #[test]
    fn risk_sizes_by_kelly_whatever_the_sure_flag_says() {
        let m = mode_params("RISK");
        assert_eq!(settle_size(&m, 0.97, 0.90, 100.0, true), settle_size(&m, 0.97, 0.90, 100.0, false));
    }

    #[test]
    fn every_sharp_rule_expects_a_profit_at_both_ends_of_its_prices() {
        for (rise, lo, hi) in SHARP_RULES {
            for price in [*lo, *hi] {
                assert!(sharp_entry(*rise, price - 0.01, price).is_some(), "{price}");
            }
        }
    }

    #[test]
    fn sharp_move_measures_the_last_60_seconds() {
        let now = 1_000;
        let samples: VecDeque<(i64, f64)> = [(now - 60, 0.60), (now - 30, 0.65), (now, 0.72)].into_iter().collect();
        assert!((sharp_move(&samples, now).unwrap() - 0.12).abs() < 1e-9);
    }

    #[test]
    fn sharp_move_needs_nearly_60_seconds_of_prices() {
        let now = 1_000;
        let samples: VecDeque<(i64, f64)> = [(now - 40, 0.60), (now, 0.72)].into_iter().collect();
        assert!(sharp_move(&samples, now).is_none());
    }

    #[test]
    fn normal_last_90_floor_defaults_to_the_75_percent_target() {
        std::env::remove_var("SETTLE_MIN_PWIN");
        assert_eq!(mode_params("NORMAL").settle_min_pwin, 0.75);
    }

    #[test]
    fn never_buys_a_side_with_a_falling_price() {
        let now = 1_000;
        let down: VecDeque<(i64, f64)> = vec![(now - 25, 0.60), (now - 10, 0.56), (now, 0.54)].into();
        assert!(side_is_falling(&down, Side::Yes, now));
        assert!(!side_is_falling(&down, Side::No, now));
        let up: VecDeque<(i64, f64)> = vec![(now - 25, 0.54), (now, 0.60)].into();
        assert!(!side_is_falling(&up, Side::Yes, now));
        assert!(side_is_falling(&up, Side::No, now));
        let flat: VecDeque<(i64, f64)> = vec![(now - 25, 0.60), (now, 0.60)].into();
        assert!(!side_is_falling(&flat, Side::Yes, now));
    }

    #[test]
    fn too_little_price_history_counts_as_falling() {
        let now = 1_000;
        let short: VecDeque<(i64, f64)> = vec![(now - 5, 0.54), (now, 0.60)].into();
        assert!(side_is_falling(&short, Side::Yes, now));
        assert!(side_is_falling(&VecDeque::new(), Side::Yes, now));
    }

    #[test]
    fn risk_has_no_price_ranges() {
        let bands = mode_params("RISK").price_bands;
        assert!(in_price_band(bands, 0.65) && in_price_band(bands, 0.95));
    }

    #[test]
    fn only_normal_runs_the_sharp_slot() {
        assert!(mode_params("NORMAL").sharp_slot);
        assert!(!mode_params("RISK").sharp_slot);
    }

    #[test]
    fn normal_keeps_the_early_engine_off() {
        assert!(!mode_params("NORMAL").early_engine);
    }
}
