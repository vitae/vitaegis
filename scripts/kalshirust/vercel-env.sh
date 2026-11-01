#!/usr/bin/env bash
# Point vitaegis.com/kalshi at the bot's status endpoint and redeploy production.
# Usage: bash scripts/kalshirust/vercel-env.sh http://<static-ip>:8080 <token>
# Needs `vercel login` and a linked project (`vercel link`) in this repo.
set -euo pipefail

URL="${1:?status base URL, e.g. http://1.2.3.4:8080}"
TOKEN="${2:-}"

vercel env rm KALSHI_BOT_URL production --yes >/dev/null 2>&1 || true
printf '%s' "$URL" | vercel env add KALSHI_BOT_URL production
if [ -n "$TOKEN" ]; then
  vercel env rm KALSHI_BOT_TOKEN production --yes >/dev/null 2>&1 || true
  printf '%s' "$TOKEN" | vercel env add KALSHI_BOT_TOKEN production --sensitive
fi

vercel --prod
echo
echo "Verify: curl -s https://www.vitaegis.com/api/bot-status | jq .vps"
