# KALSHIRUST supervisor for a Windows host (AWS EC2/Lightsail Windows, or this PC).
#
# The RUN / STOP buttons on vitaegis.com/kalshirust write kalshirust_config.desired_state.
# This script polls that row every 10 seconds, starts or stops the bot to match, and reports
# the host's state back so the page can show it. Nothing listens on a port; it only makes
# outbound HTTPS calls to Supabase.
#
#   One-time install (runs at every boot as a scheduled task, starts now):
#     powershell -ExecutionPolicy Bypass -File scripts\kalshirust\supervisor.ps1 -Install
#   Run in the foreground instead:
#     powershell -ExecutionPolicy Bypass -File scripts\kalshirust\supervisor.ps1
#   Remove:
#     powershell -ExecutionPolicy Bypass -File scripts\kalshirust\supervisor.ps1 -Uninstall
#
# It reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the bot's .env.
param(
  [string]$BotDir = "C:\VITAEGIS\kalshiRUST",
  [int]$PollSeconds = 10,
  [switch]$Install,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Continue'
$taskName = 'KALSHIRUST Supervisor'
$exe = Join-Path $BotDir 'target\release\kalshi_btc_bot.exe'
$logFile = Join-Path $BotDir 'kalshirust.log'
$errFile = Join-Path $BotDir 'kalshirust.err.log'
$pidFile = Join-Path $BotDir 'kalshirust.pid'
$hostName = $env:COMPUTERNAME

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task '$taskName'."
  exit 0
}

if ($Install) {
  $self = $MyInvocation.MyCommand.Path
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$self`" -BotDir `"$BotDir`""
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Installed and started scheduled task '$taskName' (runs at boot, restarts if it dies)."
  exit 0
}

function Read-DotEnv([string]$path) {
  $map = @{}
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') { $map[$matches[1]] = $matches[2].Trim().Trim('"') }
    }
  }
  return $map
}

$envMap = Read-DotEnv (Join-Path $BotDir '.env')
$supaUrl = $envMap['SUPABASE_URL']; if (-not $supaUrl) { $supaUrl = $envMap['NEXT_PUBLIC_SUPABASE_URL'] }
$supaKey = $envMap['SUPABASE_SERVICE_ROLE_KEY']
if (-not $supaUrl -or -not $supaKey) { Write-Host "Supabase URL or service role key missing in $BotDir\.env"; exit 1 }
$headers = @{ apikey = $supaKey; Authorization = "Bearer $supaKey"; 'Content-Type' = 'application/json'; Prefer = 'return=minimal' }
$configUrl = "$($supaUrl.TrimEnd('/'))/rest/v1/kalshirust_config?id=eq.1"

function Get-Desired {
  try {
    $rows = Invoke-RestMethod -Uri "$configUrl&select=desired_state" -Headers $headers -Method Get -TimeoutSec 15
    if ($rows -and $rows.Count -gt 0) { return $rows[0].desired_state }
  } catch { Write-Host "poll failed: $($_.Exception.Message)" }
  return $null
}

function Report([string]$status) {
  $body = @{ host_name = $hostName; host_status = $status; host_seen_at = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
  try { Invoke-RestMethod -Uri $configUrl -Headers $headers -Method Patch -Body $body -TimeoutSec 15 | Out-Null } catch { Write-Host "report failed: $($_.Exception.Message)" }
}

function Get-Bot {
  if (Test-Path $pidFile) {
    $savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($savedPid) { $p = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue; if ($p -and -not $p.HasExited) { return $p } }
  }
  return Get-Process -Name 'kalshi_btc_bot' -ErrorAction SilentlyContinue | Select-Object -First 1
}

Write-Host "KALSHIRUST supervisor on $hostName | bot $exe | polling every ${PollSeconds}s"
while ($true) {
  $desired = Get-Desired
  $bot = Get-Bot
  $running = [bool]$bot
  if ($desired -eq 'running' -and -not $running) {
    if (-not (Test-Path $exe)) {
      Report "error: bot exe not found at $exe (run cargo build --release)"
    } else {
      Report 'starting'
      try {
        $p = Start-Process -FilePath $exe -WorkingDirectory $BotDir -RedirectStandardOutput $logFile -RedirectStandardError $errFile -WindowStyle Hidden -PassThru
        Set-Content -Path $pidFile -Value $p.Id
        Write-Host "$(Get-Date -Format s) started bot pid $($p.Id)"
        Start-Sleep -Seconds 2
        $running = -not $p.HasExited
        Report $(if ($running) { 'running' } else { "error: bot exited at once, see $errFile" })
      } catch { Report "error: $($_.Exception.Message)" }
    }
  } elseif ($desired -eq 'stopped' -and $running) {
    Report 'stopping'
    try { Stop-Process -Id $bot.Id -Force -ErrorAction Stop; Write-Host "$(Get-Date -Format s) stopped bot pid $($bot.Id)" } catch { Write-Host "stop failed: $($_.Exception.Message)" }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Report 'stopped'
  } else {
    Report $(if ($running) { 'running' } else { 'stopped' })
  }
  Start-Sleep -Seconds $PollSeconds
}
