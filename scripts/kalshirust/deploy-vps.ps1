# Deploy kalshiRUST to the Ubuntu VPS from this PC, then hand control to the HUD's RUN button.
#
#   powershell -ExecutionPolicy Bypass -File scripts\kalshirust\deploy-vps.ps1 -VpsIp <ip> -KeyPath C:\path\LightsailDefaultKey.pem
#
# Uploads the project (without target/ and logs) plus .env and kalshi_private.key, runs
# remote-setup.sh on the VPS (Rust, build, systemd services, supervisor), and prints the
# service status. Re-run it any time to ship an update; it is idempotent.
param(
  [Parameter(Mandatory = $true)][string]$VpsIp,
  [Parameter(Mandatory = $true)][string]$KeyPath,
  [string]$User = 'ubuntu',
  [string]$BotDir = 'C:\VITAEGIS\kalshiRUST'
)
$ErrorActionPreference = 'Stop'
$scripts = $PSScriptRoot
$target = "$User@$VpsIp"
if ($VpsIp -match ':') { $scpTarget = "$User@[$VpsIp]" } else { $scpTarget = $target }
$sshOpts = @('-i', $KeyPath, '-o', 'StrictHostKeyChecking=accept-new')

foreach ($f in @("$BotDir\.env", "$BotDir\kalshi_private.key", "$BotDir\Cargo.toml")) {
  if (-not (Test-Path $f)) { throw "Missing $f" }
}

Write-Host "[1/4] packing $BotDir"
$tar = Join-Path $env:TEMP 'kalshirust.tar.gz'
Push-Location $BotDir
try {
  tar -czf $tar --exclude=target --exclude='*.log' --exclude='*.jsonl' --exclude='*.pid' --exclude=.git `
    Cargo.toml Cargo.lock src examples .env kalshi_private.key STRATEGY.md
} finally { Pop-Location }

Write-Host "[2/4] uploading to $target"
ssh @sshOpts $target 'mkdir -p ~/kalshirust-deploy'
scp @sshOpts $tar "$scripts\remote-setup.sh" "$scripts\kalshi-bot.service" "$scripts\kalshirust-supervisor.service" "$scripts\supervisor.sh" "${scpTarget}:~/kalshirust-deploy/"
Remove-Item $tar -Force

Write-Host "[3/4] building and installing on the VPS (first time takes a few minutes)"
ssh @sshOpts $target 'cd ~/kalshirust-deploy && sed -i "s/\r$//" remote-setup.sh supervisor.sh *.service && bash remote-setup.sh'

Write-Host "[4/4] done. Watch it: ssh -i `"$KeyPath`" $target 'sudo journalctl -u kalshi-bot -f -o cat'"
Write-Host "Only one supervisor should answer the HUD: stop the one on this PC if it is still running."
