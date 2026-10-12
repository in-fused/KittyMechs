from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes()
 return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-036'
receipt=build/'receipt.json'
assert row(receipt)['sha256']=='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
files=[row(p) for p in sorted((r/'tools/overhaul-coop-play-045').rglob('*')) if p.is_file()]
files += [row(r/p) for p in ['tools/overhaul-play-ready.mjs','tools/overhaul-pilot-aim.ts','tools/overhaul-squad-policy.ts','tools/overhaul-root-round-033/run-mission-seal045.py','tools/overhaul-root-round-033/launch045.py','tools/overhaul-root-round-033/prepare045.py']]
files += [row(receipt),row(build/'playable-checkpoint.json')]
protected=[]
for x in json.loads(receipt.read_text())['files']:
 p=build/'playable-root'/x['path'];v=row(p)
 assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'],x['path']
 protected.append(v)
seal={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protected':protected,'command':['python','tools/overhaul-root-round-033/launch045.py'],'scope':'ONE public two-independent-browser full-required-mission attempt on unchanged frozen036; 420s work/30s cleanup, root480s inclusive maximum. No automatic retry. All outcomes require independent review.'}
p=r/'tools/overhaul-root-round-033/coop045-public-seal.json';assert not p.exists()
p.write_text(json.dumps(seal,indent=2));print(json.dumps({'files':len(files),'protected':len(protected),'sealSHA256':row(p)['sha256']}))
