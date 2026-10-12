from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows=json.loads(Path(__file__).with_name('protected-inputs.json').read_text())['files']
for x in rows:assert row(r/x['path'])==x,x['path']
for p in [Path(__file__),Path(__file__).with_name('launch.py'),Path(__file__).with_name('protected-inputs.json'),r/'docs/overhaul/gait-058d-export-handoff.md',r/'docs/overhaul/critic/gait-058d-source-review.md',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append(row(p))
out=Path(__file__).with_name('run-seal.json');assert not out.exists()
out.write_text(json.dumps({'files':rows,'command':['python','tools/overhaul-gait-058d/launch.py'],'scope':'ONE final critic-approved058D saved-key export120s + conditionalgraft40s under180root; firstfailure stop/no retry/reauthor/publication.'},indent=2),encoding='utf8');print(row(out))
