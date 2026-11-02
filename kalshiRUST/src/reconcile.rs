/// Kalshi's own records against the bot's: fills and settlements from the exchange, turned into
/// real-money P&L and compared with the trade book. Read-only: nothing here places or cancels orders.
use base64::Engine as _;
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};

use crate::paper::Trade;

const SERIES_PREFIX: &str = "KXBTC15M";
const PAGE_SIZE: &str = "200";
/// Differences under this many dollars are rounding, not a problem.
const TOLERANCE: f64 = 0.02;
/// How long a trade may wait for its fill to appear in Kalshi's records.
const FILL_GRACE_SECS: i64 = 180;
/// How long a fill may wait for the bot to record it.
const RECORD_GRACE_SECS: i64 = 30;

#[derive(Debug, Clone, PartialEq)]
pub struct Fill {
    pub order_id: String,
    pub ticker: String,
    pub side: String,
    pub buy: bool,
    pub count: f64,
    pub price: f64,
    pub fee: f64,
    pub ts: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Settlement {
    pub ticker: String,
    pub result: String,
    pub revenue: f64,
    pub settled_ts: i64,
}

fn num(v: &Value, key: &str) -> Option<f64> {
    v[key].as_str().and_then(|s| s.parse().ok()).or_else(|| v[key].as_f64())
}

pub fn parse_fill(v: &Value) -> Option<Fill> {
    let side = v["side"].as_str()?.to_string();
    let price = num(v, if side == "yes" { "yes_price_dollars" } else { "no_price_dollars" })?;
    Some(Fill {
        order_id: v["order_id"].as_str()?.to_string(),
        ticker: v["ticker"].as_str()?.to_string(),
        buy: v["action"].as_str()? == "buy",
        count: num(v, "count_fp")?,
        price,
        fee: num(v, "fee_cost").unwrap_or(0.0),
        ts: v["ts"].as_i64()?,
        side,
    })
}

pub fn parse_settlement(v: &Value) -> Option<Settlement> {
    Some(Settlement {
        ticker: v["ticker"].as_str()?.to_string(),
        result: v["market_result"].as_str()?.to_string(),
        revenue: v["revenue"].as_f64().unwrap_or(0.0) / 100.0,
        settled_ts: v["settled_time"].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp())?,
    })
}

/// One market's net position, from its fills.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Position {
    pub yes_count: f64,
    pub no_count: f64,
    pub cost: f64,
    pub fees: f64,
    pub fills: usize,
    pub one_sided_buys: bool,
}

impl Position {
    fn add(&mut self, f: &Fill) {
        let signed = if f.buy { f.count } else { -f.count };
        if self.fills == 0 {
            self.one_sided_buys = f.buy;
        } else if !f.buy || (f.side == "yes" && self.no_count != 0.0) || (f.side == "no" && self.yes_count != 0.0) {
            self.one_sided_buys = false;
        }
        match f.side.as_str() {
            "yes" => self.yes_count += signed,
            _ => self.no_count += signed,
        }
        self.cost += signed * f.price;
        self.fees += f.fee;
        self.fills += 1;
    }

    pub fn is_open(&self) -> bool {
        self.yes_count.abs() > 1e-6 || self.no_count.abs() > 1e-6
    }

    pub fn payout(&self, result: &str) -> f64 {
        if result == "yes" { self.yes_count } else { self.no_count }
    }

    pub fn net(&self, result: &str) -> f64 {
        self.payout(result) - self.cost - self.fees
    }
}

/// Positions on the bot's series, by market.
pub fn positions(fills: &[Fill]) -> BTreeMap<String, Position> {
    let mut out: BTreeMap<String, Position> = BTreeMap::new();
    for f in fills.iter().filter(|f| f.ticker.starts_with(SERIES_PREFIX)) {
        out.entry(f.ticker.clone()).or_default().add(f);
    }
    out
}

#[derive(Debug, Clone, Default, PartialEq, Serialize)]
pub struct Report {
    pub since: i64,
    pub fills: usize,
    pub settled_markets: usize,
    pub wins: usize,
    pub losses: usize,
    pub cost: f64,
    pub fees: f64,
    /// Real-money P&L on settled markets, from Kalshi's records alone.
    pub net: f64,
    pub net_today: f64,
    /// The bot's own figure for the same trades.
    pub book_settled: usize,
    pub book_net: f64,
    pub open_tickers: Vec<String>,
    pub problems: Vec<String>,
}

fn differs(a: f64, b: f64) -> bool {
    (a - b).abs() > TOLERANCE
}

/// Compares Kalshi's fills and settlements since `since` with the book's live bot trades.
pub fn reconcile(fills: &[Fill], settlements: &[Settlement], book: &[Trade], since: i64, day_start: i64, now: i64) -> Report {
    let mut r = Report { since, ..Report::default() };
    let positions_by_market = positions(fills);
    let settled: HashMap<&str, &Settlement> = settlements.iter().map(|s| (s.ticker.as_str(), s)).collect();
    r.fills = positions_by_market.values().map(|p| p.fills).sum();

    for (ticker, p) in &positions_by_market {
        let Some(s) = settled.get(ticker.as_str()) else {
            if p.is_open() {
                r.open_tickers.push(ticker.clone());
            }
            continue;
        };
        let net = p.net(&s.result);
        r.settled_markets += 1;
        r.cost += p.cost;
        r.fees += p.fees;
        r.net += net;
        if s.settled_ts >= day_start {
            r.net_today += net;
        }
        if net > 0.0 {
            r.wins += 1;
        } else {
            r.losses += 1;
        }
        if p.one_sided_buys && differs(s.revenue, p.payout(&s.result)) {
            r.problems.push(format!("{}: Kalshi paid ${:.2}, the fills imply ${:.2}", ticker, s.revenue, p.payout(&s.result)));
        }
    }

    let live: Vec<&Trade> = book.iter().filter(|t| t.live() && t.source == "bot" && t.placed_ts >= since).collect();
    let mut by_order: HashMap<&str, Vec<&Fill>> = HashMap::new();
    for f in fills {
        by_order.entry(f.order_id.as_str()).or_default().push(f);
    }
    for t in &live {
        if let Some(pnl) = t.pnl {
            r.book_settled += 1;
            r.book_net += pnl;
        }
        let Some(order_id) = t.order_id.as_deref() else {
            r.problems.push(format!("{}: the bot recorded a live trade with no order id", t.ticker));
            continue;
        };
        let Some(order_fills) = by_order.get(order_id) else {
            if now - t.placed_ts > FILL_GRACE_SECS {
                r.problems.push(format!("{}: order {} has no fill in Kalshi's records", t.ticker, order_id));
            }
            continue;
        };
        let count: f64 = order_fills.iter().map(|f| f.count).sum();
        let cost: f64 = order_fills.iter().map(|f| f.count * f.price).sum();
        let fee: f64 = order_fills.iter().map(|f| f.fee).sum();
        if (count - t.count as f64).abs() > 0.005 {
            r.problems.push(format!("{}: Kalshi filled {:.2} contracts, the bot recorded {}", t.ticker, count, t.count));
        }
        if differs(cost, t.cost) {
            r.problems.push(format!("{}: Kalshi's cost is ${:.2}, the bot recorded ${:.2}", t.ticker, cost, t.cost));
        }
        if differs(fee, t.fee) {
            r.problems.push(format!("{}: Kalshi's fee is ${:.2}, the bot recorded ${:.2}", t.ticker, fee, t.fee));
        }
        if let (Some(pnl), Some(s)) = (t.pnl, settled.get(t.ticker.as_str())) {
            let side = order_fills[0].side.as_str();
            let net = if s.result == side { count - cost - fee } else { -cost - fee };
            if differs(net, pnl) {
                r.problems.push(format!("{}: Kalshi's records give ${:+.2}, the bot recorded ${:+.2}", t.ticker, net, pnl));
            }
        }
    }

    let mut unknown: BTreeMap<&str, usize> = BTreeMap::new();
    let known: Vec<&str> = live.iter().filter_map(|t| t.order_id.as_deref()).collect();
    for f in fills.iter().filter(|f| f.ticker.starts_with(SERIES_PREFIX) && now - f.ts > RECORD_GRACE_SECS) {
        if !known.contains(&f.order_id.as_str()) {
            *unknown.entry(f.ticker.as_str()).or_default() += 1;
        }
    }
    for (ticker, n) in unknown {
        r.problems.push(format!("{}: {} fill(s) in Kalshi's records that the bot did not record", ticker, n));
    }
    r
}

fn sign(pem_path: &str, msg: &str) -> Result<String, String> {
    let pem = std::fs::read_to_string(pem_path).map_err(|e| e.to_string())?;
    let clean = pem.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der = base64::engine::general_purpose::STANDARD.decode(clean).map_err(|e| e.to_string())?;
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

/// All pages of a signed portfolio listing since `since`.
async fn listing(client: &reqwest::Client, base: &str, key_id: &str, pem: &str, path: &str, key: &str, since: i64) -> Result<Vec<Value>, String> {
    let since = since.to_string();
    let mut out = Vec::new();
    let mut cursor = String::new();
    loop {
        let ts = chrono::Utc::now().timestamp_millis().to_string();
        let signature = sign(pem, &format!("{}GET/trade-api/v2{}", ts, path))?;
        let mut query = vec![("limit", PAGE_SIZE), ("min_ts", since.as_str())];
        if !cursor.is_empty() {
            query.push(("cursor", cursor.as_str()));
        }
        let resp = client
            .get(format!("{}{}", base, path))
            .query(&query)
            .header("KALSHI-ACCESS-KEY", key_id)
            .header("KALSHI-ACCESS-SIGNATURE", &signature)
            .header("KALSHI-ACCESS-TIMESTAMP", &ts)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = resp.status();
        let page: Value = resp.json().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!("{} on {}", status, path));
        }
        let rows = page[key].as_array().cloned().unwrap_or_default();
        let empty = rows.is_empty();
        out.extend(rows);
        cursor = page["cursor"].as_str().unwrap_or("").to_string();
        if cursor.is_empty() || empty {
            return Ok(out);
        }
    }
}

/// Kalshi's fills and settlements since `since`.
pub async fn fetch(client: &reqwest::Client, base: &str, key_id: &str, pem: &str, since: i64) -> Result<(Vec<Fill>, Vec<Settlement>), String> {
    let fills = listing(client, base, key_id, pem, "/portfolio/fills", "fills", since).await?;
    let settlements = listing(client, base, key_id, pem, "/portfolio/settlements", "settlements", since).await?;
    Ok((fills.iter().filter_map(parse_fill).collect(), settlements.iter().filter_map(parse_settlement).collect()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paper::TradeBook;
    use serde_json::json;

    const T: &str = "KXBTC15M-26NOV020300-00";
    const SINCE: i64 = 1_000;
    const NOW: i64 = 100_000;
    const TODAY: i64 = 50_000;

    fn fill(order: &str, ticker: &str, side: &str, buy: bool, count: f64, price: f64, fee: f64, ts: i64) -> Fill {
        Fill { order_id: order.into(), ticker: ticker.into(), side: side.into(), buy, count, price, fee, ts }
    }

    fn settled(ticker: &str, result: &str, revenue: f64, ts: i64) -> Settlement {
        Settlement { ticker: ticker.into(), result: result.into(), revenue, settled_ts: ts }
    }

    fn trade(order: Option<&str>, count: u32, price: f64, fee: f64, pnl: Option<f64>) -> Trade {
        serde_json::from_value(json!({
            "mode": "LIVE-NORMAL", "source": "bot", "ticker": T, "side": "yes", "price": price, "count": count,
            "cost": count as f64 * price, "fee": fee, "model_prob": 0.8, "spot": 78000.0, "strike": 77900.0,
            "placed_ts": 2_000, "close_ts": 3_000, "client_order_id": "sharp-1", "order_id": order, "pnl": pnl,
        }))
        .unwrap()
    }

    #[test]
    fn parses_kalshis_fill_and_settlement_rows() {
        let f = parse_fill(&json!({"action":"buy","count_fp":"57.00","fee_cost":"0.748200","no_price_dollars":"0.7500","order_id":"o1","side":"yes","ticker":T,"ts":1793503117,"yes_price_dollars":"0.2500"})).unwrap();
        assert_eq!((f.side.as_str(), f.buy, f.count, f.price, f.ts), ("yes", true, 57.0, 0.25, 1793503117));
        assert!((f.fee - 0.7482).abs() < 1e-9);
        let n = parse_fill(&json!({"action":"sell","count_fp":"12.00","no_price_dollars":"0.6500","order_id":"o2","side":"no","ticker":T,"ts":5,"yes_price_dollars":"0.3500"})).unwrap();
        assert_eq!((n.buy, n.price), (false, 0.65));
        let s = parse_settlement(&json!({"market_result":"no","revenue":1200,"settled_time":"2026-11-01T03:30:03.607259Z","ticker":T})).unwrap();
        assert_eq!((s.result.as_str(), s.revenue), ("no", 12.0));
        assert!(s.settled_ts > 0);
    }

    #[test]
    fn a_win_and_a_loss_net_out_from_kalshis_records() {
        let other = "KXBTC15M-26NOV020315-15";
        let fills = [fill("o1", T, "yes", true, 6.0, 0.78, 0.07, 2_000), fill("o2", other, "no", true, 6.0, 0.80, 0.06, 2_100)];
        let setts = [settled(T, "yes", 6.0, 60_000), settled(other, "yes", 0.0, 3_000)];
        let r = reconcile(&fills, &setts, &[], SINCE, TODAY, NOW);
        assert_eq!((r.settled_markets, r.wins, r.losses), (2, 1, 1));
        let win = 6.0 - 6.0 * 0.78 - 0.07;
        let loss = -(6.0 * 0.80) - 0.06;
        assert!((r.net - (win + loss)).abs() < 1e-9);
        assert!((r.net_today - win).abs() < 1e-9);
    }

    #[test]
    fn a_matching_book_has_no_problems() {
        let fills = [fill("o1", T, "yes", true, 6.0, 0.78, 0.07, 2_000)];
        let setts = [settled(T, "yes", 6.0, 3_000)];
        let book = [trade(Some("o1"), 6, 0.78, 0.07, Some(6.0 - 6.0 * 0.78 - 0.07))];
        let r = reconcile(&fills, &setts, &book, SINCE, TODAY, NOW);
        assert_eq!(r.problems, Vec::<String>::new());
        assert_eq!(r.book_settled, 1);
        assert!((r.book_net - r.net).abs() < 1e-9);
    }

    #[test]
    fn flags_a_different_count_cost_fee_or_result() {
        let fills = [fill("o1", T, "yes", true, 5.0, 0.80, 0.20, 2_000)];
        let setts = [settled(T, "no", 0.0, 3_000)];
        let book = [trade(Some("o1"), 6, 0.78, 0.07, Some(1.25))];
        let r = reconcile(&fills, &setts, &book, SINCE, TODAY, NOW);
        let text = r.problems.join(" | ");
        assert!(text.contains("filled 5.00 contracts, the bot recorded 6"), "{text}");
        assert!(text.contains("cost is $4.00"), "{text}");
        assert!(text.contains("fee is $0.20"), "{text}");
        assert!(text.contains("the bot recorded $+1.25"), "{text}");
    }

    #[test]
    fn flags_a_fill_the_bot_did_not_record_after_the_grace_period() {
        let old = [fill("x", T, "yes", true, 6.0, 0.78, 0.07, NOW - 100)];
        assert!(reconcile(&old, &[], &[], SINCE, TODAY, NOW).problems[0].contains("did not record"));
        let fresh = [fill("x", T, "yes", true, 6.0, 0.78, 0.07, NOW - 5)];
        assert!(reconcile(&fresh, &[], &[], SINCE, TODAY, NOW).problems.is_empty());
    }

    #[test]
    fn flags_a_recorded_order_with_no_fill_after_the_grace_period() {
        let book = [trade(Some("o1"), 6, 0.78, 0.07, None)];
        assert!(reconcile(&[], &[], &book, SINCE, TODAY, NOW).problems[0].contains("no fill"));
        assert!(reconcile(&[], &[], &book, SINCE, TODAY, 2_010).problems.is_empty());
    }

    #[test]
    fn ignores_paper_trades_and_trades_before_the_start_time() {
        let mut paper = trade(Some("p"), 6, 0.78, 0.07, Some(1.25));
        paper.mode = "PAPER-NORMAL".into();
        let mut old = trade(Some("q"), 6, 0.78, 0.07, Some(1.25));
        old.placed_ts = SINCE - 1;
        let r = reconcile(&[], &[], &[paper, old], SINCE, TODAY, NOW);
        assert!(r.problems.is_empty());
        assert_eq!(r.book_settled, 0);
    }

    #[test]
    fn ignores_other_markets_but_reports_open_positions_here() {
        let fills = [fill("o", "KXETH15M-1", "yes", true, 5.0, 0.5, 0.0, 2_000), fill("x", T, "yes", true, 5.0, 0.5, 0.0, NOW - 5)];
        let r = reconcile(&fills, &[], &[], SINCE, TODAY, NOW);
        assert_eq!(r.fills, 1);
        assert_eq!(r.open_tickers, vec![T.to_string()]);
    }

    #[test]
    fn checks_what_kalshi_paid_on_a_one_sided_position() {
        let fills = [fill("o1", T, "yes", true, 6.0, 0.78, 0.07, 2_000)];
        let r = reconcile(&fills, &[settled(T, "yes", 5.0, 3_000)], &[trade(Some("o1"), 6, 0.78, 0.07, None)], SINCE, TODAY, NOW);
        assert!(r.problems[0].contains("Kalshi paid $5.00"));
    }

    #[test]
    fn a_position_only_kalshi_knows_about_uses_the_windows_trade() {
        let path = std::env::temp_dir().join("kalshirust_reconcile_test_missing.jsonl");
        let mut book = TradeBook::load(path.to_str().unwrap(), 10, 10);
        assert_eq!(book.open_on(T), 0);
        book.exchange_open.insert(T.to_string());
        assert_eq!(book.open_on(T), 1);
    }

    #[test]
    fn the_daily_stop_uses_the_worse_of_the_two_figures() {
        let path = std::env::temp_dir().join("kalshirust_reconcile_test_missing2.jsonl");
        let mut book = TradeBook::load(path.to_str().unwrap(), 10, 10);
        assert!(!book.daily_stopped(30.0));
        book.exchange_pnl_today = Some(-31.0);
        assert!(book.daily_stopped(30.0));
        book.exchange_pnl_today = Some(-5.0);
        assert!(!book.daily_stopped(30.0));
    }
}
