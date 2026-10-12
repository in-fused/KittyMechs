param([Parameter(Mandatory=$true)][int]$TunnelPid,[Parameter(Mandatory=$true)][string]$TunnelStarted)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System.Runtime.InteropServices;
public static class KittyMechPowerRequest {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@
try {
    [KittyMechPowerRequest]::SetThreadExecutionState([uint32]2147483649) | Out-Null
    while ($true) {
        $taskTunnelProcess = Get-Process -Id $TunnelPid -ErrorAction SilentlyContinue
        if (!$taskTunnelProcess -or $taskTunnelProcess.ProcessName -ne 'cloudflared' -or $taskTunnelProcess.StartTime.ToUniversalTime().ToString('o') -ne $TunnelStarted) { break }
        Start-Sleep -Seconds 10
    }
} finally { [KittyMechPowerRequest]::SetThreadExecutionState([uint32]2147483648) | Out-Null }
