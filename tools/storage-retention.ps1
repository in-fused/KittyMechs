param([switch]$Apply, [switch]$CheckBudget)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$expectedProject = 'C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
if ($projectRoot -ne $expectedProject) { throw 'Unexpected project root; review storage configuration first.' }
$planner = Join-Path $PSScriptRoot 'storage_retention.py'
$planText = & python $planner
if ($LASTEXITCODE -ne 0) { throw 'Retention planning failed; nothing deleted.' }
$plan = ($planText -join "`n") | ConvertFrom-Json
if ($plan.errors.Count) { throw 'Incomplete inventory; refusing automatic deletion.' }
$deleted = @()
foreach ($row in $plan.delete) {
    if (-not $Apply) { continue }
    $target = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $row.path).ProviderPath)
    $allowed = @($plan.allowedRoots | Where-Object { $target.StartsWith(([IO.Path]::GetFullPath($_).TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase) })
    if ($allowed.Count -ne 1 -or $row.pinned -or $row.relative -eq 'overhaul-20261009/build-062') { throw "Unsafe retention target: $target" }
    $walk = Get-Item -LiteralPath $target -Force
    while ($walk.FullName -ne [IO.Path]::GetFullPath($allowed[0])) {
        if ($walk.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked target or ancestor: $target" }
        if (Test-Path -LiteralPath (Join-Path $walk.FullName '.storage-pin')) { throw 'Target or ancestor was pinned after planning.' }
        $walk = $walk.Parent
        if (-not $walk) { throw 'Target escaped storage root.' }
    }
    if (Test-Path -LiteralPath (Join-Path $allowed[0] '.storage-pin')) { throw 'Storage root was pinned after planning.' }
    if ((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing a linked target.' }
    if (Test-Path -LiteralPath (Join-Path $target '.storage-pin')) { throw 'Target was pinned after planning.' }
    $files = @(Get-ChildItem -LiteralPath $target -Recurse -Force)
    if (@($files | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Target contains a link.' }
    $cutoff = (Get-Date).ToUniversalTime().AddHours(-24)
    if (@($files | Where-Object { $_.LastWriteTimeUtc -gt $cutoff }).Count) { continue }
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
    $deleted += $row
}
$removedBytes = ($deleted | Measure-Object bytes -Sum).Sum
$remainingTotal = $plan.totalArtifactLogicalBytes - $removedBytes
$remainingHistory = ($plan.delete | Measure-Object bytes -Sum).Sum + $plan.remainingSnapshotBuildBytes - $removedBytes
$cFree = (Get-PSDrive C).Free
$dFree = (Get-PSDrive D).Free
[pscustomobject]@{Applied=[bool]$Apply;DeletedCount=$deleted.Count;CandidateCount=$plan.delete.Count;ArtifactGiB=[math]::Round($remainingTotal/1GB,2);HistoryGiB=[math]::Round($remainingHistory/1GB,2);CFreeGiB=[math]::Round($cFree/1GB,2);DFreeGiB=[math]::Round($dFree/1GB,2)} | ConvertTo-Json
if ($CheckBudget -and ($remainingTotal -gt 48GB -or $remainingHistory -gt 2GB -or $cFree -lt 30GB -or $dFree -lt 100GB)) {
    throw 'Storage budget reached: C must have 30 GiB free, D 100 GiB free, all scratch <=48 GiB, build/snapshot history <=2 GiB. Review artifacts before generating more; never delete source to bypass this check.'
}
