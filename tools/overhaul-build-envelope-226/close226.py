from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];f=r/'tools/overhaul-build-envelope-226';out=r/'.sites-runtime/overhaul-20261011/native225-private';supervisor=r/'.sites-runtime/overhaul-20261011/build-supervisor226'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
receipt=json.loads((supervisor/'process-receipt.json').read_text())
assert receipt['exitCode']==0 and receipt['failure'] is None and receipt['protectedMatch'] and receipt['finalOriginalIdentitiesRetired'] and receipt['inclusiveBoundObserved']
entry=json.loads((out/'entry-proof.json').read_text());registry=json.loads((out/'dist/registry-identity222.json').read_text());delivery=json.loads((out/'build-receipt.json').read_text())
assert entry['status']=='PASS' and entry['initial']==['/assets/index-jFb_gY9P.js'] and entry['oneCanonicalEntry']
assert registry['status']=='ONE_CANONICAL_ORIGINAL_MODULE_WITH_PRIVATE_IMPLEMENTATION' and len(registry['modules'])==1 and registry['modules'][0].replace('\\','/').endswith('/src/game/camera/visualRegistry.ts')
assert registry['actorAssetURL']=='/assets/private/Pounce_Anatomy221.glb?sha=5147c2c2e46f' and delivery['assetValueAdmissionWithResourceCaveat']['originalJobExitCode']==1 and delivery['publicAssetsCopied'] is False
for row in json.loads((f/'protected-inputs.json').read_text())['files']:assert sha(r/row['path'])==row['sha256'],row['path']
for folder in [out,supervisor]:
 rows=[]
 for p in sorted(folder.rglob('*')):
  if p.is_file() and p.name!='output-seal.json':rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
 (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PRIVATE_BUILD_ONLY_PASS_UNADMITTED_GAMEPLAY','files':rows},indent=2),encoding='utf8')
 print(json.dumps({'closedFolder':str(folder),'outputSHA256':sha(folder/'output-seal.json'),'count':len(rows),'bytes':sum(x['bytes'] for x in rows)}))
