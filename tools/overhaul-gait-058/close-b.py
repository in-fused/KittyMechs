from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=json.loads(Path(__file__).with_name('run-seal.json').read_text())
for x in seal['files']:assert row(r/x['path'])==x,x['path']
paths=[p for folder in ['assets/source/overhaul-pounce-gait-058','.sites-runtime/overhaul-20261010/gait058b-author'] for p in (r/folder).rglob('*') if p.is_file()]
out=Path(__file__).with_name('result-b-seal.json');assert not out.exists()
out.write_text(json.dumps({'scope':'FIRST_FAILURE_STOP export mesh precondition.459actual57bone readbacks completed; no exportedGLB/graft/publication/contact admission. Frozen039 live.', 'files':[row(p) for p in paths]+[row(Path(__file__))]},indent=2),encoding='utf8')
print(row(out))
