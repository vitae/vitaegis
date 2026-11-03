use futures_util::{SinkExt, StreamExt};
use std::time::{Duration, Instant};
use reqwest::Client;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

const KALSHI_REST_URL: &str = "https://api.elections.kalshi.com/trade-api/v2/exchange/status";
const KALSHI_WS_URL: &str = "wss://api.elections.kalshi.com/trade-api/v2/websocket";
const ITERATIONS: usize = 10;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("==================================================");
    println!("  Kalshi Infrastructure Latency Benchmark Tool    ");
    println!("==================================================");

    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;

    println!("\n[1/2] Benchmarking HTTP REST round-trip times ({} requests)...", ITERATIONS);
    let mut rest_latencies = Vec::with_capacity(ITERATIONS);

    for i in 1..=ITERATIONS {
        let start = Instant::now();
        let res = client.get(KALSHI_REST_URL).send().await;
        let elapsed = start.elapsed();

        match res {
            Ok(response) => {
                let status = response.status();
                println!("  Request {}: HTTP {} in {:.2}ms", i, status, elapsed.as_secs_f64() * 1000.0);
                if status.is_success() {
                    rest_latencies.push(elapsed);
                }
            }
            Err(e) => eprintln!("  Request {} failed: {}", i, e),
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }

    if !rest_latencies.is_empty() {
        print_stats("HTTP REST", &rest_latencies);
    }

    println!("\n[2/2] Benchmarking WebSocket ping/pong ({} iterations)...", ITERATIONS);
    let start_connect = Instant::now();
    let ws_result = connect_async(KALSHI_WS_URL).await;
    let connect_elapsed = start_connect.elapsed();

    match ws_result {
        Ok((mut ws_stream, _)) => {
            println!("  WebSocket Handshake established in {:.2}ms", connect_elapsed.as_secs_f64() * 1000.0);
            let mut ws_latencies = Vec::with_capacity(ITERATIONS);

            for i in 1..=ITERATIONS {
                let ping_payload = format!("ping_test_{}", i);
                let start_ping = Instant::now();

                if let Err(e) = ws_stream.send(Message::Ping(ping_payload.as_bytes().to_vec())).await {
                    eprintln!("  Failed to send ping {}: {}", i, e);
                    break;
                }

                let mut received_ack = false;
                let timeout_limit = Duration::from_secs(2);
                let loop_start = Instant::now();

                while loop_start.elapsed() < timeout_limit {
                    match tokio::time::timeout(Duration::from_millis(100), ws_stream.next()).await {
                        Ok(Some(Ok(Message::Pong(_)))) | Ok(Some(Ok(Message::Text(_)))) => {
                            let rtt = start_ping.elapsed();
                            ws_latencies.push(rtt);
                            println!("  Ping/Pong {}: {:.2}ms", i, rtt.as_secs_f64() * 1000.0);
                            received_ack = true;
                            break;
                        }
                        Ok(Some(Ok(_))) => {}
                        _ => {}
                    }
                }
                if !received_ack {
                    eprintln!("  Ping {} timed out waiting for acknowledgment.", i);
                }
                tokio::time::sleep(Duration::from_millis(250)).await;
            }
            let _ = ws_stream.close(None).await;
            if !ws_latencies.is_empty() {
                print_stats("WebSocket Round-Trip", &ws_latencies);
            }
        }
        Err(e) => eprintln!("  WebSocket connection failed: {}", e),
    }

    Ok(())
}

fn print_stats(name: &str, samples: &[Duration]) {
    let mut sorted = samples.to_vec();
    sorted.sort();
    let count = sorted.len();
    let min = sorted.first().unwrap().as_secs_f64() * 1000.0;
    let max = sorted.last().unwrap().as_secs_f64() * 1000.0;
    let sum: f64 = sorted.iter().map(|d| d.as_secs_f64() * 1000.0).sum();
    let avg = sum / count as f64;
    let p99 = sorted[(count as f64 * 0.99).floor() as usize].as_secs_f64() * 1000.0;

    println!("\n--- {} Latency Summary ---", name);
    println!("  Samples : {}", count);
    println!("  Min     : {:.2}ms", min);
    println!("  Avg     : {:.2}ms", avg);
    println!("  P99     : {:.2}ms", p99);
    println!("  Max     : {:.2}ms", max);
}
