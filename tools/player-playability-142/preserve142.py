from pathlib import Path
import json, hashlib, shutil, datetime
r = Path(__file__).resolve().parents[2]
prior = r / '.sites-runtime/overhaul-20261010/handoff-057'
dest = r / '.sites-runtime/overhaul-20261010/handoff-058'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior / 'manifest.json') == '70d36f7c275e973f0bc241d339346f5de047b74d6e66e0987b1fa277f62e4e58'
old = json.loads((prior / 'manifest.json').read_text(encoding='utf-8'))
paths = ['docs/overhaul/player-playability-142-handoff.md', 'docs/overhaul/resource-limit-handoff-20261010.md', 'docs/overhaul/gait140-causal-design.md', 'docs/overhaul/locomotion141-design.md', 'docs/overhaul/critic/locomotion141-experiment-review.md']
for folder in ['tools/player-playability-142', 'tools/overhaul-locomotion-141', 'tools/overhaul-locomotion-task-141']:
    paths.extend(p.relative_to(r).as_posix() for p in (r / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest.mkdir(exist_ok=False)
rows = []
for name in sorted(set(paths)):
    p = r / name
    q = dest / 'files' / name
    q.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, q)
    assert sha(p) == sha(q)
    rows.append({'path': name, 'bytes': p.stat().st_size, 'sha256': sha(p)})
manifest = {**old, 'createdUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'parents': old['parents'] + [{'path': str(prior), 'manifestSHA256': sha(prior / 'manifest.json')}], 'files': rows, 'count': len(rows), 'bytes': sum(x['bytes'] for x in rows), 'scope': '142 CLOSED causal investigations; corrected pointer;141 rejected native candidate and unimplemented measured two-rig task owner. Public056 unchanged LIMITED. Exact142 handoff controls; full goal INCOMPLETE. Ordered parents then files; never028.'}
(dest / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
assert all(sha(dest / 'files' / x['path']) == x['sha256'] for x in rows)
verification = {'status': 'VERIFIED', 'overlay': str(dest), 'manifestSHA256': sha(dest / 'manifest.json'), 'count': len(rows), 'bytes': manifest['bytes']}
(r / '.sites-runtime/overhaul-20261010/continuation-verification-058.json').write_text(json.dumps(verification, indent=2), encoding='utf-8')
print(json.dumps(verification))
