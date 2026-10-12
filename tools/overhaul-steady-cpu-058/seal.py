from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];build=r/'.sites-runtime/overhaul-20261009/build-039'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
protected=[]
for x in json.loads((build/'receipt.json').read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
paths=[Path(__file__),Path(__file__).with_name('prepare.py'),Path(__file__).with_name('capture.mjs'),Path(__file__).with_name('launch.py'),r/'tools/overhaul-play-experience-057/capture.mjs',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py',build/'receipt.json']
out=Path(__file__).with_name('run-seal.json');assert not out.exists();out.write_text(json.dumps({'files':[row(p) for p in paths],'protected':protected,'command':['python','tools/overhaul-steady-cpu-058/launch.py'],'scope':'ONE03918-secondsteadyCPU1mssampling diagnostic,80work30close120root,20sreadiness, firstfailure/no retry. No measuredFPSapproval or injection.'},indent=2),encoding='utf8');print(row(out))
