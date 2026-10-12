from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];folder=Path(__file__).parent
s=(folder/'launch-baseline.py').read_text(encoding='utf8').replace('build-038','build-039').replace('02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c','7975f3f3f86f67ea1ccc06fb804bf1f8eee317475fb08b157cacb49e277e6815').replace('experience057-baseline','experience057-candidate')
(folder/'launch-candidate.py').write_text(s,encoding='utf8')
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
baseline=json.loads((folder/'baseline-seal.json').read_text())
assert row(folder/'capture.mjs')==next(x for x in baseline['files'] if x['path'].endswith('capture.mjs'))
build=r/'.sites-runtime/overhaul-20261009/build-039';m=json.loads((build/'receipt.json').read_text());protected=[]
for x in m['files']:
 v=row(build/'playable-root'/x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
paths=[Path(__file__),folder/'capture.mjs',folder/'launch-candidate.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',build/'receipt.json']
o=folder/'candidate-seal.json';assert not o.exists();o.write_text(json.dumps({'files':[row(p) for p in paths],'protected':protected,'command':['python','tools/overhaul-play-experience-057/launch-candidate.py'],'scope':'ONE039Candidate same038baselineobserver publicLow/UI/keys/bounds/video no retry. Pairedtiming comparison not certified GPUcost or IABqualification.'},indent=2),encoding='utf8');print(row(o))
