# Copy the service_role key in the Supabase dashboard, then run this. It reads the key from
# your clipboard, checks it belongs to the VITAEGIS project, writes it into both env files,
# and makes one test request. The key is never printed.
$ref = 'fsrxacvcqftelbjdqlnm'
$files = @("$PSScriptRoot\.env", "$PSScriptRoot\..\.env.local")

$k = (Get-Clipboard -Raw)
if (-not $k) { Write-Host 'Clipboard is empty. Click Copy next to service_role first.'; exit 1 }
$k = $k.Trim()
$parts = $k -split '\.'
if (-not $k.StartsWith('eyJ') -or $parts.Count -ne 3) { Write-Host 'Clipboard does not hold a JWT.'; exit 1 }
$payload = $parts[1].Replace('-', '+').Replace('_', '/')
switch ($payload.Length % 4) { 2 { $payload += '==' } 3 { $payload += '=' } }
$claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
if ($claims.role -ne 'service_role' -or $claims.ref -ne $ref) {
  Write-Host "That JWT is role=$($claims.role) ref=$($claims.ref); expected service_role for $ref."; exit 1
}

foreach ($f in $files) {
  $lines = Get-Content $f
  $lines = $lines | ForEach-Object { if ($_ -like 'SUPABASE_SERVICE_ROLE_KEY=*') { "SUPABASE_SERVICE_ROLE_KEY=$k" } else { $_ } }
  if (-not ($lines -like 'SUPABASE_SERVICE_ROLE_KEY=*')) { $lines += "SUPABASE_SERVICE_ROLE_KEY=$k" }
  Set-Content -Path $f -Value $lines -Encoding ascii
  Write-Host "Updated $f"
}

$h = @{ apikey = $k; Authorization = "Bearer $k" }
$r = Invoke-WebRequest -Uri "https://$ref.supabase.co/rest/v1/kalshirust_config?select=mode" -Headers $h -UseBasicParsing
Write-Host "Supabase test: HTTP $($r.StatusCode) -> $($r.Content)"
Set-Clipboard -Value ' '
Write-Host 'Clipboard cleared. Restart the bot.'
