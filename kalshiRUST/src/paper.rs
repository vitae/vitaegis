/// Every trade the bot takes, paper or live, from either the 15-minute engine ("bot") or
/// the market sniper ("sniper"): logged to trades.jsonl, settled against Kalshi's result,
/// mirrored to Supabase for the HUD. P&L is after the taker fee.
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;

use crate::supa::Supa;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub mode: String,
    #[serde(default = "default_source")]
    pub source: String,
    pub ticker: String,
    #[serde(default)]
    pub title: String,
    pub side: String,
    pub price: f64,
    pub count: u32,
    pub cost: f64,
    #[serde(default)]
    pub fee: f64,
    pub model_prob: f64,
    #[serde(default)]
    pub gbm_prob: f64,
    #[serde(default)]
    pub momentum: f64,
    #[serde(default)]
    pub edge_cents: f64,
    pub spot: f64,
    pub strike: f64,
    pub placed_ts: i64,
    pub close_ts: i64,
    #[serde(default)]
    pub client_order_id: String,
    #[serde(default)]
    pub order_id: Option<String>,
    #[serde(default)]
    pub result: Option<String>,
    #[serde(default)]
    pub pnl: Option<f64>,
    /// Why the engine entered, as shown on the HUD.
    #[serde(default)]
    pub note: String,
}

fn default_source() -> String {
    "bot".to_string()
}

impl Trade {
    pub fn live(&self) -> bool {
        self.mode.starts_with("LIVE")
    }
}

pub struct TradeBook {
    path: PathBuf,
    bot_limit: usize,
    sniper_limit: usize,
    pub trades: Vec<Trade>,
}

impl TradeBook {
    pub fn load(path: &str, bot_limit: usize, sniper_limit: usize) -> Self {
        let path = PathBuf::from(path);
        let trades = fs::read_to_string(&path)
            .map(|s| s.lines().filter_map(|l| serde_json::from_str(l).ok()).collect())
            .unwrap_or_default();
        Self { path, bot_limit, sniper_limit, trades }
    }

    fn save(&self) {
        let body: String = self.trades.iter().filter_map(|t| serde_json::to_string(t).ok()).map(|l| l + "\n").collect();
        if let Err(e) = fs::write(&self.path, body) {
            eprintln!("[!] Could not write {}: {}", self.path.display(), e);
        }
    }

    pub fn count_source(&self, source: &str) -> usize {
        self.trades.iter().filter(|t| t.source == source).count()
    }

    pub fn can_record(&self, source: &str) -> bool {
        let limit = if source == "sniper" { self.sniper_limit } else { self.bot_limit };
        self.count_source(source) < limit
    }

    pub fn bot_limit(&self) -> usize {
        self.bot_limit
    }

    pub fn has_open(&self, ticker: &str) -> bool {
        self.trades.iter().any(|t| t.ticker == ticker && t.result.is_none())
    }

    /// Open trades on one market, so a window can hold up to its mode's allowance.
    pub fn open_on(&self, ticker: &str) -> usize {
        self.trades.iter().filter(|t| t.ticker == ticker && t.result.is_none()).count()
    }

    pub fn open_count(&self, source: &str) -> usize {
        self.trades.iter().filter(|t| t.source == source && t.result.is_none()).count()
    }

    pub fn record(&mut self, mut trade: Trade, supa: Option<&Supa>, note: &str) {
        trade.note = note.to_string();
        if let Some(s) = supa {
            s.event(signal_row(&trade));
        }
        self.trades.push(trade);
        self.save();
        let src = &self.trades.last().unwrap().source;
        let limit = if src == "sniper" { self.sniper_limit } else { self.bot_limit };
        println!("[BOOK] {} trade {}/{} logged", src.to_uppercase(), self.count_source(src), limit);
    }

    pub fn pending(&self) -> usize {
        self.trades.iter().filter(|t| t.result.is_none()).count()
    }

    pub fn is_done(&self) -> bool {
        self.count_source("bot") >= self.bot_limit && self.pending() == 0
    }

    pub async fn settle(&mut self, client: &reqwest::Client, rest_base: &str, supa: Option<&Supa>) {
        let now = chrono::Utc::now().timestamp();
        let mut changed = false;
        for t in self.trades.iter_mut().filter(|t| t.result.is_none() && t.close_ts < now) {
            let url = format!("{}/markets/{}", rest_base, t.ticker);
            let resp = match client.get(&url).send().await {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("[!] Settlement lookup failed for {}: {}", t.ticker, e);
                    continue;
                }
            };
            let v: serde_json::Value = match resp.json().await {
                Ok(v) => v,
                Err(_) => continue,
            };
            let result = v["market"]["result"].as_str().unwrap_or("").to_string();
            if result != "yes" && result != "no" {
                continue;
            }
            let won = result == t.side;
            let n = t.count as f64;
            let pnl = if won { (1.0 - t.price) * n - t.fee } else { -t.price * n - t.fee };
            t.result = Some(result.clone());
            t.pnl = Some(pnl);
            changed = true;
            println!(
                "[SETTLED] {} {} | {} @ {}c x{} | spot {:.2} vs strike {:.2} | result {} | {} | P&L ${:+.2}",
                t.source.to_uppercase(), t.ticker, t.side.to_uppercase(), (t.price * 100.0).round(), t.count,
                t.spot, t.strike, result.to_uppercase(), if won { "WIN" } else { "LOSS" }, pnl
            );
            if let Some(s) = supa {
                let mut row = signal_row(t);
                row["kind"] = json!("settle");
                row["result"] = json!(result);
                row["pnl_cents"] = json!((pnl * 100.0).round() as i64);
                s.event(row);
            }
        }
        if changed {
            self.save();
        }
    }

    pub fn print_summary(&self) {
        println!("==================== TRADE SUMMARY ====================");
        for (i, t) in self.trades.iter().enumerate() {
            println!(
                "{:>2}. {:<6} {} | {} @ {}c x{} (${:.2}, fee ${:.2}) | model {:.1}% edge {:+.1}c | result {} | P&L {}",
                i + 1, t.source.to_uppercase(), t.ticker, t.side.to_uppercase(), (t.price * 100.0).round(), t.count,
                t.cost, t.fee, t.model_prob * 100.0, t.edge_cents,
                t.result.as_deref().unwrap_or("pending").to_uppercase(),
                t.pnl.map(|p| format!("${:+.2}", p)).unwrap_or_else(|| "-".to_string())
            );
        }
        println!("-------------------------------------------------------");
        for src in ["bot", "sniper"] {
            let settled: Vec<&Trade> = self.trades.iter().filter(|t| t.source == src && t.pnl.is_some()).collect();
            if settled.is_empty() && self.count_source(src) == 0 {
                continue;
            }
            let wins = settled.iter().filter(|t| t.pnl.unwrap_or(0.0) > 0.0).count();
            let risked: f64 = settled.iter().map(|t| t.cost).sum();
            let pnl: f64 = settled.iter().map(|t| t.pnl.unwrap_or(0.0)).sum();
            println!(
                "{:<6} settled {} | wins {} | losses {} | hit {:.0}% | risked ${:.2} | net ${:+.2} ({:+.1}%)",
                src.to_uppercase(), settled.len(), wins, settled.len() - wins,
                if settled.is_empty() { 0.0 } else { wins as f64 / settled.len() as f64 * 100.0 },
                risked, pnl, if risked > 0.0 { pnl / risked * 100.0 } else { 0.0 }
            );
        }
        println!("=======================================================");
    }
}

fn signal_row(t: &Trade) -> serde_json::Value {
    json!({
        "kind": "signal",
        "source": t.source,
        "mode": t.mode,
        "live": t.live(),
        "ticker": t.ticker,
        "title": t.title,
        "close_time": chrono::DateTime::from_timestamp(t.close_ts, 0).map(|d| d.to_rfc3339()),
        "seconds_to_close": (t.close_ts - t.placed_ts).max(0),
        "spot": t.spot,
        "strike": t.strike,
        "model_prob": t.model_prob,
        "edge_cents": t.edge_cents,
        "side": t.side,
        "price_cents": (t.price * 100.0).round() as i64,
        "count": t.count,
        "cost_cents": (t.cost * 100.0).round() as i64,
        "fee_cents": (t.fee * 100.0).round() as i64,
        "client_order_id": t.client_order_id,
        "order_id": t.order_id,
        "message": t.note,
    })
}
