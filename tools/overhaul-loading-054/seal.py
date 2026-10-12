from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(path):
 p=r/path;b=p.read_bytes();return {'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((r/'tools/overhaul-root-round-035/coop053-public-seal.json').read_text(encoding='utf8'))
for x in prior['files']+prior['protected']:assert row(x['path'])==x,x['path']
paths=['tools/overhaul-loading-054/prepare.py','tools/overhaul-loading-054/startup-capture.mjs','tools/overhaul-loading-054/correct.py','tools/overhaul-loading-054/startup-capture-b.mjs','tools/overhaul-loading-054/analyze.py','tools/overhaul-loading-054/launch.py','tools/overhaul-loading-054/seal.py','docs/overhaul/loading-diagnosis-054.md','docs/overhaul/critic/loading-054-source-review.md','docs/overhaul/critic/loading-054-correction-b-review.md']
out=r/'tools/overhaul-loading-054/run-seal.json';assert not out.exists()
o={'files':prior['files']+[row(p) for p in paths],'protected':prior['protected'],'command':['python','tools/overhaul-loading-054/launch.py'],'scope':'ONE startup-only instrumented unchanged037 diagnosis. Require independent source permission.20s perclient readiness unchanged;100s work30s cleanup150s root. Profiler affects timing; no mission or performance approval.'}
out.write_text(json.dumps(o,indent=2),encoding='utf8');print(json.dumps({'sourceRows':len(o['files']),'protectedRows':len(o['protected']),'sealSHA256':hashlib.sha256(out.read_bytes()).hexdigest()}))
