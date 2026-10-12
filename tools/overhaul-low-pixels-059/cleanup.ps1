$taskRoot='C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$receipt=Get-Content -LiteralPath (Join-Path $taskRoot '.sites-runtime/overhaul-20261010/low059-play-process/process-receipt.json') -Raw | ConvertFrom-Json
$startTime=[DateTimeOffset]::Parse($receipt.startUTC).UtcDateTime
$endTime=[DateTimeOffset]::Parse($receipt.endUTC).UtcDateTime
$owned=@(Get-CimInstance Win32_Process | Where-Object {($_.ParentProcessId -eq $receipt.pid) -or ($_.Name -eq 'msedge.exe' -and $_.CreationDate.ToUniversalTime() -ge $startTime -and $_.CreationDate.ToUniversalTime() -le $endTime -and $_.CommandLine -like '*--headless*' -and $_.CommandLine -like '*playwright_chromiumdev_profile-*')} | Select-Object ProcessId,ParentProcessId,Name)
$health=Invoke-RestMethod 'http://localhost:8799/health' -TimeoutSec 5
$listeners=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -ge 8790 -and $_.LocalPort -le 8806} | Select-Object LocalPort,OwningProcess -Unique)
$result=[ordered]@{UTC=[DateTime]::UtcNow.ToString('o');Owned=$owned;Count=$owned.Count;Health=[ordered]@{Status=$health.status;Rooms=$health.rooms;Players=$health.players};Listeners=$listeners;Scope='Current inventory after041Low059play, not historicaltreeproof.'}
$path=Join-Path $taskRoot '.sites-runtime/overhaul-20261010/low059-cleanup.json'
if(Test-Path -LiteralPath $path){throw 'Refuseoverwrite'}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding utf8
$result | ConvertTo-Json -Depth 5
if($owned.Count -gt 0 -or $listeners.Count -ne 1 -or $listeners[0].LocalPort -ne 8799 -or $listeners[0].OwningProcess -ne 348836){throw 'Unexpectedownership; inspectbeforecleanup'}
