from pathlib import Path
import json,hashlib,os,shutil
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-053';new=r/'.sites-runtime/overhaul-20261009/build-054'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='77df6f7e6f94672ce94eb16299d0613b6efbd569e87f722dcc0cb498e8f7e259'
prior=json.loads((old/'receipt.json').read_text());mapping={x['path'].casefold():x for x in prior['files']}
paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
for p in (r/'dist').rglob('*'):
 if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths.values())]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'].casefold() not in mapping or mapping[x['path'].casefold()]['sha256']!=x['sha256'])]
assert changed==['src/game/entities/movingRFfeet067.ts'],changed
source=json.loads((r/'tools/overhaul-contact-132/source-seal.json').read_text());expected=next(x['sha256'] for x in source['files'] if x['path']=='src/game/entities/movingRFfeet067.ts')
assert sha(r/'src/game/entities/movingRFfeet067.ts')==expected
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED054 contact132 acquisition/retirement lifecycle;053 anatomy/gait and nativegame retained. Actualtemporal/contact/multiplayer gate required; fullgoal/humanlag incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/previous['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable053Hardlinks':links,'changedCopies':copies,'changedSource':changed,'receiptSHA256':sha(new/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
