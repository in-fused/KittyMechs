$taskRoot='C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$health=Invoke-RestMethod 'http://localhost:8799/health' -TimeoutSec 5
if($health.rooms -ne 0 -or $health.players -ne 0){throw 'Active players: postpone rollback'}
$listener=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -eq 8799} | Select-Object OwningProcess -Unique)
if($listener.Count -ne 1 -or $listener[0].OwningProcess -ne 355416){throw 'Unexpected port owner'}
$process=Get-CimInstance Win32_Process -Filter 'ProcessId=355416'
if($process.Name -ne 'node.exe' -or $process.CommandLine -notlike '*server/index.ts*--production*'){throw 'Unexpected process identity'}
$path=Join-Path $taskRoot '.sites-runtime/overhaul-20261010/live044-stop-critic074-reject.json'
if(Test-Path -LiteralPath $path){throw 'Refuse overwrite'}
Stop-Process -Id 355416
[ordered]@{UTC=[DateTime]::UtcNow.ToString('o');Pid=355416;Health=[ordered]@{Status=$health.status;Rooms=$health.rooms;Players=$health.players};Command=$process.CommandLine;Scope='Independent actualcritic denied combined044: timely readable fragment unproved. Rollback043 same8799; preserve044 candidate/source.'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding utf8
