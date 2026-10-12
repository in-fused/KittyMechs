from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-036'
receipt=build/'receipt.json';assert row(receipt)['sha256']=='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
protected=[]
for x in json.loads(receipt.read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];protected.append(v)
files=[row(r/p) for p in ['tools/overhaul-root-round-034/player047-observe.mjs','tools/overhaul-play-ready.mjs','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-root-round-034/prepare-observer047.py','tools/overhaul-root-round-034/prepare-baseline047.py']]+[row(receipt),row(build/'playable-checkpoint.json')]
seal={'files':files,'protected':protected,'command':['node','tools/overhaul-root-round-034/player047-observe.mjs','.sites-runtime/overhaul-20261010/player047-baseline'],'scope':'ONE fresh matched047 baseline because newquad-first/uprightfire public input route differs044; existing036 unchanged. Exact receipt supplied by root env; no retry.'}
p=Path(__file__).with_name('player047-baseline-seal.json');assert not p.exists();p.write_text(json.dumps(seal,indent=2));print(row(p))
