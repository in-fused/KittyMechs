from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=r/'docs/overhaul/critic/anatomy125-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
rows=[]
for name in ['overhaul-anatomy-asset-124','overhaul-anatomy-runtime-123']:
 p=r/'tools'/name/'source-seal.json';s=json.loads(p.read_text());rows.extend(s['files']);rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
for p in [review,h/'prepare-optimizer.py',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
assert all(sha(r/x['path'])==x['sha256'].lower() for x in rows)
out=h/'optimizer-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':rows,'command':['node','tools/overhaul-anatomy-asset-124/optimize-validate.mjs'],'scope':'ONE120s full NEW121 resource optimization/actualvalidation, firstfailureSTOP; NO route/build/publicbrowser job'},indent=2))
print('Optimizer inputs sealed; no process invoked')
