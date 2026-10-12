from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-037';receipt=build/'receipt.json';protected=[]
for x in json.loads(receipt.read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];protected.append(v)
files=[row(r/p) for p in ['tools/overhaul-root-round-034/player047-observe.mjs','tools/overhaul-play-ready.mjs','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-root-round-034/prepare-public050.py','tools/overhaul-moving-recoil-050/source-handoff.json','tools/overhaul-moving-recoil-050/source-seal.json']]+[row(receipt),row(build/'playable-checkpoint.json')]
seal={'files':files,'protected':protected,'command':['node','tools/overhaul-root-round-034/player047-observe.mjs','.sites-runtime/overhaul-20261010/player050-candidate'],'scope':'ONE same-script matched ordinaryLow candidate on reused8799; no injected state/no retry. Fonly, Missile visually unqualified.'}
p=Path(__file__).with_name('player050-candidate-seal.json');assert not p.exists();p.write_text(json.dumps(seal,indent=2));print(row(p))
