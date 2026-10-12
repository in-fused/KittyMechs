from pathlib import Path
import json, hashlib
r=Path(__file__).resolve().parents[2]
run=r/'.sites-runtime/shader-startup-238'
assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
receipt=json.loads((run/'build272-supervisor/process-receipt.json').read_text(encoding='utf-8'))
assert receipt['exitCode']==0 and receipt['protectedMatch'] and receipt['finalOriginalIdentitiesRetired'] and receipt['inclusiveBoundObserved'] and receipt['failure'] is None
dist=run/'private272/dist'
identity=json.loads((dist/'integration-identity272.json').read_text(encoding='utf-8'))
registry=json.loads((dist/'registry-identity268.json').read_text(encoding='utf-8'))
delivery=json.loads((run/'private272/delivery222.json').read_text(encoding='utf-8'))
assert registry['expectedClipCount']==47 and registry['originalSupervisorExitCode']==1
assert identity['actorAssetURL']==registry['actorAssetURL']=='/assets/private/Pounce_Feline264.glb?sha=a1aa8bab5601'
assert len(delivery['contract']['clips'])==47 and delivery['qualification']['retirementWithinOriginalDeadlineProven'] is False
expected={'actor':'tools/overhaul-native-integration-222/NativeActor222.tsx','owner':'tools/overhaul-native-integration-222/nativeOwner218.ts','registry':'src/game/camera/visualRegistry.ts','canvas':'src/game/GameCanvas.tsx','shader':'tools/overhaul-shader-startup-232/shaderStartup232.tsx'}
for key, path in expected.items():assert identity['canonical'][key].replace('\\','/').endswith('/'+path)
def row(p):
    b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seals=[]
for folder in [run/'private272',run/'build272-supervisor']:
    assert not (folder/'output-seal.json').exists()
    files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file()]
    (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One private272 47-clip integration build; gameplay/contact/presentation/human lag unaccepted; original268 supervisor1 caveat retained','files':files},indent=2),encoding='utf-8')
    seals.append(row(folder/'output-seal.json'))
print(json.dumps({'writer':'CLOSED','seals':seals,'canonicalIdentity':'MATCH','clipCount':47,'publicUpgradeApproved':False}))
