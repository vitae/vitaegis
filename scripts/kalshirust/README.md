# Status endpoint for the Rust bot

Drop-in HTTP status server for `C:\vitaegis\kalshirust`, so vitaegis.com/kalshi can show
`[LIGHTSAIL VPS: ONLINE]`, `[KALSHI WSS: ACTIVE]`, `[MODE: LIVE]`, the bot's spot, window,
bet count and log tail. The HUD polls it through `/api/bot-status` every 15 s.

## 1. Add the module

Copy `status.rs` into the bot's `src/`, then in `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = "0.4"
```

In `main.rs`:

```rust
mod status;

#[tokio::main]
async fn main() {
    let (status, addr) = status::from_env(); // KALSHI_STATUS_ADDR, KALSHI_STATUS_TOKEN
    tokio::spawn(status::serve(status.clone(), addr));

    // Trading loop: keep the snapshot current and log what the HUD should show.
    status.update(|s| {
        s.live = live;
        s.kalshi_ws = ws_connected;
        s.ticker = Some(market.ticker.clone());
        s.close_time = Some(market.close_time.clone()); // RFC 3339
        s.strike = Some(market.floor_strike);
        s.spot = Some(spot);
        s.bets_in_window = bets_this_window;
        s.bankroll_cents = Some(balance_cents);
    });
    status.log("info", format!("ws tick yes={yes_ask} no={no_ask}"));
}
```

`serve` answers `GET /status` (JSON, bearer-protected when `KALSHI_STATUS_TOKEN` is set) and
`GET /health` (plain `ok`, open). Default bind is `0.0.0.0:8080`.

## 2. Environment on the VPS

`/etc/kalshi-bot.env` (mode 600, read by the systemd unit):

```
KALSHI_STATUS_ADDR=0.0.0.0:8080
KALSHI_STATUS_TOKEN=<long random string>
SUPABASE_URL=https://fsrxacvcqftelbjdqlnm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key, never NEXT_PUBLIC_>
```

Generate a token with `openssl rand -hex 32`. `kalshi-bot.service` here is a unit for the
Rust binary; `scripts/kalshi-bot.service` at the repo root is the old Python one.

## 3. Lightsail: static IP and firewall

`lightsail-setup.sh` does both with the AWS CLI from your own machine:

```bash
bash scripts/kalshirust/lightsail-setup.sh <instance-name> [region] [port]
```

It attaches a static IP (allocating one if needed) and opens the status port to any
source. Vercel functions have no fixed egress IPs, so the port must be open; the bearer
token is what keeps it private. For TLS put Caddy in front (`caddy reverse-proxy --from
bot.vitaegis.com --to :8080`) and open 443 instead.

## 4. Vercel

`vercel-env.sh` sets `KALSHI_BOT_URL` and `KALSHI_BOT_TOKEN` on production and redeploys:

```bash
bash scripts/kalshirust/vercel-env.sh http://<static-ip>:8080 <token>
```

Or in the dashboard: Project → Settings → Environment Variables → Production, then
Deployments → Redeploy. Env changes only apply to new deployments.

## 5. Verify

```bash
curl -s -H "Authorization: Bearer <token>" http://<static-ip>:8080/status
curl -s https://www.vitaegis.com/api/bot-status
```

The second should show `"vps": {"configured": true, "ok": true, "latencyMs": …}` and the
header pill on `/kalshi` flips to `[LIGHTSAIL VPS: ONLINE 40ms]`.

## RUN / STOP from the HUD

vitaegis.com/kalshirust has RUN and STOP buttons (admin key required). They write
`kalshirust_config.desired_state`; a supervisor on the bot's host polls it every 10 s,
starts or stops the bot, and reports `host_status` back, which the page shows as the host
pill. The bot also heartbeats while it runs. Outbound HTTPS only; no ports to open.

Windows host (AWS Windows instance or the PC running the bot), once, as the user who owns
the bot folder:

    powershell -ExecutionPolicy Bypass -File scripts\kalshirust\supervisor.ps1 -Install

That registers a scheduled task that starts at boot and restarts itself. It reads the
Supabase URL and service role key from `kalshiRUST\.env` and starts
`target\release\kalshi_btc_bot.exe` with its output in `kalshirust.log`.

Linux host (the Lightsail VPS), with `kalshi-bot.service` installed and
`/etc/kalshi-bot.env` holding `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and
`SUPABASE_SERVICE_ROLE_KEY`:

    sudo cp scripts/kalshirust/supervisor.sh /opt/kalshirust/supervisor.sh && sudo chmod +x /opt/kalshirust/supervisor.sh
    sudo cp scripts/kalshirust/kalshirust-supervisor.service /etc/systemd/system/
    sudo systemctl daemon-reload && sudo systemctl enable --now kalshirust-supervisor
