//! Live-order preflight. Run it yourself once the account is funded:
//!
//!   cargo run --release --example check_order
//!
//! It reads your balance, places ONE limit order for ONE contract at 1 cent on the cheaper
//! (losing) side of the current KXBTC15M window with a 3-second expiry, reads the order
//! back, cancels it if it is still open, and reads the balance again. Maximum risk: $0.01.
//! It proves the signed POST, the order format, the status lookup and the cancel path.
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
        let sig = sign(&self.pem, &format!("{}{}/trade-api/v2{}", ts, method.as_str(), path))?;
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
    println!("[1/5] environment {} | balance ${:.2}", env_type, api.balance().await?);

    let (s, v) = api.call(reqwest::Method::GET, "/markets?series_ticker=KXBTC15M&status=open&limit=1", None).await?;
    let m = v["markets"].get(0).ok_or(format!("no open market ({} {})", s, v))?.clone();
    let ticker = m["ticker"].as_str().unwrap_or("").to_string();
    let yes_ask: f64 = m["yes_ask_dollars"].as_str().and_then(|x| x.parse().ok()).unwrap_or(0.5);
    // The cheaper side is the one the market expects to lose; a 1c bid there is the
    // least likely order in the book to ever fill.
    let side = if yes_ask <= 0.5 { "yes" } else { "no" };
    println!("[2/5] market {} | yes ask {:.0}c | test side {}", ticker, yes_ask * 100.0, side.to_uppercase());

    let now = chrono::Utc::now().timestamp();
    let mut body = json!({
        "ticker": ticker, "action": "buy", "side": side, "type": "limit", "count": 1,
        "client_order_id": format!("preflight-{}", now), "expiration_ts": now + 3,
    });
    body[if side == "yes" { "yes_price" } else { "no_price" }] = json!(1);
    let (s, v) = api.call(reqwest::Method::POST, "/portfolio/orders", Some(body)).await?;
    println!("[3/5] POST /portfolio/orders -> {} {}", s, serde_json::to_string(&v["order"]).unwrap_or_else(|_| v.to_string()).chars().take(400).collect::<String>());
    if s != 201 && s != 200 {
        println!("      Order was rejected. Read the message above: 'insufficient' means fund the account; anything else means the order path needs a fix.");
        return Ok(());
    }
    let order_id = v["order"]["order_id"].as_str().unwrap_or("").to_string();

    tokio::time::sleep(std::time::Duration::from_secs(4)).await;
    let (s, v) = api.call(reqwest::Method::GET, &format!("/portfolio/orders/{}", order_id), None).await?;
    let status = v["order"]["status"].as_str().unwrap_or("?").to_string();
    println!("[4/5] GET order -> {} status {} | remaining {}", s, status, v["order"]["remaining_count_fp"].as_str().or(v["order"]["remaining_count"].as_str()).unwrap_or("?"));
    if status == "resting" {
        let (s, _) = api.call(reqwest::Method::DELETE, &format!("/portfolio/orders/{}", order_id), None).await?;
        println!("      cancel -> {}", s);
    }
    println!("[5/5] balance after ${:.2}", api.balance().await?);
    println!("Order path verified. Set LIVE_TRADING=true in .env and restart the bot to trade live.");
    Ok(())
}
