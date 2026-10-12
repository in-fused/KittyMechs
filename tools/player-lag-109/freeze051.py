from pathlib import Path
import hashlib,json,os,shutil
r=Path(__file__).resolve().parents[2]
old=r/'.sites-runtime/overhaul-20261009/build-050';new=r/'.sites-runtime/overhaul-20261009/build-051'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='7fb23695439b41446cfb120174ffde92c13091e9506fff3ab56142eeaea19c76'
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']}
paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
for p in (r/'src/game/entities').glob('*106*'):
 if p.is_file():paths.add(p.relative_to(r).as_posix())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'] not in mapping or mapping[x['path']]['sha256']!=x['sha256'])]
assert changed and all('identity57Runtime' in p or p in ['src/game/GameCanvas.tsx','src/game/rendering/modelPaths.ts'] for p in changed),changed
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED051 full-body motion106/runtime moving-R candidate and plain-URL Pounce delivery. Independent gameplay review required; actual player lag/fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable050Hardlinks':links,'changedCopies':copies,'changedSource':changed,'receiptSHA256':sha(new/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
