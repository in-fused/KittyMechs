"""Bind a local play capture to exact runtime, build and admitted asset bytes."""
from pathlib import Path
import hashlib, json, sys

root = Path(__file__).resolve().parents[1]
name = sys.argv[1]
if not name.startswith('build-') or not name[6:].isdigit():
    raise SystemExit('Use a fresh build-NNN receipt name')
out = root / '.sites-runtime/overhaul-20261009' / name
out.mkdir(exist_ok=False)
paths = set()
for folder in ('shared', 'src', 'server', 'dist', 'public/assets/overhaul', 'public/assets/fonts'):
    paths.update(p for p in (root / folder).rglob('*') if p.is_file())
for folder in ('public/assets/models',):
    paths.update(p for p in (root / folder).glob('*.glb'))
paths.update(root / n for n in ('package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html'))
rows = []
for path in sorted(paths):
    if not path.exists():
        continue
    data = path.read_bytes()
    rows.append({'path': path.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
receipt = {'scope': 'Source/build/asset fingerprint for frozen ordinary play; not a source backup or approval.', 'files': rows}
(out / 'receipt.json').write_text(json.dumps(receipt, indent=2))
print(json.dumps({'receipt': str(out / 'receipt.json'), 'files': len(rows), 'bytes': sum(r['bytes'] for r in rows)}))
