from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=r/'docs/overhaul/critic/anatomy130-integration-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
p=r/'tools/overhaul-anatomy-batch-130/source-seal.json';s=json.loads(p.read_text());rows=list(s['files'])
for p in [p,review,h/'prepare-batch130.py',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
assert all(sha(r/x['path'])==x['sha256'].lower() for x in rows)
out=h/'batch130-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':rows,'command':['node','tools/overhaul-anatomy-batch-130/batch-validate.mjs'],'scope':'ONE90s NEW121 exactcomponent materialbatch data verification; firstfailureSTOP, no public/route/browserjob'},indent=2))
print('130 actual component-batch inputs sealed; no process invoked')
