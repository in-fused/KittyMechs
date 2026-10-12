$taskRoot = 'C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$receipt = Get-Content -LiteralPath (Join-Path $taskRoot '.sites-runtime/overhaul-20261010/guest-readiness-046-process/process-receipt.json') -Raw | ConvertFrom-Json
$startTime = [DateTimeOffset]::Parse($receipt.startUTC).UtcDateTime
$endTime = [DateTimeOffset]::Parse($receipt.endUTC).UtcDateTime
$owned = @(Get-CimInstance Win32_Process | Where-Object {
  ($_.ParentProcessId -eq $receipt.pid) -or
  ($_.Name -eq 'msedge.exe' -and $_.CreationDate.ToUniversalTime() -ge $startTime -and $_.CreationDate.ToUniversalTime() -le $endTime -and $_.CommandLine -like '*--headless*' -and $_.CommandLine -like '*playwright_chromiumdev_profile-*')
} | Select-Object ProcessId,ParentProcessId,Name,CommandLine)
$health = Invoke-RestMethod 'http://localhost:8799/health' -TimeoutSec 5
$result = [ordered]@{VerifiedUTC=[DateTime]::UtcNow.ToString('o');LiveOwnedParentChildrenOrMatchingHeadlessLaunches=$owned;Count=$owned.Count;Health=[ordered]@{Status=$health.status;Rooms=$health.rooms;Players=$health.players};Scope='Read-only current process inventory and server health; source cleanup used allSettled and this is not a historical process-tree trace.'}
$path = Join-Path $taskRoot '.sites-runtime/overhaul-20261010/guest046-cleanup-verification.json'
if (Test-Path -LiteralPath $path) {throw 'Refuse overwrite'}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding utf8
$result | ConvertTo-Json -Depth 5
if ($owned.Count -gt 0) {throw 'Matching owned processes remain; inspect before targeted cleanup'}
