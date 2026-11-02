use kalshi_btc_bot::{models, paper, scanner, supa, vol};

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
}

fn mode_params(name: &str) -> ModeParams {
    let f = |k: &str, d: f64| env::var(k).ok().and_then(|v| v.parse().ok()).unwrap_or(d);
    if name.eq_ignore_ascii_case("RISK") {
        ModeParams {
            name: "RISK".into(),
            max_order_dollars: f("RISK_MAX_ORDER_DOLLARS", 20.0),
            min_edge_cents: f("RISK_MIN_EDGE_CENTS", 1.0),
            bets_per_window: 2,
            min_secs_left: f("RISK_MIN_SECS_LEFT", 30.0),
            max_secs_left: f("RISK_MAX_SECS_LEFT", 420.0),
        }
    } else {
        ModeParams {
            name: "NORMAL".into(),
            max_order_dollars: f("MAX_ORDER_DOLLARS", 5.0),
            min_edge_cents: f("MIN_EDGE_CENTS", 2.0),
            bets_per_window: 2,
            min_secs_left: f("MIN_SECS_LEFT", 90.0),
            max_secs_left: f("MAX_SECS_LEFT", 300.0),
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
    let live = env::var("LIVE_TRADING").map(|v| v.eq_ignore_ascii_case("true")).unwrap_or(false);
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
        api_key_id: env::var("KALSHI_API_KEY_ID")?,
        pem_path: env::var("KALSHI_PRIVATE_KEY_PATH")?,
        supa,
        vol: vol::shared(),
        mode: Arc::new(std::sync::Mutex::new(initial_mode)),
        book: Arc::new(Mutex::new(TradeBook::load("trades.jsonl", bot_limit, sniper_limit))),
        momentum_weight: env::var("MOMENTUM_WEIGHT").ok().and_then(|v| v.parse().ok()).unwrap_or(0.3),
        model_weight: env::var("MODEL_WEIGHT").ok().and_then(|v| v.parse().ok()).unwrap_or(0.15),
    });

    {
        let b = ctx.book.lock().await;
        let m = ctx.mode();
        println!(
            "[+] {} | mode {} (${:.0} max, {:.1}c min edge, {} bet/window, enter {}-{}s before close) | 15m trades {}/{} logged, sniper {}/{}, {} pending",
            if live { "LIVE TRADING" } else { "PAPER (LIVE_TRADING=false)" },
            m.name, m.max_order_dollars, m.min_edge_cents, m.bets_per_window, m.min_secs_left as i64, m.max_secs_left as i64,
            b.count_source("bot"), bot_limit, b.count_source("sniper"), sniper_limit, b.pending()
        );
    }

    // Coinbase spot: feeds both the watch channel and the tick-vol estimator.
    let (spot_tx, spot_rx) = tokio::sync::watch::channel(0.0_f64);
    {
        let vol = ctx.vol.clone();
        tokio::spawn(async move {
            loop {
                if let Ok((stream, _)) = connect_async("wss://ws-feed.exchange.coinbase.com").await {
                    let (mut w, mut r) = stream.split();
                    let sub = json!({ "type": "subscribe", "product_ids": ["BTC-USD"], "channels": ["ticker"] });
                    if w.send(Message::Text(sub.to_string())).await.is_ok() {
                        while let Some(Ok(Message::Text(txt))) = r.next().await {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                if let Some(p) = v["price"].as_str().and_then(|s| s.parse::<f64>().ok()) {
                                    let _ = spot_tx.send(p);
                                    vol.lock().unwrap().push_tick(chrono::Utc::now().timestamp(), p);
                                }
                            }
                        }
                    }
                }
                sleep(Duration::from_secs(5)).await;
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
    loop {
        {
            let mut b = ctx.book.lock().await;
            b.settle(&ctx.client, ctx.rest_base, ctx.supa.as_ref()).await;
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

/// One 15-minute window: stream the ticker, price every quote, enter when the edge clears
/// the mode's bar inside its entry window.
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

    let mut bets_this_window = 0usize;
    let mut last_status = 0i64;
    let mut last_print = 0i64;

    while let Some(msg) = read.next().await {
        let now = chrono::Utc::now().timestamp();
        let rem = (close_ts - now) as f64;
        if rem <= 0.0 {
            break;
        }
        let Ok(Message::Text(txt)) = msg else { continue };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) else { continue };
        if v["type"].as_str() != Some("ticker") {
            continue;
        }
        let m = &v["msg"];
        let yes_ask = price_field(m, "yes_ask_dollars", "yes_ask");
        let yes_bid = price_field(m, "yes_bid_dollars", "yes_bid");
        let no_ask = yes_bid.map(|b| 1.0 - b);
        let spot = *spot_rx.borrow();
        if spot <= 0.0 {
            continue;
        }
        // Settlement is the average BRTI over the last minute before close, so the price
        // that matters is fixed ~30 s before close, not at close.
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
        // Late-window continuation: carry a fraction of the last two minutes' move forward.
        // The one signal that was positive across every published variant, though none of
        // those tests were out of sample, so the weight is small and both numbers are logged.
        let mom = momentum.unwrap_or(0.0);
        let p_raw = prob_above(spot * (ctx.momentum_weight * mom).exp(), strike, sigma);
        // The market's own mid, pulled toward the model by MODEL_WEIGHT (calibrated by the
        // backtest's walk-forward step). 1.0 trusts the model fully; 0 never disagrees.
        let market_mid = match (yes_ask, yes_bid) {
            (Some(a), Some(b)) => Some((a + b) / 2.0),
            (a, b) => a.or(b),
        };
        let p_yes = clamp_prob(match market_mid {
            Some(m) => m + ctx.model_weight * (clamp_prob(p_raw) - m),
            None => p_raw,
        });
        let edge = best_edge(p_yes, yes_ask, no_ask).filter(|e| tradable_price(e.price) && !clamp_binding(p_raw));
        let mode = ctx.mode();

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
                    "message": format!("gbm {:.1}% | 2m momentum {:+.3}% | weight {:.2}", p_gbm * 100.0, mom * 100.0, ctx.momentum_weight),
                }));
            }
            last_status = now;
        }

        let Some(edge) = edge else { continue };
        let in_window = rem >= mode.min_secs_left && rem <= mode.max_secs_left;
        if bets_this_window >= mode.bets_per_window || !in_window || edge.cents < mode.min_edge_cents {
            continue;
        }
        let count = (mode.max_order_dollars / edge.price).floor() as u32;
        if count == 0 {
            continue;
        }
        {
            let b = ctx.book.lock().await;
            if !b.can_record("bot") || b.has_open(&ticker) {
                continue;
            }
        }
        bets_this_window += 1;
        let cost = count as f64 * edge.price;
        let fee = taker_fee(edge.price) * count as f64;
        let price_cents = (edge.price * 100.0).round() as u32;
        let client_order_id = format!("vitaegis-{}-{}", ticker, chrono::Utc::now().timestamp_millis());
        println!(
            "[SIGNAL {}/{}] {} | buy {} x{} @ {}c (${:.2}, fee ${:.2}) | model {:.1}% | edge {:+.2}c | {}s left | {}",
            bets_this_window, mode.bets_per_window, ticker, edge.side.as_str().to_uppercase(), count, price_cents, cost, fee,
            p_yes * 100.0, edge.cents, rem as i64, ctx.mode_label()
        );
        let order_id = if ctx.live {
            match place_order(ctx, &ticker, edge.side, price_cents, count, &client_order_id).await {
                Ok(id) => {
                    println!("[LIVE ORDER] {} x{} @ {}c -> order {}", ticker, count, price_cents, id);
                    Some(id)
                }
                Err(e) => {
                    eprintln!("[!] Order failed: {}", e);
                    if let Some(s) = &ctx.supa {
                        s.event(json!({ "kind": "error", "mode": ctx.mode_label(), "live": true, "ticker": ticker, "message": format!("order: {}", e) }));
                    }
                    continue;
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
                ticker: ticker.clone(),
                title: "BTC 15 min".into(),
                side: edge.side.as_str().into(),
                price: edge.price,
                count,
                cost,
                fee,
                model_prob: p_yes,
                gbm_prob: p_gbm,
                momentum: mom,
                edge_cents: edge.cents,
                spot,
                strike,
                placed_ts: now,
                close_ts,
                client_order_id,
                order_id,
                result: None,
                pnl: None,
            },
            ctx.supa.as_ref(),
        );
    }
    Ok(())
}

async fn place_order(ctx: &Ctx, ticker: &str, side: Side, price_cents: u32, count: u32, client_order_id: &str) -> Result<String, Box<dyn std::error::Error>> {
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
        "expiration_ts": now + 30,
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
