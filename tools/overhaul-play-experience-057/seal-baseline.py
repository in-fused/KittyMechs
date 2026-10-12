from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-038';m=json.loads((build/'receipt.json').read_text());protected=[]
for x in m['files']:
 v=row(build/'playable-root'/x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
paths=[Path(__file__),r/'tools/overhaul-play-experience-057/capture.mjs',r/'tools/overhaul-play-experience-057/launch-baseline.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',build/'receipt.json']
o=r/'tools/overhaul-play-experience-057/baseline-seal.json';assert not o.exists();o.write_text(json.dumps({'files':[row(p) for p in paths],'protected':protected,'command':['python','tools/overhaul-play-experience-057/launch-baseline.py'],'scope':'ONE038BaselineLowest80swork30sclose120ssupervisor firstfailure; no retries or injectedgame state.'},indent=2),encoding='utf8');print(row(o))
