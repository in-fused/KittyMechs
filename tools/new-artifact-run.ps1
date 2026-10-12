param([Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9][a-z0-9-]{0,79}$')][string]$RunName)
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'storage-retention.ps1') -Apply -CheckBudget
$project=Split-Path $PSScriptRoot
$cRoot=Join-Path $project '.sites-runtime'
$dRoot='D:\CodexStorage\KittyMech-Web\.sites-runtime'
$target=Join-Path $dRoot $RunName
$link=Join-Path $cRoot $RunName
if(Test-Path -LiteralPath $link){throw 'Run name already exists; reuse its existing output or select a new bounded run name.'}
if(Test-Path -LiteralPath $target){throw 'D: run name already exists; refusing to overwrite it.'}
New-Item -ItemType Directory -Path $target | Out-Null
New-Item -ItemType Junction -Path $link -Target $target | Out-Null
Write-Output "Write generated artifacts to $link (stored on D:)."
