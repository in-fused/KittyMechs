$ErrorActionPreference = 'Stop'
$taskRoot = 'C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$oldReceipt = Join-Path $taskRoot '.sites-runtime\overhaul-20261009\build-061\receipt.json'
if ((Get-FileHash -LiteralPath $oldReceipt -Algorithm SHA256).Hash.ToLowerInvariant() -ne '0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215') { throw 'Old receipt mismatch' }
$checkpoint = Get-Content -LiteralPath (Join-Path $taskRoot '.sites-runtime\overhaul-20261009\build-062\playable-checkpoint.json') -Raw | ConvertFrom-Json
$newReceipt = Join-Path $taskRoot '.sites-runtime\overhaul-20261009\build-062\receipt.json'
if (-not $checkpoint.verified -or (Get-FileHash -LiteralPath $newReceipt -Algorithm SHA256).Hash.ToLowerInvariant() -ne $checkpoint.receiptSHA256) { throw 'New checkpoint mismatch' }
$health = Invoke-RestMethod 'http://localhost:8799/health'
if ($health.rooms -ne 0 -or $health.players -ne 0) { throw 'Owned server not idle' }
$process = Get-CimInstance Win32_Process -Filter 'ProcessId=359304'
if ($process.CommandLine -ne '"C:\Program Files\nodejs\node.exe" --import tsx server/index.ts --production') { throw 'PID command changed' }
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8799)
if ($listeners.Count -ne 1 -or $listeners[0].OwningProcess -ne 359304) { throw 'Listener identity changed' }
$html = (Invoke-WebRequest 'http://localhost:8799/').Content
foreach ($meta in @('<meta name="kittymech-arena" content="same-origin"/>','<meta name="kittymech-client-report" content="local"/>')) {
 if (-not $html.Contains($meta)) { throw 'HTTP identity metadata missing' }
 $html = $html.Replace($meta,'')
}
$expectedHtml = [IO.File]::ReadAllText((Join-Path $taskRoot '.sites-runtime\overhaul-20261009\build-061\playable-root\dist\index.html'))
if ($html -cne $expectedHtml) { throw 'HTTP061 index mismatch' }
$destination = Join-Path $taskRoot 'tools\player-integration-179\server061-stop.json'
if (Test-Path -LiteralPath $destination) { throw 'Transition already attempted' }
@{oldBuild='061';oldPID=359304;oldSession=70124;port=8799;rooms=$health.rooms;players=$health.players;command=$process.CommandLine;newReceipt=$checkpoint.receiptSHA256;observedUTC=[DateTime]::UtcNow.ToString('o');scope='Exact idle owned server only; observe70124 terminal before new062 same8799'} | ConvertTo-Json | Set-Content -LiteralPath $destination -Encoding utf8
Stop-Process -Id 359304
Write-Output 'Exact idle061 PID359304 stopped; await session70124 terminal'
