# Kalshi HUD (`/kalshi`)

The trading HUD for the Rust bot (`kalshi-bot.service` on the Lightsail VPS). The page is
public, dark, and wired to three live sources:

1. **Supabase Realtime** — the bot's tables `market_windows`, `bot_signals` and
   `trade_executions`. The page loads a snapshot with the anon key, then applies every
   insert and update as it lands (`postgres_changes`).
2. **`/api/bot-status`** — a Next.js route the page polls every 15 s. It proxies the bot's
   HTTP status endpoint on the VPS and adds the window's strike and book from Kalshi's
   public API.
3. **Coinbase Exchange WebSocket** — BTC/USD spot, straight from the browser.

## Files

- `app/kalshi/KalshiHud.tsx` — the HUD. `useHudFeeds.ts` — Realtime rows and the status
  poll. `hud.module.css` — grid, glows, terminal. `page.tsx` — JetBrains Mono, metadata.
- `app/api/bot-status/route.ts` — VPS probe + Kalshi public market.
- `lib/kalshi-hud.ts` — row types, the 2-bet tracker, performance, GBM/Kelly/blend math,
  terminal line formatters. Tested in `lib/kalshi-hud.test.ts`.
- `supabase/migrations/20261101120000_kalshi_hud.sql` — the three tables, public-read
  policies, Realtime publication.
- `app/kalshi/analytics/` — the previous `kalshi_events` board, kept as-is.

## Environment (Vercel)

| Variable                                                  | Purpose                                                  |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser snapshot + Realtime. Must be the bot's project. |
| `KALSHI_BOT_URL`                                          | `http://<lightsail-ip>:<port>`; the route GETs `/status`. |
| `KALSHI_BOT_TOKEN`                                        | Optional; sent as `Authorization: Bearer`.               |
| `KALSHI_HUD_BALANCE=public`                               | Pass the bot's `bankroll_cents` through to the page.     |
| `KALSHI_PUBLIC_HOST`                                      | Default `https://api.elections.kalshi.com`.              |

## Contract the Rust bot writes

All money in integer cents, probabilities 0–1, timestamps ISO-8601 UTC. Write with the
service role key. Full DDL is in the migration; the HUD reads these columns:

### `market_windows` — one row per 15-minute contract, upserted on `ticker`

```json
{
  "ticker": "KXBTC15M-26NOV010115-15",
  "event_ticker": "KXBTC15M-26NOV010115",
  "title": "BTC price up in next 15 mins?",
  "open_time": "2026-11-01T05:00:00Z",
  "close_time": "2026-11-01T05:15:00Z",
  "strike": 77677.14,
  "strike_type": "greater_or_equal",
  "spot_open": 77677.14,
  "status": "open",
  "bets_placed": 1,
  "max_bets": 2
}
```

At close set `status: "closed"`; after the result set `status: "settled"`, `result`,
`spot_close`, `pnl_cents`, `updated_at`.

### `bot_signals` — one row per inference tick (insert only)

```json
{
  "ticker": "KXBTC15M-26NOV010115-15",
  "spot": 77710.5,
  "strike": 77677.14,
  "seconds_to_close": 412,
  "yes_ask_cents": 61,
  "no_ask_cents": 41,
  "gbm_prob": 0.52,
  "ml_prob": 0.71,
  "composite_prob": 0.634,
  "market_prob": 0.6,
  "edge": 0.034,
  "kelly": 0.087,
  "side": "yes",
  "action": "buy",
  "reason": "edge > fee hurdle, slot 2/2 open",
  "kalshi_ws": true,
  "live": true
}
```

The HUD shows the newest row for the current ticker as long as it is under 90 s old.
`composite_prob` is recomputed on the page as `0.4·gbm + 0.6·ml`; when `ml_prob` is null
the bar reads "no ML score" and the composite falls back to GBM. When no fresh signal
exists at all, the page prices GBM itself from Coinbase spot, the strike and realized vol,
and labels the matrix "HUD GBM FALLBACK".

### `trade_executions` — one row per order; update the row at settlement

```json
{
  "ticker": "KXBTC15M-26NOV010115-15",
  "window_id": "<market_windows.id>",
  "bet_number": 2,
  "side": "yes",
  "price_cents": 61,
  "count": 16,
  "fill_count": 16,
  "avg_fill_cents": 61,
  "fee_cents": 27,
  "stake_cents": 976,
  "latency_ms": 38,
  "order_id": "…",
  "client_order_id": "…",
  "status": "filled",
  "live": true
}
```

`bet_number` is 1 or 2; the table has a check on it, which is the circuit breaker's last
line of defence. Settlement: `result`, `pnl_cents`, `settled_at`, `status: "settled"`.
Rejected orders (`status: "rejected"`) do not consume a slot on the page.

### `GET $KALSHI_BOT_URL/status` — the Rust bot's HTTP endpoint

Every field is optional; the route normalizes what it gets.

```json
{
  "ok": true,
  "version": "0.3.1",
  "uptime_s": 86400,
  "live": true,
  "kalshi_ws": "active",
  "ticker": "KXBTC15M-26NOV010115-15",
  "close_time": "2026-11-01T05:15:00Z",
  "strike": 77677.14,
  "spot": 77710.5,
  "bets_in_window": 1,
  "bankroll_cents": 250000,
  "logs": [{ "ts": "2026-11-01T05:03:12Z", "level": "info", "msg": "ws tick yes=61 no=41" }]
}
```

## How the pills decide

- `[LIGHTSAIL VPS]` — ONLINE when `/status` answers 2xx within 2.5 s (latency shown).
  Without `KALSHI_BOT_URL` it reads HEARTBEAT when a `bot_signals` row is under 90 s old.
- `[SUPABASE REALTIME]` — CONNECTED when the `kalshi-hud` channel is subscribed.
- `[KALSHI WSS]` — ACTIVE when the status endpoint or the fresh signal says the bot's
  Kalshi WebSocket is up.
- `[MODE]` — LIVE or DRY RUN from the status endpoint, else the fresh signal.

## The 2-bet window rule on screen

`windowTracker()` counts non-rejected `trade_executions` rows for the current ticker; the
slots show `[● ◯]` for one of two, `[● ●]` locks the panel magenta. The count is also
reconciled against `market_windows.bets_placed` and the status endpoint's
`bets_in_window`, taking the largest, capped at 2.

## Setup

1. Run the migration in the bot's Supabase project (SQL editor or `supabase db push`).
2. Point Vercel's `NEXT_PUBLIC_SUPABASE_*` at that project; add `KALSHI_BOT_URL` (and
   `KALSHI_BOT_TOKEN` if the bot checks one). Open the VPS port to Vercel, or front the
   bot with a reverse proxy.
3. Open `/kalshi`. With no rows yet the ticker card still shows the live Kalshi window and
   BTC spot; the trackers fill in as the bot writes.
