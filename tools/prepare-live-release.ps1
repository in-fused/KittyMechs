$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
Push-Location -LiteralPath $taskRoot
try {
    $taskCommit = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $taskCommit -notmatch '^[0-9a-f]{40}$') { throw 'A committed release is required.' }
    $taskDirty = git status --porcelain -- src shared server public tools tests package.json package-lock.json tsconfig.json vite.config.ts
    if ($LASTEXITCODE -ne 0 -or $taskDirty) { throw 'Commit the reviewed source before freezing a live release.' }
    if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html'))) { throw 'The production build is missing.' }
    node (Join-Path $taskRoot 'node_modules/tsx/dist/cli.mjs') tools/critical-review.ts
    if ($LASTEXITCODE -ne 0) { throw 'Independent release approval is required.' }
    $taskDirectory = [System.IO.Path]::GetFullPath((Join-Path $taskRoot ('.sites-runtime/live-' + $taskCommit)))
    if (!$taskDirectory.StartsWith($taskRoot + [System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)) { throw 'Live directory escaped the project.' }
    if (Test-Path -LiteralPath $taskDirectory) { throw 'This frozen release already exists; preserve it and inspect its receipt.' }
    New-Item -ItemType Directory -Path $taskDirectory | Out-Null
    foreach ($taskName in @('server','shared','dist','package.json','tsconfig.json')) { Copy-Item -LiteralPath (Join-Path $taskRoot $taskName) -Destination $taskDirectory -Recurse }
    $taskFiles = Get-ChildItem -LiteralPath $taskDirectory -File -Recurse | ForEach-Object { @{path=$_.FullName.Substring($taskDirectory.Length+1);sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} }
    @{sourceCommit=$taskCommit;files=$taskFiles;createdAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskDirectory 'release-receipt.json')
    @{directory=$taskDirectory;sourceCommit=$taskCommit;createdAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRoot '.sites-runtime/live-build.json')
    Write-Output ('Frozen reviewed release: ' + $taskDirectory)
} finally { Pop-Location }
