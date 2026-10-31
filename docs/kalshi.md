# Kalshi bot

`scripts/kalshi_bot.py` watches the soonest-closing KXBTC15M (15-minute Bitcoin) market
and buys the cheap side when the crowd is heavy on the other: YES ask at or above 72¢
makes NO at 8–28¢ a buy, and the mirror for YES. It polls every 15 seconds, places at most
one order per market and six per day, and runs dry until started with `--live`.

The site shows what the bot is doing at `/admin/kalshi`. The bot never runs on Vercel:
a 15-second loop needs an always-on process, so it runs on a small server and logs to
Supabase, and the admin page reads that log.

## Files

- `scripts/kalshi_bot.py` — the bot. Config, signed Kalshi client, pure strategy helpers,
  the loop, and an optional Supabase sink that writes on a background thread.
- `scripts/kalshi-bot.service` — systemd unit that keeps it running and restarts it.
- `supabase/migrations/20261031120000_kalshi_events.sql` — the `kalshi_events` table.
- `lib/kalshi.ts` — shared row type and `summarize()`, tested in `lib/kalshi.test.ts`.
- `app/api/admin/kalshi/route.ts` — reads the newest rows behind the admin key.
- `app/admin/kalshi/` — the dashboard: online/offline, mode, balance, the market being
  watched with its asks and whether it is in the entry zone, orders, errors, recent ticks.

## Kalshi API notes

Verified against the OpenAPI spec at docs.kalshi.com in October 2026.

- Host `https://external-api.kalshi.com`, prefix `/trade-api/v2`. Sign
  `timestamp_ms + METHOD + path` where path includes the prefix and excludes the query.
  RSA-PSS with SHA-256, base64.
- Market prices are fixed-point dollar strings (`yes_ask_dollars: "0.8400"`). The old cent
  fields are gone.
- Orders go to `POST /portfolio/events/orders` with `side: bid|ask` on the YES book and a
  dollar-string `price`. Buying NO at q¢ is an `ask` at `1 - q`. Count is a string.
- Prices on the public markets endpoint rate-limit by IP; the bot backs off on 429.

## Setup

1. Supabase SQL editor: run `supabase/migrations/20261031120000_kalshi_events.sql`.
2. Vercel already has `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
   `CONTENT_ADMIN_KEY`; nothing new is needed for the dashboard.
3. Run the bot somewhere always-on (below). Open `/admin/kalshi` with the admin key.

## Running 24/7 on an AWS EC2 instance

Kalshi serves from AWS us-east-1, so a server there keeps round trips to a few
milliseconds. A `t4g.nano` (2 vCPU Arm, 512 MB) is more than the bot needs and costs about
$3 a month; `t3.micro` is in the free tier for a year.

1. **Launch**: EC2 → Launch instance → Ubuntu 24.04 LTS, `t4g.nano`, region us-east-1.
   Create a key pair, allow SSH only from your IP. Nothing inbound otherwise.
2. **Base packages** (on the instance):

   ```bash
   sudo apt-get update && sudo apt-get install -y python3-venv git
   sudo useradd --system --home /opt/vitaegis --shell /usr/sbin/nologin kalshi
   sudo git clone https://github.com/vitae/vitaegis /opt/vitaegis
   sudo python3 -m venv /opt/vitaegis/.venv
   sudo /opt/vitaegis/.venv/bin/pip install requests cryptography
   ```

3. **Secrets**: copy your Kalshi private key up with `scp` and write the env file. Both are
   readable only by the service user.

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

4. **Dry run first**, as the service user, to see one tick and confirm auth and telemetry:

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

Restart policy is `always` with a 5-second pause, capped at ten restarts in five minutes
so a bad key cannot hammer the API. To stop trading: `sudo systemctl stop kalshi-bot`.
To update: `cd /opt/vitaegis && sudo git pull && sudo systemctl restart kalshi-bot`.

## Speed

The loop is one unauthenticated GET per 15 seconds and one signed POST per order. The
private key is loaded once; the HTTP session is reused; telemetry writes happen on a
daemon thread after the order call returns, so they add nothing to order latency. Orders
default to immediate-or-cancel, so nothing rests on the book and fills later at a stale
price. Lower `KALSHI_POLL_SECONDS` only with care: the public markets endpoint 429s by IP.
