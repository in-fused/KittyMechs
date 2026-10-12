from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-038';new=r/'.sites-runtime/overhaul-20261009/build-039'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c'
for job in ['test','build']:
 v=json.loads((r/f'.sites-runtime/overhaul-20261010/experience057-{job}/process-receipt.json').read_text());assert v['exitCode']==0 and v['failure'] is None and all(x['match'] for x in v['inputsAfter'])
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']}
paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file());paths.update(['src/game/camera/CameraRig.tsx','src/game/camera/framing.ts','src/game/world/rainlineStreetArt.tsx'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)];new.mkdir(exist_ok=False)
(new/'receipt.json').write_text(json.dumps({'scope':'Frozen039 camera actual-fit and street-instance culling057 candidate; gameplay/presentation/performance unqualified until actual review.','files':rows},indent=2),encoding='utf8')
dest=new/'playable-root';dest.mkdir();links=copies=copybytes=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1;copybytes+=x['bytes']
 assert sha(target)==x['sha256'] and target.stat().st_size==x['bytes']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
o={'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable038Hardlinks':links,'changedCopies':copies,'copiedBytes':copybytes,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json'),'scope':'Immutable roots only, no mutable source/dist links.039 public unqualified.'};(new/'playable-checkpoint.json').write_text(json.dumps(o,indent=2),encoding='utf8');print(json.dumps(o))
