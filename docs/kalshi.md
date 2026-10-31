# Kalshi bot

`scripts/kalshi_bot.py` trades the KXBTC15M series (15-minute Bitcoin markets). It buys
the cheap side when the crowd leans hard the other way: YES ask at or above 72¢ makes NO
at 8–28¢ a buy, and the mirror for YES. $10 a trade, one order per market, six a day,
dry-run until started with `--live`.

The bot never runs on Vercel. It is one always-on Python process on a small server. It
streams quotes from Kalshi's WebSocket, acts on each quote the moment it lands, and
broadcasts every change to Supabase Realtime. Two pages read that:

- **`/kalshi`** (public): the market being watched with a live YES price chart, both
  asks, the entry-zone meter, BTC/USD streamed from Coinbase, profitability, every trade
  in full, settled markets, and a backtest of other entry lines. No balance.
- **`/admin/kalshi`** (admin key): the same log with the account balance.

## Files

- `scripts/kalshi_bot.py` — the bot: config, signed REST client, WebSocket ticker feed,
  strategy helpers, order placement with latency timing, settlement pass, Supabase sink
  (inserts, updates, Realtime broadcast).
- `scripts/kalshi-requirements.txt` — its three Python packages: requests, cryptography, websockets.
- `scripts/kalshi-bot.service` — systemd unit that keeps it running.
- `supabase/migrations/20261031120000_kalshi_events.sql` — the `kalshi_events` table.
- `lib/kalshi.ts` — row type, trade economics, performance, threshold backtest, summaries.
  Tested in `lib/kalshi.test.ts`.
- `lib/supabase-browser.ts` — anon-key client for Realtime in the browser.
- `app/api/kalshi/route.ts` — public snapshot. `app/api/admin/kalshi/route.ts` — admin.
- `app/kalshi/` — the page: `KalshiBoard.tsx`, `LineChart.tsx`, `useFeeds.ts`.
- `app/admin/kalshi/` — the admin screen.

## Data flow

```
Kalshi WS ticker ──┐
Kalshi REST (15s) ─┴─► bot ─► decide/order ─► Kalshi
                        │
                        ├─► INSERT kalshi_events (tick on change, order, settle, error)
                        ├─► PATCH order row with result + P&L at settlement
                        └─► POST /realtime/v1/api/broadcast  topic `kalshi`
                                                     │
                   /api/kalshi snapshot ◄── page ◄────┘ live ticks, order/settle pokes
                   Coinbase WS ticker ──────► page (BTC/USD)
```

The page fetches the snapshot once, on return to the tab, and when a broadcast says an
order or settlement happened. It does not poll on a timer.

### Rows

One `kalshi_events` row per event; `kind` says which:

| kind     | written when                        | notable columns                                                                 |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `tick`   | quote changed, or 60s heartbeat     | ticker, title, close_time, seconds_to_close, yes/no ask                          |
| `order`  | an order was placed (or dry-run)    | client_order_id, outcome, price, count, fill_count, avg_fill, fee, latency_ms   |
| `settle` | market result fetched after close   | result, settled_at, `path` = [[seconds_to_close, yes_ask, no_ask], …]           |
| `error`  | Kalshi or network error             | message                                                                         |
| `status` | bot started                         | balance_cents (live only)                                                       |

At settlement the bot PATCHes each order row (matched on `client_order_id`) with
`result`, `pnl_cents` and `fee_cents`. P&L after fees: win = contracts × (100 − entry) −
fee; loss = −contracts × entry − fee. Kalshi's fee is ceil(0.07 × C × P × (1 − P)).

### Backtest

Each `settle` row carries the market's quote path. `backtest()` replays every settled
market with ceilings 20–50¢ at the same $10 stake: the first quote inside the zone is the
entry, the result decides the outcome. The table on `/kalshi` shows trades, win rate,
stake and net P&L per line and names the best one, with confidence by sample size (under
30 markets is low). This is the data behind "70/30 or 60/40": a 30¢ line is a 70% crowd,
a 40¢ line is 60%.

## Kalshi API notes

Verified against the OpenAPI and AsyncAPI specs at docs.kalshi.com in October 2026.

- REST host `https://external-api.kalshi.com`, prefix `/trade-api/v2`. Sign
  `timestamp_ms + METHOD + path` (prefix included, query excluded), RSA-PSS SHA-256,
  base64.
- WebSocket `wss://external-api-ws.kalshi.com/trade-api/ws/v2`, same headers on the
  handshake signed over `GET/trade-api/ws/v2`. Channel `ticker`, params
  `market_tickers`. Messages carry `yes_bid_dollars` and `yes_ask_dollars`; NO ask is
  1 − YES bid. Server pings every 10s; the `websockets` package answers them.
- Market prices are fixed-point dollar strings (`"0.8400"`). Cent fields are gone.
- Orders: `POST /portfolio/events/orders`, `side: bid|ask` on the YES book, dollar-string
  `price`, string `count`. Buying NO at q¢ is an `ask` at 1 − q. Response has
  `fill_count`, `remaining_count`, `average_fill_price`, `average_fee_paid`.
- The public markets endpoint rate-limits by IP; the bot backs off on 429.

## Setup

1. Supabase: restore the project if paused, then run
   `supabase/migrations/20261031120000_kalshi_events.sql` in the SQL editor. Realtime
   broadcast on public channels must be allowed (the default).
2. Vercel already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` and `CONTENT_ADMIN_KEY`. Nothing new.
3. Run the bot somewhere always-on (below). Open `/kalshi`.

## Running 24/7 on an AWS EC2 instance

Kalshi serves from AWS us-east-1; a server there keeps round trips to a few
milliseconds. A `t4g.nano` (2 vCPU Arm, 512 MB) is plenty and costs about $3 a month;
`t3.micro` is free-tier for a year.

1. **Launch**: EC2 → Ubuntu 24.04 LTS, `t4g.nano`, region us-east-1. SSH from your IP
   only; nothing else inbound.
2. **Base packages**:

   ```bash
   sudo apt-get update && sudo apt-get install -y python3-venv git
   sudo useradd --system --home /opt/vitaegis --shell /usr/sbin/nologin kalshi
   sudo git clone https://github.com/vitae/vitaegis /opt/vitaegis
   sudo python3 -m venv /opt/vitaegis/.venv
   sudo /opt/vitaegis/.venv/bin/pip install -r /opt/vitaegis/scripts/kalshi-requirements.txt
   ```

3. **Secrets**: `scp` your Kalshi private key up, then:

   ```bash
   sudo install -m 600 -o kalshi -g kalshi kalshi_private.key /opt/vitaegis/kalshi_private.key
   sudo tee /etc/kalshi-bot.env >/dev/null <<'ENV'
   KALSHI_KEY_ID=...
   KALSHI_PRIVATE_KEY_PATH=/opt/vitaegis/kalshi_private.key
   KALSHI_BET_USD=10
   SUPABASE_URL=https://....supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   ENV
   sudo chmod 600 /etc/kalshi-bot.env
   sudo chown -R kalshi:kalshi /opt/vitaegis
   ```

4. **Dry run first** to see one poll and confirm auth and telemetry:

   ```bash
   sudo -u kalshi env $(sudo cat /etc/kalshi-bot.env | xargs) /opt/vitaegis/.venv/bin/python /opt/vitaegis/scripts/kalshi_bot.py --once
   ```

5. **Install the service**:

   ```bash
   sudo cp /opt/vitaegis/scripts/kalshi-bot.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now kalshi-bot
   sudo journalctl -u kalshi-bot -f
   ```

Restart policy is `always` with a 5-second pause, capped at ten restarts in five minutes.
Stop trading: `sudo systemctl stop kalshi-bot`. Update: `cd /opt/vitaegis && sudo git pull
&& sudo systemctl restart kalshi-bot`.

## Speed

- Quotes arrive over the WebSocket and the decision runs on each one; the REST poll every
  15s only discovers the next market and reconciles. Without an API key (dry run) there
  is no WebSocket and the bot polls.
- An order is one signed POST, immediate-or-cancel, so the fill is known in one round
  trip. The bot records that round trip as `latency_ms` on every live order; from
  us-east-1 expect tens of milliseconds.
- Telemetry never sits in the trading path: inserts, patches and broadcasts run on
  daemon threads, and tick broadcasts coalesce to at most four a second.
- The remaining latency is Kalshi's matching engine and the network. Nothing on the
  Vercel side is in the loop.

## Privacy

`/kalshi` is public by request. It shows stake sizes, fills and P&L but never the
balance. To gate it, wrap `KalshiBoard` in `AdminShell` like `/admin/kalshi` does.
