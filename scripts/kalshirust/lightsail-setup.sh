#!/usr/bin/env bash
# Attach a static IP to the bot's Lightsail instance and open the status port.
# Usage: bash scripts/kalshirust/lightsail-setup.sh <instance-name> [region] [port]
# Needs the AWS CLI logged in to the account that owns the instance.
set -euo pipefail

INSTANCE="${1:?instance name (aws lightsail get-instances --query 'instances[].name')}"
REGION="${2:-us-east-1}"
PORT="${3:-8080}"
STATIC_NAME="${INSTANCE}-ip"

aws lightsail get-instance --region "$REGION" --instance-name "$INSTANCE" \
  --query 'instance.{name:name,state:state.name,ip:publicIpAddress,static:isStaticIp}' --output table

if [ "$(aws lightsail get-instance --region "$REGION" --instance-name "$INSTANCE" --query 'instance.isStaticIp' --output text)" != "True" ]; then
  if ! aws lightsail get-static-ip --region "$REGION" --static-ip-name "$STATIC_NAME" >/dev/null 2>&1; then
    aws lightsail allocate-static-ip --region "$REGION" --static-ip-name "$STATIC_NAME" >/dev/null
  fi
  aws lightsail attach-static-ip --region "$REGION" --static-ip-name "$STATIC_NAME" --instance-name "$INSTANCE" >/dev/null
fi

# Keep SSH and open the status port to any source; the bearer token guards it.
aws lightsail put-instance-public-ports --region "$REGION" --instance-name "$INSTANCE" --port-infos \
  "fromPort=22,toPort=22,protocol=tcp" \
  "fromPort=${PORT},toPort=${PORT},protocol=tcp,cidrs=0.0.0.0/0"

IP="$(aws lightsail get-instance --region "$REGION" --instance-name "$INSTANCE" --query 'instance.publicIpAddress' --output text)"
echo
echo "Static IP: $IP"
echo "Status URL for Vercel: http://${IP}:${PORT}"
echo "Next: bash scripts/kalshirust/vercel-env.sh http://${IP}:${PORT} <token>"
