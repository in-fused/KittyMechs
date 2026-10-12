from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];h=json.loads((r/'tools/overhaul-moving-recoil-050/source-handoff.json').read_text());rows={x['path']:x for x in h['files']}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
out=r/'tools/overhaul-moving-recoil-050/unshipped-candidate';assert not out.exists()
paths=['src/game/entities/identity57Runtime005.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/entities/movingRecoil050.ts','src/game/entities/movingRecoil050Manifest.json','public/assets/models/Pounce_MovingRecoil050.glb','tests/moving-recoil-050.test.ts']
for p in paths:assert sha(r/p)==rows[p]['sha256'] and (r/p).stat().st_size==rows[p]['bytes']
out.mkdir();saved=[]
for p in paths:
 source=(r/p).resolve();target=(out/p).resolve();assert source.is_relative_to(r) and target.is_relative_to(out)
 target.parent.mkdir(parents=True,exist_ok=True)
 if p in paths[:2]:shutil.copy2(source,target)
 else:shutil.move(source,target)
 assert sha(target)==rows[p]['sha256'];saved.append({'path':target.relative_to(r).as_posix(),'bytes':target.stat().st_size,'sha256':sha(target)})
restored=[]
for name,expected in [('identity57Runtime005.ts','7f0ee662f0c8e48873525d17841b6851e70cbe2cff6f731850cda1bb97f8bdae'),('identity57Runtime034Actor.tsx','0f7ac7421716d754200251cfd4738fa8e4438bc2db99e83ecc8f5238dc8fadd2')]:
 source=r/'tools/overhaul-moving-recoil-050/preimages'/name;target=r/'src/game/entities'/name;assert sha(source)==expected;shutil.copy2(source,target);assert sha(target)==expected;restored.append({'path':target.relative_to(r).as_posix(),'bytes':target.stat().st_size,'sha256':sha(target)})
assert all(sha(r/x['path'])==x['sha256'] for x in h['protected'])
o={'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FIRST_TEST_FAILURE_STOP_UNSHIPPED_RESTORED','candidateFiles':saved,'restored':restored,'absentShippingPaths':paths[2:],'protectedOriginalsUnchanged':True,'jobsAfterFailure':[],'scope':'Exact frozen050 candidate preserved separately. Frozen source-handoff names pre-restoration paths; verify candidate relocated paths through this receipt. No repair/build/candidate/asset deletion. Live036 unchanged.'}
(r/'tools/overhaul-moving-recoil-050/closure-handoff.json').write_text(json.dumps(o,indent=2));print(json.dumps(o))
