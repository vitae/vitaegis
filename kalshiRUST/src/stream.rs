use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::{env, fs};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_tungstenite::tungstenite::handshake::client::Request;
use base64::{Engine as _, engine::general_purpose};

use crate::types::{MarketState, ModelFeatures};
use crate::models::PricingEngine;
use crate::risk::RiskManager;

pub async fn run_websocket_feed(target_ticker: String) -> Result<(), Box<dyn std::error::Error>> {
    let api_key_id = env::var("KALSHI_API_KEY_ID")?;
    let pem_path = env::var("KALSHI_PRIVATE_KEY_PATH")?;
    let env_type = env::var("KALSHI_ENVIRONMENT").unwrap_or_else(|_| "demo".to_string());

    let ws_url = if env_type == "production" {
        "wss://external-api-ws.kalshi.com/trade-api/ws/v2"
    } else {
        "wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2"
    };

    let timestamp = chrono::Utc::now().timestamp_millis().to_string();
    let msg_to_sign = format!("{}GET/trade-api/ws/v2", timestamp);
    let signature = sign_message(&pem_path, &msg_to_sign)?;

    let request = Request::builder()
        .method("GET")
        .uri(ws_url)
        .header("KALSHI-ACCESS-KEY", &api_key_id)
        .header("KALSHI-ACCESS-SIGNATURE", &signature)
        .header("KALSHI-ACCESS-TIMESTAMP", &timestamp)
        .header("Host", if env_type == "production" { "external-api-ws.kalshi.com" } else { "external-api-ws.demo.kalshi.co" })
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", tokio_tungstenite::tungstenite::handshake::client::generate_key())
        .body(())?;

    let (ws_stream, _) = connect_async(request).await?;
    println!("[+] Connected to Kalshi WebSocket stream: {}", ws_url);

    let (mut write, mut read) = ws_stream.split();

    let sub = json!({
        "id": 1,
        "cmd": "subscribe",
        "params": {
            "channels": ["ticker", "orderbook_delta"],
            "market_tickers": [target_ticker]
        }
    });

    write.send(Message::Text(sub.to_string())).await?;
    let risk_manager = RiskManager::new(10_000.0, 400.0);

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                    let msg_type = parsed["type"].as_str().unwrap_or("");
                    if msg_type == "ticker" || msg_type == "orderbook_delta" {
                        let ask_price = parsed["msg"]["yes_ask"].as_f64().unwrap_or(45.0) / 100.0;
                        let spot_price = parsed["msg"]["spot"].as_f64().unwrap_or(72485.0);

                        let state = MarketState {
                            ticker: target_ticker.clone(),
                            strike_price: 72_450.0,
                            spot_price,
                            open_price: 72_400.0,
                            time_to_expiry_secs: 350.0,
                            bid_price: parsed["msg"]["yes_bid"].as_f64().unwrap_or(42.0) / 100.0,
                            ask_price,
                            quote_age_seconds: 0.05,
                        };

                        let features = ModelFeatures {
                            signed_distance_from_strike: spot_price - state.strike_price,
                            realized_volatility_15m: 0.0018,
                            order_book_imbalance: 0.25,
                            btc_move_since_quote: 1.1,
                            quote_age_seconds: 0.05,
                            rsi_14: 58.0,
                            hour_cyclical_sin: 0.5,
                            hour_cyclical_cos: 0.86,
                        };

                        let gbm = PricingEngine::gbm_probability(&state, 0.65);
                        let ml = PricingEngine::ml_probability(&features);
                        let blended = (gbm * 0.4) + (ml * 0.6);

                        if risk_manager.validate_circuit_breakers() {
                            let size = risk_manager.calculate_kelly_size(blended, state.ask_price, 0.15);
                            if size > 0.0 {
                                println!("[SIGNAL] Blended Prob: {:.4} | Allocation: ", blended, size);
                            }
                        }
                    }
                }
            }
            Ok(Message::Ping(p)) => { let _ = write.send(Message::Pong(p)).await; }
            Err(e) => { eprintln!("WebSocket error: {}", e); break; }
            _ => {}
        }
    }
    Ok(())
}

fn sign_message(pem_path: &str, message: &str) -> Result<String, Box<dyn std::error::Error>> {
    let pem_contents = fs::read_to_string(pem_path)?;
    let base64_clean = pem_contents.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der_bytes = general_purpose::STANDARD.decode(base64_clean)?;
    let priv_key = ring::signature::RsaKeyPair::from_pkcs8(&der_bytes)?;
    let rng = ring::rand::SystemRandom::new();
    let mut signature = vec![0; priv_key.public().modulus_len()];
    priv_key.sign(&ring::signature::RSA_PSS_SHA256, &rng, message.as_bytes(), &mut signature)?;
    Ok(general_purpose::STANDARD.encode(&signature))
}
