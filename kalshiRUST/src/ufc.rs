/// Copies UFC picks from mma-ai.net onto Kalshi's fight markets. This file only reads the site, matches
/// fighters and decides. Placing an order, paper by default, is left to main.rs. On the site's 236
/// graded bets at the Vegas price with Kalshi's fee, this rule returned about -1% and the unfiltered bets
/// -3.9%, so it is a paper experiment.
use serde_json::Value;

use crate::models::taker_fee;

pub const SITE: &str = "https://mma-ai.net/";
pub const SERIES: &str = "KXUFCFIGHT";
const MIN_PRICE: f64 = 0.05;
const MAX_PRICE: f64 = 0.95;
/// A market must be for a fight within this many days of the site's card date.
const DATE_WINDOW_SECS: i64 = 3 * 86_400;

#[derive(Debug, Clone, PartialEq)]
pub struct Pick {
    pub event: String,
    pub date_ts: i64,
    pub fighter_a: String,
    pub fighter_b: String,
    pub pick: String,
    pub ai_win: f64,
    pub site_ev: Option<f64>,
}

impl Pick {
    pub fn opponent(&self) -> &str {
        if same_fighter(&self.pick, &self.fighter_a) { &self.fighter_b } else { &self.fighter_a }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct FightMarket {
    pub ticker: String,
    pub event_ticker: String,
    pub fighter: String,
    pub yes_ask: Option<f64>,
    pub expected_ts: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Bet {
    pub price: f64,
    pub count: u32,
    pub edge_cents: f64,
}

fn between<'a>(text: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let from = text.find(start)? + start.len();
    let to = text[from..].find(end)? + from;
    Some(&text[from..to])
}

/// The text of an HTML fragment, without tags or script bodies.
fn plain(fragment: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    for c in fragment.chars() {
        match c {
            '<' => in_tag = true,
            '>' if in_tag => {
                in_tag = false;
                out.push(' ');
            }
            c if !in_tag => out.push(c),
            _ => {}
        }
    }
    let decoded = out.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", "\"").replace("&nbsp;", " ");
    decoded.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn cells(row: &str) -> Vec<String> {
    let mut out = Vec::new();
    for part in row.split("<td").skip(1) {
        let Some(open) = part.find('>') else { continue };
        let body = &part[open + 1..];
        out.push(plain(&body[..body.find("</td>").unwrap_or(body.len())]));
    }
    out
}

fn card_date(text: &str) -> Option<i64> {
    let mut parts = text.trim().split('-');
    let date = chrono::NaiveDate::from_ymd_opt(parts.next()?.parse().ok()?, parts.next()?.parse().ok()?, parts.next()?.parse().ok()?)?;
    Some(date.and_hms_opt(0, 0, 0)?.and_utc().timestamp())
}

/// The fights the site currently recommends betting: pending, and not marked "no bet".
pub fn parse_picks(html: &str) -> Vec<Pick> {
    let mut out = Vec::new();
    for section in html.split("<div class=\"event-section\"").skip(1) {
        let event = between(section, "<h3>", "</h3>").map(plain).unwrap_or_default();
        let Some(date_ts) = between(section, "event-date\">", "<").and_then(card_date) else { continue };
        for row in section.split("<tr").skip(1) {
            let c = cells(row);
            if c.len() < 7 || !c[6].eq_ignore_ascii_case("pending") {
                continue;
            }
            let Some((a, b)) = c[0].split_once(" vs ") else { continue };
            let Some(ai) = c[2].trim_end_matches('%').trim().parse::<f64>().ok() else { continue };
            out.push(Pick {
                event: event.clone(),
                date_ts,
                fighter_a: a.trim().to_string(),
                fighter_b: b.trim().to_string(),
                pick: c[1].trim().to_string(),
                ai_win: ai / 100.0,
                site_ev: c[5].trim_end_matches('%').trim().parse().ok(),
            });
        }
    }
    out
}

pub fn parse_market(v: &Value) -> Option<FightMarket> {
    let time = |key: &str| v[key].as_str().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp());
    Some(FightMarket {
        ticker: v["ticker"].as_str()?.to_string(),
        event_ticker: v["event_ticker"].as_str()?.to_string(),
        fighter: v["yes_sub_title"].as_str()?.to_string(),
        yes_ask: v["yes_ask_dollars"].as_str().and_then(|s| s.parse().ok()),
        expected_ts: time("expected_expiration_time").or_else(|| time("close_time"))?,
    })
}

fn name_key(name: &str) -> Vec<String> {
    let folded: String = name
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'á' | 'à' | 'â' | 'ã' | 'ä' | 'å' => 'a',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' => 'i',
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' => 'o',
            'ú' | 'ù' | 'û' | 'ü' => 'u',
            'ñ' => 'n',
            'ç' => 'c',
            '-' | '.' | '\'' | '’' => ' ',
            c => c,
        })
        .filter(|c| c.is_ascii_alphabetic() || *c == ' ')
        .collect();
    folded.split_whitespace().map(str::to_string).collect()
}

/// The same last name, with first names equal or one the start of the other, as in Matt and Matthew.
/// A real-money bet must not rest on a looser match.
pub fn same_fighter(a: &str, b: &str) -> bool {
    let (a, b) = (name_key(a), name_key(b));
    match (a.first(), a.last(), b.first(), b.last()) {
        (Some(af), Some(al), Some(bf), Some(bl)) => al == bl && (af.starts_with(bf.as_str()) || bf.starts_with(af.as_str())),
        _ => false,
    }
}

/// The market on the picked fighter, only if the event's two sides are this exact fight, near this date.
pub fn find_market<'a>(pick: &Pick, markets: &'a [FightMarket]) -> Option<&'a FightMarket> {
    let chosen = markets.iter().find(|m| {
        same_fighter(&m.fighter, &pick.pick) && (m.expected_ts - pick.date_ts).abs() <= DATE_WINDOW_SECS && {
            let sides: Vec<&FightMarket> = markets.iter().filter(|o| o.event_ticker == m.event_ticker).collect();
            sides.len() == 2 && sides.iter().any(|o| same_fighter(&o.fighter, pick.opponent()))
        }
    })?;
    same_fighter(&pick.pick, &pick.fighter_a).then_some(()).or_else(|| same_fighter(&pick.pick, &pick.fighter_b).then_some(()))?;
    Some(chosen)
}

/// A bet when the site's win chance beats Kalshi's price plus the fee.
pub fn decide(ai_win: f64, yes_ask: Option<f64>, stake: f64) -> Option<Bet> {
    let price = yes_ask.filter(|p| (MIN_PRICE..=MAX_PRICE).contains(p))?;
    let edge = ai_win - price - taker_fee(price);
    let count = (stake / price).floor() as u32;
    (edge > 0.0 && count >= 1).then_some(Bet { price, count, edge_cents: edge * 100.0 })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const PAGE: &str = r#"<div class="events-container"><div class="event-section"> <div class="event-header"> <h3>UFC Fight Night: Moicano vs Nolan</h3> <span class="event-date">2026-10-31</span></div>
      <table class="predictions-table"><thead><tr><th>Fight</th></tr></thead><tbody>
      <tr><td class="fight-cell" data-fight="renato moicano vs tom nolan" onclick="open('a', this.querySelector('img').src)"> renato moicano vs tom nolan <div class="v"><img src="x.png"></div></td><td>tom nolan</td><td class="optional-column">67.4%</td><td>-206</td><td>-105.0</td><td>+31.50%</td><td>Pending</td></tr>
      <tr><td class="fight-cell">zach reese vs mickey gall</td><td>zach reese</td><td>67.0%</td><td>-203</td><td>-290.0</td><td>-9.90%</td><td>Pending - no bet</td></tr>
      </tbody></table></div>
      <div class="event-section"><h3>UFC 333</h3><span class="event-date">2026-9-3</span>
      <table><tr><td>a b vs c d</td><td>a b</td><td>60.0%</td><td>-150</td><td>-120</td><td>+5%</td><td>Hit!</td></tr>
      <tr><td>e f vs g h</td><td>e f</td><td>61.0%</td><td>-150</td><td>-120</td><td>+6%</td><td>Pending</td></tr></table></div>"#;

    fn market(ticker: &str, event: &str, fighter: &str, ask: f64, ts: i64) -> FightMarket {
        FightMarket { ticker: ticker.into(), event_ticker: event.into(), fighter: fighter.into(), yes_ask: Some(ask), expected_ts: ts }
    }

    fn pick(a: &str, b: &str, chosen: &str, date: i64) -> Pick {
        Pick { event: "UFC".into(), date_ts: date, fighter_a: a.into(), fighter_b: b.into(), pick: chosen.into(), ai_win: 0.6, site_ev: None }
    }

    #[test]
    fn reads_only_pending_bets_from_the_page() {
        let picks = parse_picks(PAGE);
        assert_eq!(picks.len(), 2);
        assert_eq!(picks[0].event, "UFC Fight Night: Moicano vs Nolan");
        assert_eq!((picks[0].fighter_a.as_str(), picks[0].fighter_b.as_str(), picks[0].pick.as_str()), ("renato moicano", "tom nolan", "tom nolan"));
        assert!((picks[0].ai_win - 0.674).abs() < 1e-9);
        assert_eq!(picks[0].site_ev, Some(31.5));
        assert_eq!(picks[0].opponent(), "renato moicano");
        assert_eq!(picks[1].pick, "e f");
    }

    #[test]
    fn reads_card_dates_with_and_without_leading_zeros() {
        assert_eq!(card_date("2026-9-3"), card_date("2026-09-03"));
        assert_eq!(card_date("soon"), None);
    }

    #[test]
    fn reads_a_kalshi_market() {
        let m = parse_market(&json!({"ticker":"KXUFCFIGHT-26NOV14GANHOK-HOK","event_ticker":"KXUFCFIGHT-26NOV14GANHOK","yes_sub_title":"Josh Hokit","yes_ask_dollars":"0.3400","expected_expiration_time":"2026-11-15T08:30:00Z","close_time":"2026-11-17T03:30:00Z"})).unwrap();
        assert_eq!((m.fighter.as_str(), m.yes_ask), ("Josh Hokit", Some(0.34)));
        assert_eq!(m.expected_ts, chrono::DateTime::parse_from_rfc3339("2026-11-15T08:30:00Z").unwrap().timestamp());
    }

    #[test]
    fn matches_names_strictly() {
        assert!(same_fighter("ciryl gane", "Ciryl Gane"));
        assert!(same_fighter("jose aldo", "José Aldo"));
        assert!(same_fighter("c gane", "Ciryl Gane"));
        assert!(same_fighter("matt brown", "Matthew Brown"));
        assert!(!same_fighter("tom nolan", "Tim Nolan"));
        assert!(!same_fighter("tom nolan", "Tom Nelson"));
        assert!(!same_fighter("", "Tom Nolan"));
    }

    #[test]
    fn finds_the_market_only_for_this_exact_fight_near_this_date() {
        let date = card_date("2026-11-14").unwrap();
        let ts = date + 86_400;
        let markets = vec![
            market("E-GAN", "E", "Ciryl Gane", 0.68, ts),
            market("E-HOK", "E", "Josh Hokit", 0.34, ts),
            market("F-NUN", "F", "Amanda Nunes", 0.39, ts),
            market("F-HAR", "F", "Kayla Harrison", 0.62, ts),
        ];
        assert_eq!(find_market(&pick("ciryl gane", "josh hokit", "josh hokit", date), &markets).unwrap().ticker, "E-HOK");
        assert!(find_market(&pick("ciryl gane", "amanda nunes", "ciryl gane", date), &markets).is_none());
        assert!(find_market(&pick("ciryl gane", "josh hokit", "ciryl gane", date - 30 * 86_400), &markets).is_none());
        assert!(find_market(&pick("ciryl gane", "josh hokit", "kayla harrison", date), &markets).is_none());
    }

    #[test]
    fn needs_both_sides_of_the_event() {
        let date = card_date("2026-11-14").unwrap();
        let one = vec![market("E-GAN", "E", "Ciryl Gane", 0.68, date)];
        assert!(find_market(&pick("ciryl gane", "josh hokit", "ciryl gane", date), &one).is_none());
    }

    #[test]
    fn bets_only_when_the_win_chance_beats_price_and_fee() {
        let b = decide(0.674, Some(0.60), 5.0).unwrap();
        assert_eq!(b.count, 8);
        assert!((b.edge_cents - (67.4 - 60.0 - 1.68)).abs() < 1e-6);
        assert!(decide(0.61, Some(0.60), 5.0).is_none());
        assert!(decide(0.674, Some(0.70), 5.0).is_none());
        assert!(decide(0.674, None, 5.0).is_none());
        assert!(decide(0.99, Some(0.97), 5.0).is_none());
    }
}
