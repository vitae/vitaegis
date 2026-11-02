use kalshi_btc_bot::{models, paper, scanner, settle, supa, vol};

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use std::{env, fs};
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::tungstenite::handshake::client::Request;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use base64::Engine as _;

use models::{best_edge, clamp_binding, clamp_prob, prob_above, taker_fee, tradable_price, Side};
use paper::{Trade, TradeBook};
use scanner::ScanConfig;
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
    /// Highest price the settlement engine will pay in this mode.
    max_price: f64,
    /// Minimum expected profit, in dollars, on the stake it would put down.
    min_ev_dollars: f64,
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
            max_price: f("RISK_SETTLE_MAX_PRICE", 0.97),
            min_ev_dollars: f("RISK_MIN_EV_DOLLARS", 0.5),
        }
    } else {
        ModeParams {
            name: "NORMAL".into(),
            max_order_dollars: f("MAX_ORDER_DOLLARS", 25.0),
            min_edge_cents: f("MIN_EDGE_CENTS", 2.0),
            bets_per_window: 1,
            min_secs_left: f("MIN_SECS_LEFT", 90.0),
            max_secs_left: f("MAX_SECS_LEFT", 300.0),
            settle_min_pwin: f("SETTLE_MIN_PWIN", 0.9),
            settle_min_known: f("SETTLE_MIN_KNOWN", 0.0) as usize,
            settle_min_edge_cents: f("SETTLE_MIN_EDGE_CENTS", 2.0),
            settle_second_min_pwin: f("SETTLE_SECOND_MIN_PWIN", 0.95),
            settle_second_min_known: SETTLE_SECOND_MIN_KNOWN,
            kelly_mult: 0.0,
            // 62.5c is where a $5 stake pays at least $3.
            max_price: f("SETTLE_MAX_PRICE", BIG_WIN_MAX_PRICE),
            min_ev_dollars: f("MIN_EV_DOLLARS", 0.5),
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
    /// Bankroll for Kelly sizing: the env value, capped by the live balance when live.
    bankroll_dollars: f64,
    /// Stop opening live trades once today's realized loss reaches this many dollars.
    daily_loss_limit: f64,
}

/// Dollars for a settlement trade. A flat stake when the mode's Kelly multiple is 0
/// (NORMAL); otherwise that multiple of Kelly on the bankroll, where Kelly for a binary at
/// price p with win probability q is (q - p) / (1 - p), floored at $5 and capped by the mode.
fn settle_size(mode: &ModeParams, p_win: f64, price: f64, bankroll: f64) -> f64 {
    if mode.kelly_mult <= 0.0 {
        return mode.max_order_dollars;
    }
    let f_star = ((p_win - price) / (1.0 - price)).max(0.0);
    (mode.kelly_mult * bankroll * f_star).max(5.0).min(mode.max_order_dollars)
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

/// Contracts actually filled on a live order, from its status.
async fn filled_count(ctx: &Ctx, order_id: &str, count: u32) -> Result<(u32, String), Box<dyn std::error::Error>> {
    let v = kalshi_get(&ctx.client, ctx.rest_base, &ctx.api_key_id, &ctx.pem_path, &format!("/portfolio/orders/{}", order_id)).await?;
    let o = &v["order"];
    let remaining = o["remaining_count_fp"].as_str().and_then(|s| s.parse::<f64>().ok()).or_else(|| o["remaining_count"].as_f64()).unwrap_or(count as f64);
    let status = o["status"].as_str().unwrap_or("?").to_string();
    Ok(((count as f64 - remaining).max(0.0).round() as u32, status))
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
    let daily_loss_limit: f64 = env::var("DAILY_LOSS_LIMIT_DOLLARS").ok().and_then(|v| v.parse().ok()).unwrap_or(100.0);
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
    let bot_limit: usize = env::var("PAPER_TRADE_LIMIT").ok().and_then(|v| v.parse().ok()).unwrap_or(8);
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
        bankroll_dollars: bankroll,
        daily_loss_limit,
    });

    {
        let b = ctx.book.lock().await;
        let m = ctx.mode();
        println!(
            "[+] {} | mode {} (${:.0} max, {:.1}c min edge, {} bet/window, early engine {}-{}s before close, settlement engine: first trade needs P(win) >= {:.0}% on >= {} known prints) | 15m trades {}/{} logged, sniper {}/{}, {} pending",
            if live { "LIVE TRADING" } else { "PAPER (LIVE_TRADING=false)" },
            m.name, m.max_order_dollars, m.min_edge_cents, m.bets_per_window, m.min_secs_left as i64, m.max_secs_left as i64, m.settle_min_pwin * 100.0, m.settle_min_known,
            b.count_source("bot"), bot_limit, b.count_source("sniper"), sniper_limit, b.pending()
        );
    }

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
            "host_name": env::var("COMPUTERNAME").or_else(|_| env::var("HOSTNAME")).unwrap_or_else(|_| "bot".into()),
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
                    "host_name": env::var("COMPUTERNAME").or_else(|_| env::var("HOSTNAME")).unwrap_or_else(|_| "bot".into()),
                    "host_status": "running",
                    "host_seen_at": chrono::Utc::now().to_rfc3339(),
                }));
                sleep(Duration::from_secs(10)).await;
            }
        });
    }

    // Sniper: every 60 s, paper only.
    {
        let c = ctx.clone();
        let rx = spot_rx.clone();
        tokio::spawn(async move {
            let cfg = ScanConfig::from_env();
            sleep(Duration::from_secs(15)).await;
            loop {
                let spot = *rx.borrow();
                let mode = c.mode().name;
                scanner::scan(&c.client, c.rest_base, &c.vol, spot, c.supa.as_ref(), &c.book, &cfg, &mode, false).await;
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
    let mut last_status = 0i64;
    let mut last_print = 0i64;
    let mut calib: Vec<(i64, f64, f64, f64)> = Vec::new();
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
            let anchor_label = anchor.map_or("-".to_string(), |a| if a.from_coinbase { format!("coinbase+basis {:.2} ({:.1}s old)", a.price, a.age) } else { format!("brti print {:.2} ({:.1}s old)", a.price, a.age) });
            if let Some(est) = est {
                if let Some(mark) = calib_marks.first().copied() {
                    if rem <= mark as f64 {
                        calib.push((rem as i64, est.mean, est.sd, est.p_yes));
                        calib_marks.remove(0);
                    }
                }
                let edge = best_edge(est.p_yes, yes_ask, no_ask).filter(|e| e.price >= 0.05 && e.price <= mode.max_price);
                if now - last_print >= 5 {
                    println!(
                        "[SETTLE] {} | {}s left | known {}/60 | est {:.2} ± {:.2} vs strike {:.2} ({:+.2}) | P(up) {:.1}% | yes {}c/{}c | best {} {:+.2}c | sigma1s {:.4}% | anchor {}",
                        ticker, rem as i64, est.known_prints, est.mean, est.sd, strike, est.mean - strike, est.p_yes * 100.0,
                        yes_bid.map_or("-".into(), |b| format!("{:.0}", b * 100.0)), yes_ask.map_or("-".into(), |a| format!("{:.0}", a * 100.0)),
                        edge.map_or("-".into(), |e| e.side.as_str().to_uppercase()), edge.map_or(0.0, |e| e.cents), sigma_1s * 100.0, anchor_label
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
                            "message": format!("settlement engine | {}/60 prints known | est {:.2} ± {:.2} | strike {:.2}", est.known_prints, est.mean, est.sd, strike),
                        }));
                    }
                    last_status = now;
                }
                if let Some(edge) = edge {
                    let p_win = match edge.side { Side::Yes => est.p_yes, Side::No => 1.0 - est.p_yes };
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
                    let dollars = settle_size(&mode, p_win, edge.price, ctx.bankroll_dollars);
                    // Expected profit on the whole stake: what ranks trades, since a 5c edge on a
                    // 30c contract is worth five times a 5c edge on a 93c one.
                    let ev_dollars = (dollars / edge.price).floor() * edge.cents / 100.0;
                    if bets_settle < mode.bets_per_window && now - last_settle_entry >= SETTLE_REENTRY_SECS && rem >= SETTLE_MIN_SECS_LEFT && edge.cents >= edge_floor && ev_dollars >= mode.min_ev_dollars && p_win >= pwin_floor && est.known_prints >= known_floor {
                        let count = (dollars / edge.price).floor() as u32;
                        let allowed = { let b = ctx.book.lock().await; b.can_record("bot") && b.open_on(&ticker) < mode.bets_per_window && !(ctx.live && b.daily_stopped(ctx.daily_loss_limit)) };
                        if count >= 1 && allowed {
                            bets_settle += 1;
                            last_settle_entry = now;
                            let note = format!("settlement engine | {}s left | {}/60 prints known | est {:.2} ± {:.2} vs strike {:.2}", rem as i64, est.known_prints, est.mean, est.sd, strike);
                            enter(ctx, &ticker, strike, close_ts, spot, est.p_yes, est.p_yes, 0.0, edge, dollars, "BTC 15 min (last minute)", "settle", &note, 10).await;
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
        if bets_early >= mode.bets_per_window || !in_window || edge.cents < mode.min_edge_cents {
            continue;
        }
        let allowed = { let b = ctx.book.lock().await; b.can_record("bot") && b.open_on(&ticker) < mode.bets_per_window && !(ctx.live && b.daily_stopped(ctx.daily_loss_limit)) };
        if !allowed || (mode.max_order_dollars / edge.price).floor() < 1.0 {
            continue;
        }
        bets_early += 1;
        let note = format!("early engine | {}s left | gbm {:.1}% | momentum {:+.3}% | model weight {:.2}", rem as i64, p_gbm * 100.0, mom * 100.0, ctx.model_weight);
        enter(ctx, &ticker, strike, close_ts, spot, p_yes, p_gbm, mom, edge, mode.max_order_dollars, "BTC 15 min", "vitaegis", &note, 30).await;
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
            for (secs, mean, sd, p) in &calib {
                let z = if *sd > 0.0 { (s - mean) / sd } else { 0.0 };
                let called = if *p >= 0.5 { "YES" } else { "NO" };
                lines.push(format!("{}s: est {:.2} ± {:.2} (z {:+.2}) P(up) {:.0}% -> called {} {}", secs, mean, sd, z, p * 100.0, called, if called == outcome { "ok" } else { "MISS" }));
                let _ = std::fs::OpenOptions::new().create(true).append(true).open("settle_calib.jsonl").and_then(|mut f| {
                    use std::io::Write;
                    writeln!(f, "{}", json!({ "ticker": ticker, "strike": strike, "settled": s, "secs_left": secs, "mean": mean, "sd": sd, "p_yes": p, "z": z, "correct": called == outcome }))
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

/// Record a trade (and place it when live).
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
    order_ttl_secs: i64,
) {
    let now = chrono::Utc::now().timestamp();
    let mut count = (dollars / edge.price).floor() as u32;
    let mut cost = count as f64 * edge.price;
    let mut fee = taker_fee(edge.price) * count as f64;
    let price_cents = (edge.price * 100.0).round() as u32;
    let client_order_id = format!("{}-{}-{}", tag, ticker, chrono::Utc::now().timestamp_millis());
    println!(
        "[SIGNAL] {} | buy {} x{} @ {}c (${:.2}, fee ${:.2}) | P(win) {:.1}% | edge {:+.2}c | {} | {}",
        ticker, edge.side.as_str().to_uppercase(), count, price_cents, cost, fee,
        match edge.side { Side::Yes => p_yes, Side::No => 1.0 - p_yes } * 100.0, edge.cents, note, ctx.mode_label()
    );
    let order_id = if ctx.live {
        match place_order(ctx, ticker, edge.side, price_cents, count, &client_order_id, order_ttl_secs).await {
            Ok(id) => {
                println!("[LIVE ORDER] {} x{} @ {}c -> order {}", ticker, count, price_cents, id);
                // Paper assumed full fills; live records only what filled.
                sleep(Duration::from_millis(1500)).await;
                match filled_count(ctx, &id, count).await {
                    Ok((filled, status)) if filled == 0 => {
                        println!("[LIVE] order {} unfilled (status {}): nothing recorded", id, status);
                        if let Some(s) = &ctx.supa {
                            s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": true, "ticker": ticker, "message": format!("order {} unfilled ({}) at {}c", id, status, price_cents) }));
                        }
                        return;
                    }
                    Ok((filled, status)) => {
                        if filled < count {
                            println!("[LIVE] order {} partially filled: {}/{} (status {})", id, filled, count, status);
                        }
                        count = filled;
                        cost = count as f64 * edge.price;
                        fee = taker_fee(edge.price) * count as f64;
                    }
                    Err(e) => eprintln!("[!] Could not confirm fill for {} ({}); recording the full order", id, e),
                }
                Some(id)
            }
            Err(e) => {
                eprintln!("[!] Order failed: {}", e);
                if let Some(s) = &ctx.supa {
                    s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": true, "ticker": ticker, "message": format!("order: {}", e) }));
                }
                return;
            }
        }
    } else {
        println!("[PAPER] would buy {} {} x{} @ {}c (LIVE_TRADING=false)", edge.side.as_str().to_uppercase(), ticker, count, price_cents);
        None
    };
    ctx.book.lock().await.record(
        Trade {
            mode: ctx.mode_label(),
            source: "bot".into(),
            ticker: ticker.to_string(),
            title: title.to_string(),
            side: edge.side.as_str().into(),
            price: edge.price,
            count,
            cost,
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
}

async fn place_order(ctx: &Ctx, ticker: &str, side: Side, price_cents: u32, count: u32, client_order_id: &str, ttl_secs: i64) -> Result<String, Box<dyn std::error::Error>> {
    let path = "/trade-api/v2/portfolio/orders";
    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let signature = sign_message(&ctx.pem_path, &format!("{}POST{}", ts, path))?;
    let now = chrono::Utc::now().timestamp();
    let mut body = json!({
        "ticker": ticker,
        "action": "buy",
        "side": side.as_str(),
        "type": "limit",
        "count": count,
        "client_order_id": client_order_id,
        "expiration_ts": now + ttl_secs,
    });
    match side {
        Side::Yes => body["yes_price"] = json!(price_cents),
        Side::No => body["no_price"] = json!(price_cents),
    }
    let resp = ctx
        .client
        .post(format!("{}/portfolio/orders", ctx.rest_base))
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
    Ok(v["order"]["order_id"].as_str().unwrap_or("unknown").to_string())
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
