from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(path):
 p=r/path;b=p.read_bytes();return {'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build='.sites-runtime/overhaul-20261009/build-038'
receipt=json.loads((r/build/'receipt.json').read_text());protected=[]
for x in receipt['files']:
 v=row(build+'/playable-root/'+x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
paths=['tools/overhaul-coop-play-056/prepare.py','tools/overhaul-coop-play-056/mission-capture.mjs','tools/overhaul-coop-play-056/launch.py','tools/overhaul-coop-play-056/seal.py','tools/overhaul-coop-play-053/mission-capture.mjs','tools/overhaul-root-round-033/run-mission-seal045.py','tools/overhaul-play-ready.mjs','tools/overhaul-pilot-aim.ts','tools/overhaul-squad-policy.ts','docs/overhaul/critic/startup-rig-055-result-review.md',build+'/receipt.json',build+'/playable-checkpoint.json','docs/overhaul/coop-play-056.md']
p=r/'tools/overhaul-coop-play-056/run-seal.json';assert not p.exists()
p.write_text(json.dumps({'files':[row(v) for v in paths],'protected':protected,'command':['python','tools/overhaul-coop-play-056/launch.py'],'scope':'ONE actual normal mission on accepted startup038. Same053controls20sreadiness420swork30scleanup480sroot; no retry/injectedstate. Player experience/fullmission remain independently unqualified.'},indent=2),encoding='utf8');print(hashlib.sha256(p.read_bytes()).hexdigest())
