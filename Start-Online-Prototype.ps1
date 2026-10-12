$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskRuntime = Join-Path $taskRoot '.sites-runtime'
New-Item -ItemType Directory -Path $taskRuntime -Force | Out-Null
$taskArenaRoot = $taskRoot
$taskLivePointer = Join-Path $taskRuntime 'live-build.json'
if (Test-Path -LiteralPath $taskLivePointer) {
    $taskLive = Get-Content -LiteralPath $taskLivePointer -Raw | ConvertFrom-Json
    $taskLiveDirectory = [System.IO.Path]::GetFullPath([string]$taskLive.directory)
    if (!$taskLiveDirectory.StartsWith($taskRoot + [System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath (Join-Path $taskLiveDirectory 'server/index.ts')) -or !(Test-Path -LiteralPath (Join-Path $taskLiveDirectory 'dist/index.html'))) { throw 'Live build pointer is outside the project or incomplete.' }
    $taskArenaRoot = $taskLiveDirectory
}
function Save-PublicSession([string]$taskUrl,[int]$taskTunnelPid) {
    $taskTunnelProcess = Get-Process -Id $taskTunnelPid
    $taskTunnelStarted = $taskTunnelProcess.StartTime.ToUniversalTime().ToString('o')
    $taskAwake = Start-Process -FilePath (Get-Command pwsh).Source -ArgumentList @('-NoProfile','-File',('"'+(Join-Path $taskRoot 'Keep-Online-Awake.ps1')+'"'),'-TunnelPid',[string]$taskTunnelPid,'-TunnelStarted',$taskTunnelStarted) -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardError (Join-Path $taskRuntime 'awake-error.log') -PassThru
    @{url=$taskUrl;tunnelPid=$taskTunnelPid;tunnelStarted=$taskTunnelStarted;awakePid=$taskAwake.Id;awakeStarted=$taskAwake.StartTime.ToUniversalTime().ToString('o');arenaPort=8788;startedAt=(Get-Date).ToUniversalTime().ToString('o');temporary=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRuntime 'online-session.json')
}
$taskCloudflared = Join-Path $taskRuntime 'cloudflared.exe'
if (!(Test-Path -LiteralPath $taskCloudflared)) {
    $taskRelease = Invoke-RestMethod 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest'
    $taskAsset = $taskRelease.assets | Where-Object { $_.name -eq 'cloudflared-windows-amd64.exe' } | Select-Object -First 1
    if (!$taskAsset) { throw 'Official Windows cloudflared release is unavailable.' }
    Invoke-WebRequest -Uri $taskAsset.browser_download_url -OutFile $taskCloudflared
    $taskHash = (Get-FileHash -LiteralPath $taskCloudflared -Algorithm SHA256).Hash.ToLowerInvariant()
    if (!$taskAsset.digest -or $taskAsset.digest -ne ('sha256:' + $taskHash)) { throw 'Cloudflared digest does not match the official release.' }
    @{version=$taskRelease.tag_name;source=$taskAsset.browser_download_url;sha256=$taskHash} | ConvertTo-Json | Set-Content (Join-Path $taskRuntime 'cloudflared-receipt.json')
}
$taskReceiptPath = Join-Path $taskRuntime 'cloudflared-receipt.json'
if (!(Test-Path -LiteralPath $taskReceiptPath)) { throw 'The verified cloudflared receipt is missing.' }
$taskReceipt = Get-Content -LiteralPath $taskReceiptPath -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $taskCloudflared -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskReceipt.sha256) { throw 'Cloudflared integrity check failed.' }
try { $taskHealth = Invoke-RestMethod 'http://127.0.0.1:8788/health' -TimeoutSec 3 } catch { $taskHealth = $null }
if (!$taskHealth -or $taskHealth.tickRate -ne 60) {
    if (!(Test-Path -LiteralPath (Join-Path $taskArenaRoot 'dist/index.html'))) { throw 'Run npm run build first.' }
    $taskPreviousPort = $env:PORT
    try {
        $env:PORT = '8788'
        $taskArena = Start-Process -FilePath (Get-Command node).Source -ArgumentList @(('"'+(Join-Path $taskRoot 'node_modules/tsx/dist/cli.mjs')+'"'),'server/index.ts','--production') -WorkingDirectory $taskArenaRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRuntime 'arena-out.log') -RedirectStandardError (Join-Path $taskRuntime 'arena-error.log') -PassThru
    } finally { $env:PORT = $taskPreviousPort }
    for ($taskRetry=0;$taskRetry -lt 15;$taskRetry++) {
        Start-Sleep -Milliseconds 500
        try { $taskHealth = Invoke-RestMethod 'http://127.0.0.1:8788/health' -TimeoutSec 1; break } catch {}
    }
    if (!$taskHealth) { throw 'The arena server did not start. Inspect .sites-runtime/arena-error.log.' }
}
$taskStatePath = Join-Path $taskRuntime 'online-session.json'
if (Test-Path -LiteralPath $taskStatePath) {
    $taskExisting = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
    $taskProcess = Get-Process -Id $taskExisting.tunnelPid -ErrorAction SilentlyContinue
    if ($taskProcess -and $taskProcess.ProcessName -eq 'cloudflared') {
        $taskAwake = if ($taskExisting.awakePid) { Get-Process -Id $taskExisting.awakePid -ErrorAction SilentlyContinue } else { $null }
        if (!$taskAwake) { Save-PublicSession $taskExisting.url $taskExisting.tunnelPid }
        Write-Output $taskExisting.url; exit 0
    }
}
$taskTunnelLog = Join-Path $taskRuntime 'tunnel-error.log'
$taskTunnel = Start-Process -FilePath $taskCloudflared -ArgumentList @('tunnel','--no-autoupdate','--protocol','http2','--url','http://127.0.0.1:8788') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRuntime 'tunnel-out.log') -RedirectStandardError $taskTunnelLog -PassThru
for ($taskRetry=0;$taskRetry -lt 60;$taskRetry++) {
    Start-Sleep -Milliseconds 500
    $taskLog = Get-Content -LiteralPath $taskTunnelLog -Raw -ErrorAction SilentlyContinue
    if ($taskLog -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $taskUrl = $Matches[0]
        Save-PublicSession $taskUrl $taskTunnel.Id
        Write-Output $taskUrl
        exit 0
    }
    if ($taskTunnel.HasExited) { throw ('Tunnel exited: ' + $taskLog) }
}
throw 'Tunnel did not report an address. Inspect .sites-runtime/tunnel-error.log.'
