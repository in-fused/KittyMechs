from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(path):
 p=r/path;b=p.read_bytes();return {'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=['tools/overhaul-startup-rig-055/startup-capture.mjs','tools/overhaul-startup-rig-055/prepare-observer.py','tools/overhaul-startup-rig-055/launch-public.py','tools/overhaul-startup-rig-055/seal-public.py','tools/overhaul-startup-rig-055/source-handoff.json','tools/overhaul-startup-rig-055/adoption.json','docs/overhaul/critic/startup-rig-055-source-review.md','docs/overhaul/critic/startup-rig-055-observer-review.md','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-play-ready.mjs','.sites-runtime/overhaul-20261009/build-038/receipt.json','.sites-runtime/overhaul-20261009/build-038/playable-checkpoint.json']
receipt=json.loads((r/files[-2]).read_text());protected=[]
for x in receipt['files']:
 path='.sites-runtime/overhaul-20261009/build-038/playable-root/'+x['path'];v=row(path);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256'];protected.append(v)
out=r/'tools/overhaul-startup-rig-055/public-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':[row(p) for p in files],'protected':protected,'command':['python','tools/overhaul-startup-rig-055/launch-public.py'],'scope':'ONE uninstrumented startup-only038 candidate,20s readiness100s work30s cleanup150s supervisor. No mission/replay/state injection.'},indent=2),encoding='utf8')
print(json.dumps({'rows':len(files)+len(protected),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
