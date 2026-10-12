from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-049';new=r/'.sites-runtime/overhaul-20261009/build-050'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe'
v=json.loads((r/'.sites-runtime/overhaul-20261010/player-lag105-build/result.json').read_text());assert v['exitCode']==0
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']};paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
changed=[x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'] not in mapping or mapping[x['path']]['sha256']!=x['sha256'])];assert changed==['src/game/camera/CameraRig.tsx','src/game/world/cityPresentation.ts'],changed
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'Frozen050 unadmitted shared city redraw and obsolete solo fit correction105; independent ordinary play review required. Fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable049Hardlinks':links,'changedCopies':copies,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
