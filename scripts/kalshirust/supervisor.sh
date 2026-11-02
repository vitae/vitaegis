#!/usr/bin/env bash
# KALSHIRUST supervisor for a Linux host (the Lightsail VPS). Companion to supervisor.ps1.
#
# Polls kalshirust_config.desired_state every 10 s (written by the RUN / STOP buttons on
# vitaegis.com/kalshirust), starts or stops the kalshi-bot systemd service to match, and
# reports the host's state back. Outbound HTTPS only.
#
# Install (expects /etc/kalshi-bot.env with SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and
# SUPABASE_SERVICE_ROLE_KEY, and the kalshi-bot.service unit already in place):
#   sudo cp scripts/kalshirust/supervisor.sh /opt/kalshirust/supervisor.sh && sudo chmod +x /opt/kalshirust/supervisor.sh
#   sudo cp scripts/kalshirust/kalshirust-supervisor.service /etc/systemd/system/
#   sudo systemctl daemon-reload && sudo systemctl enable --now kalshirust-supervisor
set -u
ENV_FILE="${ENV_FILE:-/etc/kalshi-bot.env}"
SERVICE="${SERVICE:-kalshi-bot}"
POLL="${POLL_SECONDS:-10}"
HOST_NAME="$(hostname)"

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [ -z "$URL" ] || [ -z "$KEY" ]; then echo "Supabase URL or service role key missing in $ENV_FILE"; exit 1; fi
CFG="${URL%/}/rest/v1/kalshirust_config?id=eq.1"

desired() {
  curl -sS -m 15 "$CFG&select=desired_state" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    | sed -n 's/.*"desired_state":"\([a-z]*\)".*/\1/p'
}

report() {
  local now; now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  curl -sS -m 15 -X PATCH "$CFG" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "{\"host_name\":\"$HOST_NAME\",\"host_status\":\"$1\",\"host_seen_at\":\"$now\"}" >/dev/null || true
}

echo "KALSHIRUST supervisor on $HOST_NAME | service $SERVICE | polling every ${POLL}s"
while true; do
  want="$(desired || true)"
  if systemctl is-active --quiet "$SERVICE"; then running=1; else running=0; fi
  if [ "$want" = "running" ] && [ "$running" = 0 ]; then
    report starting
    if systemctl start "$SERVICE"; then sleep 2; if systemctl is-active --quiet "$SERVICE"; then report running; else report "error: $SERVICE exited at once (journalctl -u $SERVICE)"; fi
    else report "error: could not start $SERVICE"; fi
  elif [ "$want" = "stopped" ] && [ "$running" = 1 ]; then
    report stopping
    systemctl stop "$SERVICE" || true
    report stopped
  else
    if [ "$running" = 1 ]; then report running; else report stopped; fi
  fi
  sleep "$POLL"
done
