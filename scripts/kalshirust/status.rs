//! HTTP status endpoint for the Vitaegis Kalshi HUD (vitaegis.com/kalshi).
//!
//! The HUD's `/api/bot-status` route GETs `$KALSHI_BOT_URL/status` every 15 s and expects
//! the JSON below; every field is optional on the wire and the HUD normalizes it. Drop this
//! file into `src/`, add `mod status;` to `main.rs`, spawn `status::serve`, and update the
//! shared state from the trading loop. See README.md next to this file.
//!
//! Dependencies: axum 0.7, tokio (full), serde (derive), serde_json, chrono.

use std::{
    collections::VecDeque,
    net::SocketAddr,
    sync::{Arc, RwLock},
    time::Instant,
};

use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use chrono::{SecondsFormat, Utc};
use serde::Serialize;

/// How many log lines `/status` carries. The HUD shows the newest 100.
const LOG_CAPACITY: usize = 200;

/// One terminal line on the HUD.
#[derive(Clone, Debug, Serialize)]
pub struct LogEntry {
    pub ts: String,
    pub level: String,
    pub msg: String,
}

/// What the trading loop knows right now. Update it with [`StatusState::update`].
#[derive(Clone, Debug, Default, Serialize)]
pub struct Snapshot {
    /// `true` when orders go to Kalshi for real money; `false` in dry-run.
    pub live: bool,
    /// `true` while the Kalshi WebSocket ticker feed is connected.
    pub kalshi_ws: bool,
    /// The KXBTC15M market being traded, e.g. `KXBTC15M-26NOV010115-15`.
    pub ticker: Option<String>,
    /// RFC 3339 close time of that market.
    pub close_time: Option<String>,
    /// Kalshi floor strike for the window.
    pub strike: Option<f64>,
    /// Latest BTC/USD spot the bot priced against.
    pub spot: Option<f64>,
    /// Entries placed in the current window; the HUD caps the display at 2.
    pub bets_in_window: u32,
    /// Account balance in cents. Shown only when Vercel sets `KALSHI_HUD_BALANCE=public`.
    pub bankroll_cents: Option<i64>,
}

/// Shared between the trading loop and the HTTP server.
pub struct StatusState {
    snapshot: RwLock<Snapshot>,
    logs: RwLock<VecDeque<LogEntry>>,
    started: Instant,
    token: Option<String>,
}

pub type Shared = Arc<StatusState>;

impl StatusState {
    /// `token`: when set, `/status` requires `Authorization: Bearer <token>`.
    /// Pair it with `KALSHI_BOT_TOKEN` on Vercel.
    pub fn new(token: Option<String>) -> Shared {
        Arc::new(Self {
            snapshot: RwLock::new(Snapshot::default()),
            logs: RwLock::new(VecDeque::with_capacity(LOG_CAPACITY)),
            started: Instant::now(),
            token: token.filter(|t| !t.is_empty()),
        })
    }

    /// Change any part of the snapshot in place.
    pub fn update(&self, f: impl FnOnce(&mut Snapshot)) {
        let mut s = self.snapshot.write().unwrap_or_else(|e| e.into_inner());
        f(&mut s);
    }

    /// Append a terminal line. `level`: `info`, `warn`, `error`, `debug`.
    pub fn log(&self, level: &str, msg: impl Into<String>) {
        let mut logs = self.logs.write().unwrap_or_else(|e| e.into_inner());
        if logs.len() == LOG_CAPACITY {
            logs.pop_front();
        }
        logs.push_back(LogEntry {
            ts: now_rfc3339(),
            level: level.to_string(),
            msg: msg.into(),
        });
    }

    pub fn snapshot(&self) -> Snapshot {
        self.snapshot.read().unwrap_or_else(|e| e.into_inner()).clone()
    }

    fn wire(&self) -> Wire {
        let s = self.snapshot();
        Wire {
            ok: true,
            version: env!("CARGO_PKG_VERSION"),
            uptime_s: self.started.elapsed().as_secs(),
            live: s.live,
            kalshi_ws: if s.kalshi_ws { "active" } else { "down" },
            ticker: s.ticker,
            close_time: s.close_time,
            strike: s.strike,
            spot: s.spot,
            bets_in_window: s.bets_in_window,
            bankroll_cents: s.bankroll_cents,
            logs: self
                .logs
                .read()
                .unwrap_or_else(|e| e.into_inner())
                .iter()
                .cloned()
                .collect(),
        }
    }
}

/// The JSON `/status` returns; mirrors `BotStatusWire` in the site's `lib/kalshi-hud.ts`.
#[derive(Serialize)]
struct Wire {
    ok: bool,
    version: &'static str,
    uptime_s: u64,
    live: bool,
    kalshi_ws: &'static str,
    ticker: Option<String>,
    close_time: Option<String>,
    strike: Option<f64>,
    spot: Option<f64>,
    bets_in_window: u32,
    bankroll_cents: Option<i64>,
    logs: Vec<LogEntry>,
}

pub fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

async fn status(State(state): State<Shared>, headers: HeaderMap) -> Result<Json<Wire>, StatusCode> {
    if let Some(token) = &state.token {
        let ok = headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .map(|v| v == token)
            .unwrap_or(false);
        if !ok {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }
    Ok(Json(state.wire()))
}

async fn health() -> &'static str {
    "ok"
}

/// Serves `GET /status` (JSON, optionally bearer-protected) and `GET /health` (plain `ok`,
/// unprotected, for Lightsail health checks). Spawn it: `tokio::spawn(status::serve(..))`.
pub async fn serve(state: Shared, addr: SocketAddr) -> std::io::Result<()> {
    let app = Router::new()
        .route("/status", get(status))
        .route("/health", get(health))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await
}

/// `KALSHI_STATUS_ADDR` (default `0.0.0.0:8080`) and `KALSHI_STATUS_TOKEN` from the
/// environment, for the usual `main.rs` wiring.
pub fn from_env() -> (Shared, SocketAddr) {
    let addr = std::env::var("KALSHI_STATUS_ADDR")
        .ok()
        .and_then(|a| a.parse().ok())
        .unwrap_or_else(|| SocketAddr::from(([0, 0, 0, 0], 8080)));
    (StatusState::new_from_env(), addr)
}

impl StatusState {
    fn new_from_env() -> Shared {
        Self::new(std::env::var("KALSHI_STATUS_TOKEN").ok())
    }
}
