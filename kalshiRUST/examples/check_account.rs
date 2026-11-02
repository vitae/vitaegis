//! Read-only account check: balance, resting orders, open positions, recent fills.
//!
//!   cargo run --release --example check_account
use base64::Engine as _;
use serde_json::Value;
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

async fn get(client: &reqwest::Client, base: &str, key_id: &str, pem: &str, path: &str) -> Result<Value, Box<dyn std::error::Error>> {
    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let sig = sign(pem, &format!("{}GET/trade-api/v2{}", ts, path.split('?').next().unwrap_or(path)))?;
    let resp = client
        .get(format!("{}{}", base, path))
        .header("KALSHI-ACCESS-KEY", key_id)
        .header("KALSHI-ACCESS-SIGNATURE", sig)
        .header("KALSHI-ACCESS-TIMESTAMP", ts)
        .send()
        .await?;
    let status = resp.status();
    let v: Value = resp.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        return Err(format!("{} {}", status, v).into());
    }
    Ok(v)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let base = if env::var("KALSHI_ENVIRONMENT").unwrap_or_default() == "production" { "https://api.elections.kalshi.com/trade-api/v2" } else { "https://demo-api.kalshi.co/trade-api/v2" };
    let key_id = env::var("KALSHI_API_KEY_ID")?;
    let pem = env::var("KALSHI_PRIVATE_KEY_PATH")?;
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build()?;

    let bal = get(&client, base, &key_id, &pem, "/portfolio/balance").await?;
    println!("balance: ${} | portfolio value: ${}", bal["balance_dollars"].as_str().unwrap_or("?"), bal["portfolio_value_dollars"].as_str().or(bal["portfolio_value"].as_str()).unwrap_or("?"));

    let orders = get(&client, base, &key_id, &pem, "/portfolio/orders?status=resting&limit=50").await?;
    let list = orders["orders"].as_array().cloned().unwrap_or_default();
    println!("resting orders: {}", list.len());
    for o in &list {
        println!("  {} {} {} x{} @ {}c | remaining {} | id {}", o["ticker"].as_str().unwrap_or("?"), o["action"].as_str().unwrap_or("?"), o["side"].as_str().unwrap_or("?"),
            o["count_fp"].as_str().or(o["initial_count_fp"].as_str()).unwrap_or("?"),
            o["yes_price_dollars"].as_str().map(|s| s.to_string()).unwrap_or_else(|| o["yes_price"].to_string()),
            o["remaining_count_fp"].as_str().unwrap_or("?"), o["order_id"].as_str().unwrap_or("?"));
    }

    let positions = get(&client, base, &key_id, &pem, "/portfolio/positions?limit=50").await?;
    let mp = positions["market_positions"].as_array().cloned().unwrap_or_default();
    let open: Vec<&Value> = mp.iter().filter(|p| p["position_fp"].as_str().and_then(|s| s.parse::<f64>().ok()).map(|x| x != 0.0).or_else(|| p["position"].as_f64().map(|x| x != 0.0)).unwrap_or(false)).collect();
    println!("open positions: {} (of {} markets touched)", open.len(), mp.len());
    for p in &open {
        println!("  {} position {} | exposure ${} | realized pnl ${}", p["ticker"].as_str().unwrap_or("?"),
            p["position_fp"].as_str().map(|s| s.to_string()).unwrap_or_else(|| p["position"].to_string()),
            p["market_exposure_dollars"].as_str().unwrap_or("?"), p["realized_pnl_dollars"].as_str().unwrap_or("?"));
    }

    let fills = get(&client, base, &key_id, &pem, "/portfolio/fills?limit=20").await?;
    let fl = fills["fills"].as_array().cloned().unwrap_or_default();
    println!("recent fills: {}", fl.len());
    for f in fl.iter().take(20) {
        println!("  {} {} {} x{} @ {}c | {}", f["created_time"].as_str().unwrap_or("?"), f["ticker"].as_str().unwrap_or("?"), f["side"].as_str().unwrap_or("?"),
            f["count_fp"].as_str().unwrap_or("?"), f["yes_price_dollars"].as_str().map(|s| s.to_string()).unwrap_or_else(|| f["yes_price"].to_string()), f["action"].as_str().unwrap_or("?"));
    }
    Ok(())
}
