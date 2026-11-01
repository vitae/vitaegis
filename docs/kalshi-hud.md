# Kalshi HUD (`/kalshi`)

The trading HUD for the Rust bot (`C:\vitaegis\kalshirust`, running as `kalshi-bot.service`
on the Lightsail VPS). The page is public, dark, and wired to three live sources:

1. **Supabase Realtime** — the bot's tables `market_windows` and `trade_executions` in the
   site's project (`fsrxacvcqftelbjdqlnm`). The page loads a snapshot with the anon key,
   then applies every insert and update as it lands (`postgres_changes`).
2. **`/api/bot-status`** — a Next.js route the page polls every 15 s. It proxies the bot's
   optional HTTP status endpoint on the VPS and adds the window's strike and book from
   Kalshi's public API.
3. **Coinbase Exchange WebSocket** — BTC/USD spot, straight from the browser.

The route is `app/kalshi/page.tsx`, so it serves `vitaegis.com/kalshi` with no `basePath`:
the same Next.js app serves the whole domain.

## Files

- `app/kalshi/KalshiHud.tsx` — the HUD. `useHudFeeds.ts` — Realtime rows and the status
  poll. `hud.module.css` — grid, glows, terminal. `page.tsx` — JetBrains Mono, metadata.
- `app/api/bot-status/route.ts` — VPS probe + Kalshi public market.
- `lib/kalshi-hud.ts` — row types, value readers, the 2-bet tracker, performance,
  GBM/Kelly/blend math, terminal line formatters. Tested in `lib/kalshi-hud.test.ts`.
- `lib/cn.ts` — `clsx` + `tailwind-merge` class helper.
- `supabase/migrations/20261101120000_kalshi_hud.sql` — read policies, grants, Realtime
  publication; creates the two tables only if the bot has not.
- `app/kalshi/analytics/` — the previous `kalshi_events` board, kept as-is.

## Environment (Vercel)

| Variable                                                    | Purpose                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already set to the site's project. **Anon** key only: it ships to every browser. |
| `KALSHI_BOT_URL`                                            | Optional. `http://<lightsail-ip>:<port>`; the route GETs `/status`. |
| `KALSHI_BOT_TOKEN`                                          | Optional; sent as `Authorization: Bearer`.                  |
| `KALSHI_HUD_BALANCE=public`                                 | Pass the bot's `bankroll_cents` through to the page.        |
| `KALSHI_PUBLIC_HOST`                                        | Default `https://api.elections.kalshi.com`.                 |

Never put the service-role key in a `NEXT_PUBLIC_` variable. The bot uses the service-role
key on the VPS; the browser uses the anon key and the read policies in the migration.

## The bot's tables

As the Rust bot created them. Timestamps are `timestamptz`.

### `market_windows`

| column        | type             | HUD use                                                        |
| ------------- | ---------------- | -------------------------------------------------------------- |
| `id`          | integer PK       | row identity                                                   |
| `ticker`      | text             | `KXBTC15M-26NOV010115-15`; joins `trade_executions.window_ticker` |
| `strike`      | double precision | BRTI at open; spot − strike, GBM                               |
| `close_time`  | timestamptz      | countdown; the soonest future row is the current window        |
| `bets_placed` | integer          | the tracker takes the larger of this and the execution count   |
| `status`      | text             | shown on the card; `settled_yes` / `settled_no` (any text containing `yes` or `no`) settles P&L |
| `created_at`  | timestamptz      | heartbeat when there is no status endpoint                     |

### `trade_executions`

| column          | type             | HUD use                                                     |
| --------------- | ---------------- | ----------------------------------------------------------- |
| `id`            | integer PK       | row identity                                                |
| `window_ticker` | text             | groups the window's trade log and the 2-bet tracker         |
| `action`        | text             | `YES` / `NO` (any casing; `buy_yes` style is read too)      |
| `price`         | double precision | contract ask paid: `0.35` dollars or `35` cents, both read  |
| `size`          | double precision | contracts; stake = size × price                             |
| `blended_prob`  | double precision | the bot's GBM 40% + XGBoost 60% P(YES), `0–1` or `0–100`     |
| `executed_at`   | timestamptz      | ordering, 24 h P&L, freshness                               |

Optional columns the HUD reads if the bot adds them: `gbm_prob`, `ml_prob` (separate bars
on the matrix), `result` (`yes` / `no`), `pnl` (dollars or cents), `fee`, `latency_ms`. On
`market_windows`: `result`, `title`, `open_time`.

### Settlement

The bot does not write P&L today. The HUD settles a row when its window has a result
(`market_windows.status` or `.result` containing `yes`/`no`, or the row's own `result`):
win = size × (100 − price¢) − fee, loss = −size × price¢ − fee, fee = Kalshi's taker fee
ceil(0.07 × C × P × (1 − P)). Until then the row is OPEN and counts as exposure.

### `GET $KALSHI_BOT_URL/status` (optional)

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
  Without `KALSHI_BOT_URL` it reads HEARTBEAT when the newest execution or window row is
  under 90 s old.
- `[SUPABASE REALTIME]` — CONNECTED when the `kalshi-hud` channel is subscribed.
- `[KALSHI WSS]` — ACTIVE when the status endpoint says the bot's Kalshi WebSocket is up;
  UNKNOWN without an endpoint.
- `[MODE]` — LIVE or DRY RUN from the status endpoint.

## The model matrix

- **Blended / composite**: the window's latest `blended_prob` from the bot. With no
  execution yet this window, the HUD's own blend of `gbm_prob` and `ml_prob` when stored,
  else its GBM estimate alone.
- **GBM**: `gbm_prob` when stored, else the HUD's driftless GBM from Coinbase spot, the
  strike, time to close and realized volatility (annualized, floored at 0.25).
- **XGBoost**: `ml_prob` when stored; otherwise the bar reads "not stored separately".
- **Edge and Kelly**: against Kalshi's book from the public API, fee-adjusted.

## The 2-bet window rule on screen

`windowTracker()` counts `trade_executions` rows for the current ticker, takes the larger
of that, `market_windows.bets_placed` and the status endpoint's `bets_in_window`, and caps
at 2. `[● ◯]` is one of two; `[● ●]` locks the panel magenta.

## Setup

1. Run `supabase/migrations/20261101120000_kalshi_hud.sql` in the project's SQL editor. It
   is idempotent: it leaves the bot's tables as they are, adds the anon read policies and
   grants, and adds both tables to the `supabase_realtime` publication.
2. Optional: `KALSHI_BOT_URL` (and `KALSHI_BOT_TOKEN`) on Vercel if the Rust bot serves
   `/status`. Open the VPS port to Vercel, or front it with a reverse proxy.
3. Deploys are automatic: every push to `main` builds on Vercel and serves
   `vitaegis.com/kalshi` (the apex redirects to `www.vitaegis.com`).
