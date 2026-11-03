# Starts kalshi_bot.py on Windows. Put this file, kalshi_bot.py, kalshi-requirements.txt
# and your Kalshi private key (kalshi_private.key) in the same folder, e.g. C:\VITAEGIS\kalshi
#
#   Test run (no real orders):   powershell -ExecutionPolicy Bypass -File run_kalshi.ps1
#   Real trading:                powershell -ExecutionPolicy Bypass -File run_kalshi.ps1 -Live
param([switch]$Live)

Set-Location $PSScriptRoot
python -m pip install -q -r kalshi-requirements.txt

$env:KALSHI_KEY_ID               = "1889a30d-45b7-4316-9e2a-8955c0a3959f"
$env:KALSHI_PRIVATE_KEY_PATH     = "$PSScriptRoot\kalshi_private.key"
$env:KALSHI_TARGET_PROFIT_USD    = "7.50"   # a win nets about this after fees
$env:KALSHI_MAX_RISK_USD         = "8"      # most one trade can lose (keep small vs your balance)
$env:KALSHI_DAILY_LOSS_LIMIT_USD = "10"     # stop for the day after this much loss
$env:KALSHI_MIN_ENTRY_CENTS      = "65"     # backtest best: buy the favorite at 65-80c
$env:KALSHI_MAX_ENTRY_CENTS      = "80"
$env:KALSHI_MIN_SECONDS_TO_CLOSE = "600"    # only buy in the first 5 minutes of each market
$env:KALSHI_MAX_ORDERS_PER_DAY   = "40"

if (-not (Test-Path $env:KALSHI_PRIVATE_KEY_PATH)) {
  Write-Host "Missing kalshi_private.key in $PSScriptRoot - download it from Kalshi (Account > API Keys)." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "$PSScriptRoot\kalshi_hub.html")) {
  Write-Host "kalshi_hub.html not found - the dashboard will be blank. Put it next to kalshi_bot.py." -ForegroundColor Yellow
}
# Open the live dashboard a few seconds after the bot starts
Start-Job { Start-Sleep 4; Start-Process "http://localhost:8787" } | Out-Null

if ($Live) { python kalshi_bot.py --live } else { python kalshi_bot.py }