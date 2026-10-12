from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
f=r/'.sites-runtime/overhaul-20261009/build-057'
assert sha(f/'receipt.json')=='22038154e3e158699f38cfbfb7f928794ea1cf7fb0f81a6b374f22074a77b393'
receipt=json.loads((f/'receipt.json').read_text(encoding='utf8'))
for x in receipt['files']:assert sha(f/'playable-root'/x['path'])==x['sha256'],x['path']
files=[row(p) for p in [h/'profile-rejected.mts',h/'prepare-profile.py',r/'tools/overhaul-locomotion-143/load-rig143.ts',r/'tools/overhaul-root-round-027/run-seal.py',r/'public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb',r/'public/assets/models/Pounce_Anatomy121Batched.glb',r/'package.json',r/'package-lock.json']]
protected=[row(f/'playable-root'/x['path']) for x in receipt['files']]+[row(f/'receipt.json')]
out=h/'profile-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':files,'protected':protected,'command':['node','--import','tsx','tools/player-playability-150/profile-rejected.mts'],'scope':'ONE bounded decoded owner CPU profile from frozen REJECTED057 source. No current147 source reads, browser/native authority/build jobs or game changes.20s script work;60s root inclusive; no speedup/player gain claim.'},indent=2),encoding='utf8');print('Frozen rejected owner profile sealed')
