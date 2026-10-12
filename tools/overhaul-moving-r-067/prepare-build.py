from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths={r/x['path'] for x in json.loads((h/'source-seal.json').read_text())['files']}
for folder in ['src','shared','server']:
 paths.update(p for p in (r/folder).rglob('*') if p.is_file())
paths.update(r/p for p in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','docs/overhaul/critic/moving-r-067-check-review.md','tools/overhaul-root-round-027/run-seal.py'])
paths.update([Path(__file__),h/'controller-check-result.json'])
old=r/'.sites-runtime/overhaul-20261009/build-042';paths.add(old/'receipt.json')
paths.update(old/'playable-root'/x['path'] for x in json.loads((old/'receipt.json').read_text())['files'])
(h/'build-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['npm.cmd','run','build'],'scope':'ONE067 build candidate; no actual play or performance acceptance.'},indent=2),encoding='utf8')
print('One candidate build seal prepared.')
