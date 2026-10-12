$taskRoot='C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$health=Invoke-RestMethod 'http://localhost:8799/health' -TimeoutSec 5
if($health.rooms -ne 0 -or $health.players -ne 0){throw 'Live players: postpone switch'}
$listener=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -eq 8799} | Select-Object OwningProcess -Unique)
if($listener.Count -ne 1 -or $listener[0].OwningProcess -ne 356908){throw 'Unexpected port owner'}
$process=Get-CimInstance Win32_Process -Filter 'ProcessId=356908'
if($process.Name -ne 'node.exe' -or $process.CommandLine -notlike '*server/index.ts*--production*'){throw 'Unexpected process identity'}
Stop-Process -Id 356908
$path=Join-Path $taskRoot '.sites-runtime/overhaul-20261010/live039-stop-for040.json'
if(Test-Path -LiteralPath $path){throw 'Refuse overwrite'}
[ordered]@{UTC=[DateTime]::UtcNow.ToString('o');Pid=356908;Health=$health;Command=$process.CommandLine;Scope='Verified idle owned039server stopped; preserve frozenroot. Reuse8799.'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding utf8
