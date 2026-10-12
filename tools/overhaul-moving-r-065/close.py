from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'run-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files'])
paths=[h/'curve-results.json',h/'run-seal.json',h/'close.py',r/'docs/overhaul/critic/moving-r-065-source-review.md'];paths.extend(p for p in (r/'.sites-runtime/overhaul-20261010/moving-r065-curve').rglob('*') if p.is_file())
out=h/'result-seal.json';assert not out.exists();out.write_text(json.dumps({'files':[row(p) for p in paths],'scope':'ONE065 CPU actual curve readback, no game/asset/build change. Asynchronous observations not native pad contact/exact boundary jumps. All14 inputs remain unchanged.'},indent=2),encoding='utf8');print(row(out))
