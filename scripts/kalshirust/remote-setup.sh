#!/usr/bin/env bash
# Runs ON the Ubuntu VPS (deploy-vps.ps1 uploads and invokes it). Idempotent.
#
# Expects in the current directory: kalshirust.tar.gz (the project: src, Cargo.*, examples,
# .env, kalshi_private.key), kalshi-bot.service, kalshirust-supervisor.service, supervisor.sh.
#
# Result: /opt/kalshirust (code + release build), /var/lib/kalshirust (runtime files, owned
# by the kalshi user), /etc/kalshi-bot.env (env for the supervisor), both services enabled.
set -euo pipefail

echo "[1/6] packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq build-essential pkg-config libssl-dev curl ca-certificates >/dev/null

echo "[2/6] rust"
if ! command -v cargo >/dev/null 2>&1 && [ ! -x "$HOME/.cargo/bin/cargo" ]; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal >/dev/null
fi
export PATH="$HOME/.cargo/bin:$PATH"
cargo --version

echo "[3/6] code -> /opt/kalshirust"
sudo mkdir -p /opt/kalshirust
sudo chown "$USER":"$USER" /opt/kalshirust
tar -xzf kalshirust.tar.gz -C /opt/kalshirust
cd /opt/kalshirust
cargo build --release 2>&1 | tail -2
cd - >/dev/null

echo "[4/6] runtime -> /var/lib/kalshirust"
id -u kalshi >/dev/null 2>&1 || sudo useradd --system --home /var/lib/kalshirust --shell /usr/sbin/nologin kalshi
sudo mkdir -p /var/lib/kalshirust
sudo cp /opt/kalshirust/.env /var/lib/kalshirust/.env
sudo cp /opt/kalshirust/kalshi_private.key /var/lib/kalshirust/kalshi_private.key
# Keep secrets out of the read-only code tree and give them to the bot user only.
sudo rm -f /opt/kalshirust/.env /opt/kalshirust/kalshi_private.key
sudo chown -R kalshi:kalshi /var/lib/kalshirust
sudo chmod 600 /var/lib/kalshirust/.env /var/lib/kalshirust/kalshi_private.key
sudo cp /var/lib/kalshirust/.env /etc/kalshi-bot.env
sudo chmod 600 /etc/kalshi-bot.env

echo "[5/6] services"
sudo cp kalshi-bot.service /etc/systemd/system/kalshi-bot.service
sudo cp kalshirust-supervisor.service /etc/systemd/system/kalshirust-supervisor.service
sudo cp supervisor.sh /opt/kalshirust/supervisor.sh
sudo chmod +x /opt/kalshirust/supervisor.sh
sudo systemctl daemon-reload
sudo systemctl enable kalshi-bot >/dev/null
sudo systemctl enable --now kalshirust-supervisor
sudo systemctl restart kalshi-bot

echo "[6/6] status"
sleep 4
systemctl is-active kalshi-bot && sudo journalctl -u kalshi-bot -n 8 --no-pager -o cat
systemctl is-active kalshirust-supervisor
echo "Done. RUN / STOP on vitaegis.com/kalshirust now control this host ($(hostname))."
