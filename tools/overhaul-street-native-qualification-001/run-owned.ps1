$ErrorActionPreference='Stop'
$taskStarted=[Diagnostics.Stopwatch]::GetTimestamp()
$workspace='C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
$packet=Join-Path $workspace 'tools\overhaul-street-native-qualification-001'
$out=Join-Path $workspace '.sites-runtime\overhaul-20261010\overhaul-street-native-qualification-001'
$nodeExe='C:\Program Files\nodejs\node.exe'
if((Get-Location).Path -ne $workspace){throw 'Frozen workspace mismatch STOP'}
$rootReceipt=Join-Path $out 'watchdog-result.json'
if((Test-Path -LiteralPath $rootReceipt) -or (Test-Path -LiteralPath (Join-Path $out 'raw.ndjson')) -or (Test-Path -LiteralPath (Join-Path $out 'native-stdout.txt'))){throw 'Single-run output already exists STOP'}
$startUtc=[DateTime]::UtcNow.ToString('o')
$actual=$null;$startupFailure=$null;$nodeHash=$null
try {
  $seal=Get-Content -LiteralPath (Join-Path $out 'source-seal.json') -Raw | ConvertFrom-Json
  foreach($row in $seal.inputs){if((Get-FileHash -LiteralPath (Join-Path $workspace $row.path) -Algorithm SHA256).Hash -ne $row.sha256){throw "Frozen source mismatch STOP: $($row.path)"}}
  $nodeHash=(Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash
  if($nodeHash -ne $seal.nodeExecutable.sha256){throw 'Frozen actual Node executable mismatch STOP'}
  # Runtime Add-Type compilation/startup counts in the external 180-second budget.
  Add-Type -TypeDefinition (Get-Content -LiteralPath (Join-Path $packet 'OwnedJob.cs') -Raw)
  $actual=[StreetOwnedJob001]::Run($nodeExe,$workspace,(Join-Path $out 'native-stdout.txt'),$taskStarted)
} catch {$startupFailure=$_.Exception.ToString()}
$wall=([Diagnostics.Stopwatch]::GetTimestamp()-$taskStarted)/[Diagnostics.Stopwatch]::Frequency
$bytes=(Get-ChildItem -LiteralPath $out -File | Measure-Object -Property Length -Sum).Sum
$receipt=[ordered]@{startedUtc=$startUtc;closedUtc=[DateTime]::UtcNow.ToString('o');inclusiveWallSeconds=$wall;wallLimitSeconds=180;wallBoundSatisfied=($wall -le 180);artifactBytesBeforeResult=$bytes;artifactCapBytes=134217728;artifactCapSatisfied=($bytes -lt 134217728);nodePath=$nodeExe;nodeSha256=$nodeHash;actual=$actual;startupFailure=$startupFailure;completionRequiresNativeCleanupRows=$true;admission='PENDING_INDEPENDENT_RESULT_REVIEW';externalStopNativeCleanup='UNKNOWN'}
$receipt | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $rootReceipt -Encoding utf8
if($startupFailure -or -not $actual -or $wall -gt 180 -or $bytes -ge 134217728 -or $actual.TimedOut -or $actual.Errors.Length -gt 0 -or -not $actual.RootExitObserved -or -not $actual.OwnedTreeZeroObserved -or $actual.RootExitCode -ne 0){exit 1}
exit 0
