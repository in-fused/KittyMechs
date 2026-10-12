# SOURCE AUTHORING ONLY. Not a syntax/public mission entry point.
$coop116Root = (Get-Location).Path
$coop116Directory = Join-Path $coop116Root 'tools/overhaul-coop-integration-116'
$coop116OldDirectory = Join-Path $coop116Root 'tools/overhaul-coop-integration-111'
$coop116Encoding = [System.Text.UTF8Encoding]::new($false)
$coop116Mission = [System.IO.File]::ReadAllText((Join-Path $coop116OldDirectory 'mission-capture.mjs'))
$coop116Mission = $coop116Mission.Replace('111','116').Replace("from './controller.mjs'", "from '../overhaul-coop-controller-115/controller.mjs'").Replace('createMissionController116','createMissionController115').Replace('MissionHost','Mission116Host').Replace('MissionGuest','Mission116Guest')
[System.IO.File]::WriteAllText((Join-Path $coop116Directory 'mission-capture.mjs'),$coop116Mission,$coop116Encoding)
foreach ($coop116Name in @('prepare.py','preflight.py','launch.py')) {
 $coop116Text=[System.IO.File]::ReadAllText((Join-Path $coop116OldDirectory $coop116Name)).Replace('overhaul-coop-integration-111','overhaul-coop-integration-116').Replace('coop111','coop116').Replace('new111','new116')
 if ($coop116Name -eq 'launch.py') {$coop116Text=$coop116Text.Replace('tools/overhaul-coop-integration-116/controller.mjs','tools/overhaul-coop-controller-115/controller.mjs')}
 [System.IO.File]::WriteAllText((Join-Path $coop116Directory $coop116Name),$coop116Text,$coop116Encoding)
}
$coop116OldHandoff=Get-Content -LiteralPath (Join-Path $coop116OldDirectory 'source-handoff.json') -Raw | ConvertFrom-Json
$coop116Dependencies=foreach($coop116Dependency in $coop116OldHandoff.dependencies){
 $coop116Bytes=[System.IO.File]::ReadAllBytes((Join-Path $coop116Root $coop116Dependency.path))
 $coop116Hash=(Get-FileHash -LiteralPath $coop116Dependency.path -Algorithm SHA256).Hash.ToLower()
 if($coop116Hash -ne $coop116Dependency.sha256){throw ('CURRENT051_DEPENDENCY_CHANGED '+$coop116Dependency.path)}
 if($coop116Dependency.frozenPath){if((Get-FileHash -LiteralPath $coop116Dependency.frozenPath -Algorithm SHA256).Hash.ToLower() -ne $coop116Hash){throw ('FROZEN051_MISMATCH '+$coop116Dependency.path)}}
 $coop116Dependency
}
$coop116Receipt='.sites-runtime/overhaul-20261009/build-052/receipt.json'
$coop116Required='240028ed01ae67d4c0e391aea2a221106dd507883815e47ec076be23243e6fb0'
if((Get-FileHash -LiteralPath $coop116Receipt -Algorithm SHA256).Hash.ToLower() -ne $coop116Required){throw 'FROZEN051_RECEIPT_MISMATCH'}
$coop116Protected=foreach($coop116Path in @('tools/overhaul-coop-integration-111/controller.mjs','tools/overhaul-coop-integration-111/mission-capture.mjs','tools/overhaul-coop-integration-111/prepare.py','tools/overhaul-coop-integration-111/preflight.py','tools/overhaul-coop-integration-111/launch.py','tools/overhaul-coop-integration-111/source-seal.json','tools/overhaul-coop-controller-115/controller.mjs','tools/overhaul-coop-controller-115/HANDOFF.md','tools/overhaul-coop-controller-115/source-seal.json')){
 $coop116File=Get-Item -LiteralPath $coop116Path
 [ordered]@{path=$coop116Path;bytes=$coop116File.Length;sha256=(Get-FileHash -LiteralPath $coop116Path -Algorithm SHA256).Hash.ToLower()}
}
$coop116Handoff=[ordered]@{writer='CLOSED';status='SOURCE_ONLY_UNRUN_COMPLETE_WRAPPER_GATE_REQUIRED';requiredReceipt=$coop116Required;origin='http://localhost:8799';publicEntry='http://localhost:8799/?debug=1';serverPID=349380;serverSession=13822;callsigns=@('Mission116Host','Mission116Guest');controller='tools/overhaul-coop-controller-115/controller.mjs';bounds=$coop116OldHandoff.bounds;onlyChanges=@('Import closed115 controller; observer identity/output/callsigns116','111 complete mission criteria/control assertions/native canonical parity/cleanup preserved');dependencies=@($coop116Dependencies);protected=@($coop116Protected);rootCommand=@('node','--import','tsx','tools/overhaul-coop-integration-116/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop116-public');lateJoin='MISSING/INCOMPLETE; not added';scope='ONE complete ordinary public mission after independent complete-wrapper approval; no automatic rerun; full finite objective INCOMPLETE'}
[System.IO.File]::WriteAllText((Join-Path $coop116Directory 'source-handoff.json'),($coop116Handoff|ConvertTo-Json -Depth 8)+[Environment]::NewLine,$coop116Encoding)
# Exact transform comparison is a source-byte check; no module execution.
if([System.IO.File]::ReadAllText((Join-Path $coop116Directory 'mission-capture.mjs')) -ne $coop116Mission){throw 'UNDECLARED116_MISSION_CHANGE'}
Write-Output ('116 source package authored; '+$coop116Dependencies.Count+' current/frozen051 dependencies matched; no jobs')
