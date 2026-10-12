from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
review=r/'docs/overhaul/critic/performance086-build-review.md';assert row(review)['sha256']=='cf2ecce57a0137fd1a08eeeb1b2e6a7d643901cbca526cf2580712e30a5eec3a'
paths=[h/'freeze046-administrative.py',h/'early-review085.md',h/'build-seal.json',review,r/'docs/overhaul/critic/performance085-source-review.md',r/'.sites-runtime/overhaul-20261010/performance086-build/process-receipt.json',r/'.sites-runtime/overhaul-20261010/performance086-build/stdout.txt',r/'tools/overhaul-root-round-027/run-seal.py',Path(__file__)]
old=r/'.sites-runtime/overhaul-20261009/build-045';paths.append(old/'receipt.json')
protected=[row(old/'playable-root'/x['path']) for x in json.loads((old/'receipt.json').read_text())['files']]
p=h/'freeze-seal.json';assert not p.exists();p.write_text(json.dumps({'files':[row(x) for x in paths],'protected':protected,'command':['python','tools/overhaul-performance-integration-086/freeze046-administrative.py'],'scope':'ONE conditional freeze after independently audited solely administrative review race. Original failed metadata witness stays unchanged. Unadmitted runtime, no gameplay/performance approval.'},indent=2))
