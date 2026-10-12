from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=r/'docs/overhaul/critic/anatomy127-128-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE' in review.read_text(encoding='utf8')
rows=[]
for name in ['overhaul-anatomy-delivery-127','overhaul-anatomy-browser-128']:
 p=r/'tools'/name/'source-seal.json';s=json.loads(p.read_text());rows.extend(s['files']);rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
s=json.loads((r/'tools/overhaul-anatomy-runtime-123/source-seal.json').read_text())
previous=[x for x in s['files'] if x['path'].casefold()=='src/game/entities/identity57runtime005.ts'];assert len(previous)==1
assert sha(r/'tools/overhaul-anatomy-browser-128/preimages/Identity57Runtime005.ts')==previous[0]['sha256']
rows.extend(x for x in s['files'] if x['path'].casefold()!='src/game/entities/identity57runtime005.ts')
for p in [review,h/'prepare-delivery127.py',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append({'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
assert all(sha(r/x['path'])==x['sha256'].lower() for x in rows)
out=h/'delivery127-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':rows,'command':['node','tools/overhaul-anatomy-delivery-127/deliver-validate.mjs'],'scope':'ONE90s full NEW121 exactraw UNADMITTED delivery. Browser45loaderstage PENDING; firstfailureSTOP; no route/build/browserjob in this process'},indent=2))
print('127 exactraw delivery inputs sealed; no process invoked')
