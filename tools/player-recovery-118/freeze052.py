from pathlib import Path
import hashlib,json,os,shutil
r=Path(__file__).resolve().parents[2]
old=r/'.sites-runtime/overhaul-20261009/build-051';new=r/'.sites-runtime/overhaul-20261009/build-052'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a'
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']}
paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'] not in mapping or mapping[x['path']]['sha256']!=x['sha256'])]
assert changed==['src/game/camera/viewAim.ts'],changed
assert sha(r/'src/game/camera/viewAim.ts')=='81ae8dbdde4fc139101063ed1ca440c55166d9fd4accc7137897b0e0979fb548'
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED052 AIM114 forward-halfspace correction only. Existing051 motion retained; rejected112 is absent. Independent ordinary combat/co-op review required; human lag/fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable051Hardlinks':links,'changedCopies':copies,'changedSource':changed,'receiptSHA256':sha(new/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
