from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths={r/x['path'] for x in json.loads((r/'tools/overhaul-gait-runtime-061/source-seal.json').read_text())['files']}
for folder in ['tools/overhaul-renderer-ui-060','tools/overhaul-low-pixels-059']:
 paths.update(p for p in (r/folder).rglob('*') if p.is_file())
paths.update(r/p for p in ['src/ui/Settings.tsx','src/ui/styles.css','src/game/rendering/renderPixelBudget059.ts','docs/overhaul/critic/gait-runtime-061-source-review.md','tools/overhaul-root-round-027/run-seal.py','package.json',__file__])
old=r/'.sites-runtime/overhaul-20261009/build-041';paths.add(old/'receipt.json')
paths.update(old/'playable-root'/x['path'] for x in json.loads((old/'receipt.json').read_text())['files'])
(h/'build-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['npm.cmd','run','build'],'scope':'One build042: accepted061 gait integration +059 pixels +060 spacing. Full goal incomplete.'},indent=2),encoding='utf8')
print('build seal ready')
