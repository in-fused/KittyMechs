from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows=json.loads(Path(__file__).with_name('protected-inputs.json').read_text())['files']
for x in rows:assert row(r/x['path'])==x,x['path']
for p in [Path(__file__),Path(__file__).with_name('protected-inputs.json'),r/'docs/overhaul/gait-058e-validator-handoff.md',r/'docs/overhaul/critic/gait-058e-source-review.md',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append(row(p))
out=Path(__file__).with_name('run-seal.json');assert not out.exists();out.write_text(json.dumps({'files':rows,'command':['python','tools/overhaul-gait-058e/graft_verify.py'],'scope':'ONE final<=40s postexport validator/graft; STEP exacthold; alloriginalactualdata guards unchanged; firstfailurefinalSTOPnoiterations/author/export.'},indent=2),encoding='utf8');print(row(out))
