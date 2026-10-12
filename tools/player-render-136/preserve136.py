from pathlib import Path
import json, hashlib, shutil, datetime
r = Path(__file__).resolve().parents[2]
prior = r / '.sites-runtime/overhaul-20261010/handoff-056'
dest = r / '.sites-runtime/overhaul-20261010/handoff-057'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior / 'manifest.json') == 'debcf03bed3ef08b86dd4b210c2474d81c0313f331906cf6c3344918662c9565'
old = json.loads((prior / 'manifest.json').read_text())
paths = ['docs/overhaul/player-render-136-handoff.md', 'docs/overhaul/resource-limit-handoff-20261010.md', 'docs/overhaul/body-clearance139-design.md', 'src/game/effects/WeatherSky.tsx']
for folder in ['tools/player-render-136', 'tools/overhaul-coop-138']:
    paths.extend(p.relative_to(r).as_posix() for p in (r / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for pattern in ['*136*', '*138*']:
    paths.extend(p.relative_to(r).as_posix() for p in (r / 'docs/overhaul/critic').glob(pattern) if p.is_file())
for folder in ['render136-raster', 'render136-observation', 'render136-public', 'render136-review', 'coop138-observation', 'coop138-public', 'coop138-review']:
    paths.extend(p.relative_to(r).as_posix() for p in (r / '.sites-runtime/overhaul-20261010' / folder).rglob('*') if p.is_file())
for name in ['receipt.json', 'playable-checkpoint.json']:
    paths.append('.sites-runtime/overhaul-20261009/build-056/' + name)
dest.mkdir(exist_ok=False)
rows = []
for name in sorted(set(paths)):
    p = r / name
    q = dest / 'files' / name
    q.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, q)
    assert sha(p) == sha(q)
    rows.append({'path': name, 'bytes': p.stat().st_size, 'sha256': sha(p)})
manifest = {**old, 'createdUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'parents': old['parents'] + [{'path': str(prior), 'manifestSHA256': sha(prior / 'manifest.json')}], 'files': rows, 'count': len(rows), 'bytes': sum(x['bytes'] for x in rows), 'scope': '136 limited background-order checkpoint;138 actual mission failure;139 unimplemented design. Exact136 handoff controls. Full goal INCOMPLETE. Ordered parents then files; never028.'}
(dest / 'manifest.json').write_text(json.dumps(manifest, indent=2))
assert all(sha(dest / 'files' / x['path']) == x['sha256'] for x in rows)
verification = {'status': 'VERIFIED', 'overlay': str(dest), 'manifestSHA256': sha(dest / 'manifest.json'), 'count': len(rows), 'bytes': manifest['bytes']}
(r / '.sites-runtime/overhaul-20261010/continuation-verification-057.json').write_text(json.dumps(verification, indent=2))
print(json.dumps(verification))
