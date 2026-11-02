//! Read-only P&L report from Kalshi's own fills and settlements, compared with the bot's trades.jsonl.
//! Run it from the bot's working folder. The start time is RECONCILE_SINCE, or the first argument.
//!
//!   cargo run --release --example pnl_report -- 1793606400
use kalshi_btc_bot::paper::TradeBook;
use kalshi_btc_bot::reconcile;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let base = if env::var("KALSHI_ENVIRONMENT").unwrap_or_default() == "production" {
        "https://api.elections.kalshi.com/trade-api/v2"
    } else {
        "https://demo-api.kalshi.co/trade-api/v2"
    };
    let key_id = env::var("KALSHI_API_KEY_ID")?;
    let pem = env::var("KALSHI_PRIVATE_KEY_PATH")?;
    let since: i64 = env::args()
        .nth(1)
        .or_else(|| env::var("RECONCILE_SINCE").ok())
        .and_then(|v| v.parse().ok())
        .ok_or("give a start time in Unix seconds, or set RECONCILE_SINCE")?;
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build()?;
    let (fills, settlements) = reconcile::fetch(&client, base, &key_id, &pem, since).await?;

    println!("market | fills | YES | NO | cost | fees | result | net");
    for (ticker, p) in reconcile::positions(&fills) {
        let settled = settlements.iter().find(|s| s.ticker == ticker);
        println!(
            "{} | {} | {:.2} | {:.2} | ${:.2} | ${:.2} | {} | {}",
            ticker, p.fills, p.yes_count, p.no_count, p.cost, p.fees,
            settled.map_or("open", |s| s.result.as_str()),
            settled.map_or("-".to_string(), |s| format!("${:+.2}", p.net(&s.result)))
        );
    }

    let book = TradeBook::load("trades.jsonl", usize::MAX, usize::MAX);
    let now = chrono::Utc::now();
    let day_start = now.date_naive().and_hms_opt(0, 0, 0).map(|d| d.and_utc().timestamp()).unwrap_or(0);
    let r = reconcile::reconcile(&fills, &settlements, &book.trades, since, day_start, now.timestamp());
    println!("--------");
    println!("Kalshi's records: {} fills | {} settled markets | {} wins, {} losses", r.fills, r.settled_markets, r.wins, r.losses);
    println!("cost ${:.2} | fees ${:.2} | net ${:+.2} | today ${:+.2}", r.cost, r.fees, r.net, r.net_today);
    println!("the bot's book: {} settled live trades | net ${:+.2}", r.book_settled, r.book_net);
    println!("open positions: {}", if r.open_tickers.is_empty() { "none".to_string() } else { r.open_tickers.join(", ") });
    if r.problems.is_empty() {
        println!("MATCH: Kalshi's records and the bot's book agree");
    } else {
        println!("MISMATCH:");
        for p in &r.problems {
            println!("  {}", p);
        }
    }
    Ok(())
}
