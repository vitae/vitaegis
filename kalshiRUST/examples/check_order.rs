//! Live-order preflight, for you to run before the bot trades real money:
//!
//!   cargo run --release --example check_order
//!
//! It sends ONE immediate-or-cancel order for ONE contract through the V2 order API, at a
//! price the book is nowhere near (1 cent on the side trading above 50 cents), so it should
//! come back with nothing filled and nothing left resting. That proves the signature, the
//! order shape and the response parsing. Maximum possible cost: about $0.01.
use base64::Engine as _;
use serde_json::{json, Value};
use std::{env, fs};

fn sign(pem_path: &str, msg: &str) -> Result<String, Box<dyn std::error::Error>> {
    let pem = fs::read_to_string(pem_path)?;
    let clean = pem.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der = base64::engine::general_purpose::STANDARD.decode(clean)?;
    let key = if pem.contains("BEGIN RSA PRIVATE KEY") {
        ring::signature::RsaKeyPair::from_der(&der)
    } else {
        ring::signature::RsaKeyPair::from_pkcs8(&der)
    }
    .map_err(|e| format!("{:?}", e))?;
    let mut sig = vec![0; key.public().modulus_len()];
    key.sign(&ring::signature::RSA_PSS_SHA256, &ring::rand::SystemRandom::new(), msg.as_bytes(), &mut sig).map_err(|e| format!("{:?}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&sig))
}

struct Api {
    client: reqwest::Client,
    base: String,
    key_id: String,
    pem: String,
}

impl Api {
    async fn call(&self, method: reqwest::Method, path: &str, body: Option<Value>) -> Result<(u16, Value), Box<dyn std::error::Error>> {
        let ts = chrono::Utc::now().timestamp_millis().to_string();
        let signed_path = path.split('?').next().unwrap_or(path);
        let sig = sign(&self.pem, &format!("{}{}/trade-api/v2{}", ts, method.as_str(), signed_path))?;
        let mut req = self
            .client
            .request(method, format!("{}{}", self.base, path))
            .header("KALSHI-ACCESS-KEY", &self.key_id)
            .header("KALSHI-ACCESS-SIGNATURE", sig)
            .header("KALSHI-ACCESS-TIMESTAMP", ts);
        if let Some(b) = body {
            req = req.json(&b);
        }
        let resp = req.send().await?;
        let status = resp.status().as_u16();
        let v: Value = resp.json().await.unwrap_or(json!({}));
        Ok((status, v))
    }

    async fn balance(&self) -> Result<f64, Box<dyn std::error::Error>> {
        let (s, v) = self.call(reqwest::Method::GET, "/portfolio/balance", None).await?;
        if s != 200 {
            return Err(format!("balance {} {}", s, v).into());
        }
        Ok(v["balance_dollars"].as_str().and_then(|x| x.parse().ok()).or_else(|| v["balance"].as_f64().map(|c| c / 100.0)).unwrap_or(0.0))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let env_type = env::var("KALSHI_ENVIRONMENT").unwrap_or_else(|_| "demo".into());
    let api = Api {
        client: reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build()?,
        base: if env_type == "production" { "https://api.elections.kalshi.com/trade-api/v2".into() } else { "https://demo-api.kalshi.co/trade-api/v2".into() },
        key_id: env::var("KALSHI_API_KEY_ID")?,
        pem: env::var("KALSHI_PRIVATE_KEY_PATH")?,
    };
    let before = api.balance().await?;
    println!("[1/4] environment {} | balance ${:.2}", env_type, before);

    let (s, v) = api.call(reqwest::Method::GET, "/markets?series_ticker=KXBTC15M&status=open&limit=1", None).await?;
    let m = v["markets"].get(0).ok_or(format!("no open market ({} {})", s, v))?.clone();
    let ticker = m["ticker"].as_str().unwrap_or("").to_string();
    let yes_ask: f64 = m["yes_ask_dollars"].as_str().and_then(|x| x.parse().ok()).unwrap_or(0.5);
    // Buy whichever side is cheap in name only: a 1c bid on YES when YES trades high, or a
    // 1c NO (an ask at 0.99 on the YES book) when YES trades low. Neither can cross.
    let (side, price, label) = if yes_ask >= 0.5 { ("bid", "0.0100", "YES at 1c") } else { ("ask", "0.9900", "NO at 1c") };
    println!("[2/4] market {} | yes ask {:.1}c | testing {}", ticker, yes_ask * 100.0, label);

    let body = json!({
        "ticker": ticker,
        "client_order_id": format!("preflight-{}", chrono::Utc::now().timestamp_millis()),
        "side": side,
        "count": "1.00",
        "price": price,
        "time_in_force": "immediate_or_cancel",
        "self_trade_prevention_type": "taker_at_cross",
    });
    let (s, v) = api.call(reqwest::Method::POST, "/portfolio/events/orders", Some(body)).await?;
    println!("[3/4] POST /portfolio/events/orders -> {} {}", s, v);
    if s != 201 && s != 200 {
        println!("      REJECTED. The bot cannot trade until this is fixed; send me the line above.");
        return Ok(());
    }
    println!("      filled {} | remaining {}", v["fill_count"].as_str().unwrap_or("?"), v["remaining_count"].as_str().unwrap_or("?"));

    let after = api.balance().await?;
    println!("[4/4] balance ${:.2} -> ${:.2}", before, after);
    println!("Order path verified.");
    Ok(())
}
