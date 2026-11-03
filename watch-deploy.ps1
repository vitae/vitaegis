$Watcher = New-Object System.IO.FileSystemWatcher
$Watcher.Path = "C:\vitaegis\kalshirust"
$Watcher.Filter = "*.rs"
$Watcher.IncludeSubdirectories = $true
$Watcher.EnableRaisingEvents = $true

$SshExe     = "$env:SystemRoot\System32\OpenSSH\ssh.exe"
$ServerIPv6 = "2600:1f18:2d82:e300:2f40:cf5e:4f06:92b0"
$PemPath    = "C:\vitaegis\lightsail.pem"

Write-Host "[*] Watching C:\vitaegis\kalshirust for code changes..." -ForegroundColor Cyan

# Debounce timer to prevent multi-trigger floods on save
$lastTrigger = [DateTime]::MinValue

$Action = {
    param($sender, $event)
    $global:lastTrigger

    $now = Get-Date
    if (($now - $global:lastTrigger).TotalMilliseconds -lt 1500) { return }
    $global:lastTrigger = $now

    $changedFile = $event.SourceEventArgs.FullPath
    Write-Host "[+] Change detected in: $changedFile" -ForegroundColor Yellow
    Write-Host "[+] Syncing codebase to AWS Lightsail..." -ForegroundColor Green

    # 1. Archive and SCP source files (excluding target/ and git directories)
    # Alternatively, you can use git commit + git push if you track a remote bare repo on the server
    tar --exclude='target' --exclude='.git' -czf code.tar.gz -C C:\vitaegis\kalshirust .
    & $SshExe -6 -i $PemPath "ubuntu@$ServerIPv6" "mkdir -p /home/ubuntu/kalshirust"
    & "$env:SystemRoot\System32\OpenSSH\scp.exe" -6 -i $PemPath code.tar.gz "ubuntu@$ServerIPv6:/home/ubuntu/kalshirust/"
    Remove-Item code.tar.gz

    Write-Host "[+] Compiling release binary on remote server..." -ForegroundColor Green
    & $SshExe -6 -i $PemPath "ubuntu@$ServerIPv6" "cd /home/ubuntu/kalshirust && tar -xzf code.tar.gz && rm code.tar.gz && RUSTFLAGS='-C target-cpu=native' cargo build --release"

    Write-Host "[+] Restarting kalshi_btc_bot systemd service..." -ForegroundColor Green
    & $SshExe -6 -i $PemPath "ubuntu@$ServerIPv6" "sudo systemctl restart kalshi_btc_bot"

    Write-Host "[✔] Deployment complete! Bot is live and running." -ForegroundColor Cyan
}

Register-ObjectEvent $Watcher "Changed" -Action $Action
Register-ObjectEvent $Watcher "Created" -Action $Action

# Keep the script running
while ($true) { Start-Sleep -Seconds 1 }