from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows=json.loads((Path(__file__).with_name('protected-inputs.json')).read_text())['files']
for x in rows:assert row(r/x['path'])==x,x['path']
for p in [Path(__file__),Path(__file__).with_name('launch.py'),Path(__file__).with_name('graft_verify.py'),Path(__file__).with_name('protected-inputs.json'),r/'assets/source/overhaul-pounce-gait-058/author.py',r/'docs/overhaul/gait-058-author-handoff.md',r/'docs/overhaul/critic/gait-058b-source-review.md',r/'tools/overhaul-root-round-027/run-seal.py']:
 rows.append(row(p))
out=Path(__file__).with_name('run-seal.json');assert not out.exists()
out.write_text(json.dumps({'files':rows,'command':['python','tools/overhaul-gait-058/launch.py'],'scope':'ONE critic-approved058B author120s plus conditionalgraft40s under180root. Firstfailure stop; no retry; no publication.'},indent=2),encoding='utf8')
print(row(out))
