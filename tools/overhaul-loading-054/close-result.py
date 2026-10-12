from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(path):
 p=r/path;b=p.read_bytes();return {'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for name in ['run-seal.json','result-seal.json']:
 s=json.loads((r/'tools/overhaul-loading-054'/name).read_text(encoding='utf8'))
 for x in s['files']+s.get('protected',[]):assert row(x['path'])==x,x['path']
paths=['tools/overhaul-loading-054/run-seal.json','tools/overhaul-loading-054/result-seal.json','docs/overhaul/critic/loading-054-source-review.md','docs/overhaul/critic/loading-054-correction-b-review.md','docs/overhaul/critic/loading-054-result-review.md','.sites-runtime/overhaul-20261010/loading054-cleanup.json','docs/overhaul/loading-054-result-handoff.md']
out=r/'tools/overhaul-loading-054/result-closure.json';assert not out.exists()
o={'decision':'ACCEPT preserved054 diagnostic/narrowfindings. DENY dependable startup/fullmission/performance/Gate1. Live037 unchanged.055sourcecandidate only.','files':[row(p) for p in paths]}
out.write_text(json.dumps(o,indent=2),encoding='utf8');print(json.dumps({'files':len(o['files']),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
