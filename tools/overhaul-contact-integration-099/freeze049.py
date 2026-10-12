from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-048';new=r/'.sites-runtime/overhaul-20261009/build-049'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='909eb6c3c553cd2279b7321c9c1cd28d718bf6ef918445d98f4b0c212bcce265'
v=json.loads((r/'.sites-runtime/overhaul-20261010/contact099-build/process-receipt.json').read_text());assert v['exitCode']==0 and v['failure'] is None and all(x['match'] for x in v['inputsAfter'])
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']};paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'] not in mapping or mapping[x['path']]['sha256']!=x['sha256'])];assert changed==['src/game/entities/movingRFfeet067.ts'],changed
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'Frozen049 unadmitted task-space contact098; actual independent motion/contact review required. Fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable048Hardlinks':links,'changedCopies':copies,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
