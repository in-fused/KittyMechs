$ErrorActionPreference = 'Stop'
$taskStatePath = Join-Path $PSScriptRoot '.sites-runtime/online-session.json'
if (!(Test-Path -LiteralPath $taskStatePath)) { Write-Output 'No public session is recorded.'; exit 0 }
$taskSession = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
foreach ($taskEntry in @(@{id=$taskSession.tunnelPid;started=$taskSession.tunnelStarted;name='cloudflared'},@{id=$taskSession.awakePid;started=$taskSession.awakeStarted;name='pwsh'})) {
    if (!$taskEntry.id -or !$taskEntry.started) { continue }
    $taskProcess = Get-Process -Id $taskEntry.id -ErrorAction SilentlyContinue
    if ($taskProcess -and $taskProcess.ProcessName -eq $taskEntry.name -and $taskProcess.StartTime.ToUniversalTime().ToString('o') -eq $taskEntry.started) { Stop-Process -Id $taskProcess.Id }
}
Write-Output 'The temporary public link is stopped. The local arena remains available.'
