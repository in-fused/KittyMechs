from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-036';receipt=build/'receipt.json'
assert row(receipt)['sha256']=='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
files=[row(p) for p in sorted((r/'tools/overhaul-guest-readiness-046').rglob('*')) if p.is_file()]
files += [row(r/p) for p in ['tools/overhaul-root-round-027/run-seal.py','tools/overhaul-root-round-033/launch046.py','tools/overhaul-root-round-033/prepare046.py','tools/overhaul-coop-play-045/critic-result-closure.json','docs/overhaul/critic/coop-play-045-result-review.md']]
files += [row(receipt),row(build/'playable-checkpoint.json')]
protected=[]
for x in json.loads(receipt.read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
seal={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'protected':protected,'command':['python','tools/overhaul-root-round-033/launch046.py'],'scope':'ONE unchanged036 guest-own visual startup diagnostic; retain first20s failure before realESC probe. No mission retry or shipping edits. 65s work/15s cleanup/root120s inclusive maximum.'}
p=Path(__file__).with_name('guest046-public-seal.json');assert not p.exists();p.write_text(json.dumps(seal,indent=2));print(json.dumps({'files':len(files),'protected':len(protected),'sealSHA256':row(p)['sha256']}))
