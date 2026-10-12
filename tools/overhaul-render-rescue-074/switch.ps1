$taskRoot='C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$health=Invoke-RestMethod 'http://localhost:8799/health' -TimeoutSec 5
if($health.rooms -ne 0 -or $health.players -ne 0){throw 'Active players: do not switch'}
$listener=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -eq 8799} | Select-Object OwningProcess -Unique)
if($listener.Count -ne 1 -or $listener[0].OwningProcess -ne 346488){throw 'Unexpected port owner'}
$process=Get-CimInstance Win32_Process -Filter 'ProcessId=346488'
if($process.Name -ne 'node.exe' -or $process.CommandLine -notlike '*server/index.ts*--production*'){throw 'Unexpected process identity'}
$path=Join-Path $taskRoot '.sites-runtime/overhaul-20261010/live043-stop-for044-review.json'
if(Test-Path -LiteralPath $path){throw 'Refuse overwrite'}
Stop-Process -Id 346488
[ordered]@{UTC=[DateTime]::UtcNow.ToString('o');Pid=346488;Health=[ordered]@{Status=$health.status;Rooms=$health.rooms;Players=$health.players};Command=$process.CommandLine;Scope='Idle verified043 stopped for044 limited review on same8799; rollback043 on firstfailure.'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding utf8
