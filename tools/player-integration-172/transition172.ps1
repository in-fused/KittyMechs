$ErrorActionPreference = 'Stop'
$taskRoot = 'C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$receipt = Join-Path $taskRoot '.sites-runtime\overhaul-20261009\build-060\receipt.json'
if ((Get-FileHash -LiteralPath $receipt -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b') { throw 'Old receipt mismatch' }
$health = Invoke-RestMethod 'http://localhost:8799/health'
if ($health.rooms -ne 0 -or $health.players -ne 0) { throw 'Owned server not idle' }
$process = Get-CimInstance Win32_Process -Filter 'ProcessId=286652'
if ($process.CommandLine -ne '"C:\Program Files\nodejs\node.exe" --import tsx server/index.ts --production') { throw 'PID command changed' }
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8799)
if ($listeners.Count -ne 1 -or $listeners[0].OwningProcess -ne 286652) { throw 'Listener identity changed' }
$destination = Join-Path $taskRoot 'tools\player-integration-172\server060-stop.json'
if (Test-Path -LiteralPath $destination) { throw 'Transition already attempted' }
@{oldBuild='060';oldPID=286652;oldSession=61854;port=8799;health=$health;command=$process.CommandLine;observedUTC=[DateTime]::UtcNow.ToString('o');scope='Exact idle owned server only; root must observe terminal61854 before launching frozen061 on same8799'} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $destination -Encoding utf8
Stop-Process -Id 286652
Write-Output 'Exact idle060 PID286652 stopped; await session61854 terminal'
