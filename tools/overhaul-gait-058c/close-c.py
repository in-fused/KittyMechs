from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal=json.loads(Path(__file__).with_name('run-seal.json').read_text())
for x in seal['files']:assert row(r/x['path'])==x,x['path']
paths=[p for folder in ['assets/source/overhaul-pounce-gait-058c','.sites-runtime/overhaul-20261010/gait058c-export'] for p in (r/folder).rglob('*') if p.is_file()]
out=Path(__file__).with_name('result-c-seal.json');assert not out.exists()
out.write_text(json.dumps({'scope':'FIRST_FAILURE_STOP saved-B preservation precondition; comparison records no actual differing component. Zero saved-key replays/exportGLB/graft/publication. Frozen040 LIMITED live.', 'files':[row(p) for p in paths]+[row(Path(__file__))]},indent=2),encoding='utf8')
print(row(out))
