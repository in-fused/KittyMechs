import json,pathlib,hashlib,shutil,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
production=['src/game/entities/Actors.tsx','src/game/entities/Identity57Runtime005.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/entities/publicFelinePrototype008.ts','src/game/entities/sourcePresentation154.ts','src/game/entities/sourceCoordination164.ts','src/game/entities/sourceCycle171.ts','src/game/camera/visualRegistry.ts','src/game/camera/weightedVisualEnvelope007.ts','shared/config.ts']
protected=production+['tools/overhaul-anatomy-motion-202/sourceTask202.ts','assets/source/overhaul-anatomy-motion-202/anatomical-basis202.json','assets/source/overhaul-anatomy-motion-202/authored-motion-records202.json','assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend','tools/overhaul-delivery-209/output/Pounce_Anatomy209.glb','.sites-runtime/overhaul-20261010/delivery209-primary/evidence.json','.sites-runtime/overhaul-20261010/delivery209-primary/decoded-catalog.json','docs/overhaul/critic/motion209-temporal-review.md','tools/overhaul-delivery-206/convert206.mjs','tools/overhaul-delivery-209/convert209.mjs']
def row(p):
 data=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
before=[row(root/p) for p in protected]
for p in production:
 target=folder/'preimages'/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/p,target)
after=[row(root/p) for p in protected]
if before!=after:raise RuntimeError('214_PROTECTED_SOURCE_CHANGED')
(folder/'protected-inputs214.json').write_text(json.dumps({'writer':'CLOSED','files':before},indent=2))
(folder/'static-receipts214.json').write_text(json.dumps({'writer':'CLOSED','actualPack':'UNRUN','actualDecoder':'UNRUN','actualNativeFixture':'UNRUN','productionEdited':False,'protectedBeforeAfter':'MATCH','commands':[{'command':'python tools/overhaul-native-214/prepare-static214.py','first':{'exitCode':1,'seconds':1.0137371,'error':'STATIC_PROVIDER_KEY_FAILURE'},'corrected':{'exitCode':0,'seconds':1.2479305}},{'command':'node tools/overhaul-native-214/static-syntax214.mjs','exitCode':0,'seconds':1.5289375,'scope':'syntax only, no types/model/import execution'},{'command':'node --check tools/overhaul-native-214/pack214.mjs','exitCode':0,'seconds':.4460234}]},indent=2))
files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]
seal={'writer':'CLOSED','status':'PARTIAL_STATIC_CANDIDATE_UNADMITTED','closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protectedInputs':before};(folder/'source-seal.json').write_text(json.dumps(seal,indent=2))
print(json.dumps({'writer':'CLOSED','files':len(files),'seal':row(folder/'source-seal.json'),'handoff':row(folder/'HANDOFF.md'),'candidate':[row(folder/p) for p in ['nativeOwner214.ts','NativeActor214.tsx','pack214.mjs']],'productionProtected':'MATCH'}))
