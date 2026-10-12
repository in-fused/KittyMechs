from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'source-seal.json').read_text());review=r/'docs/overhaul/critic/moving-r-067-source-review.md'
assert review.is_file()
paths={r/x['path'] for x in s['files']}|{review,h/'source-seal.json',Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'package.json',r/'shared/config.ts'}
rows=[row(p) for p in sorted(paths)]
for name,cmd in [('controller',['node','--import','tsx','tools/overhaul-moving-r-067/controller-check.ts']),('typecheck',['npm.cmd','run','typecheck'])]:
 (h/(name+'-seal.json')).write_text(json.dumps({'files':rows,'command':cmd,'scope':'ONE067 candidate check only; no actual movement/play acceptance.'},indent=2),encoding='utf8')
print('Focused controller/typecheck seals prepared; no jobs executed.')
