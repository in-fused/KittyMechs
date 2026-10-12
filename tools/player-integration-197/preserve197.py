from pathlib import Path
import hashlib, json, shutil, datetime

r = Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
prior = r / '.sites-runtime/overhaul-20261010/handoff-074'
assert sha(prior / 'manifest.json') == '4bf46de313233c74f86fbef29e7661fda66a2f02671873353fd06fc5f7ee26e3'
old = json.loads((prior / 'manifest.json').read_text(encoding='utf8'))
for x in old['files']:
    assert sha(prior / 'files' / x['path']) == x['sha256'], x['path']
folders = ['tools/overhaul-phase-transition-197', 'assets/source/overhaul-phase-transition-197',
           'tools/overhaul-far-city-198', 'assets/source/overhaul-far-city-198',
           'tools/overhaul-far-city-199', 'assets/source/overhaul-far-city-199',
           'tools/overhaul-far-city-200', 'assets/source/overhaul-far-city-200',
           'tools/player-integration-197']
for folder in folders:
    if folder.startswith('tools/overhaul-'):
        seal = r / folder / 'source-seal.json'
        data = json.loads(seal.read_text(encoding='utf8'))
        assert data['writer'] == 'CLOSED', folder
        for x in data['files']:
            assert sha(r / x['path']) == x['sha256'], x['path']
base = r / '.sites-runtime/overhaul-20261009/build-062'
assert sha(base / 'receipt.json') == '5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
count = 0
for x in json.loads((base / 'receipt.json').read_text(encoding='utf8'))['files']:
    assert sha(base / 'playable-root' / x['path']) == x['sha256'], x['path']
    if x['path'].startswith(('src/', 'shared/', 'server/')):
        assert sha(r / x['path']) == x['sha256'], x['path']
        count += 1
paths = ['docs/overhaul/player-integration-197-handoff.md',
         'docs/overhaul/resource-limit-handoff-20261010.md',
         'docs/overhaul/motion-design-reassessment-197.md',
         'docs/overhaul/critic/phase-transition197-source-review.md']
for folder in folders:
    paths.extend(p.relative_to(r).as_posix() for p in (r / folder).rglob('*')
                 if p.is_file() and '__pycache__' not in p.parts)
dest = r / '.sites-runtime/overhaul-20261010/handoff-075'
dest.mkdir(exist_ok=False)
rows = []
for name in sorted(set(paths)):
    p = r / name
    q = dest / 'files' / name
    q.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, q)
    assert sha(p) == sha(q), name
    rows.append({'path': name, 'bytes': p.stat().st_size, 'sha256': sha(p)})
manifest = {**old, 'createdUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'parents': old['parents'] + [{'path': str(prior), 'manifestSHA256': sha(prior / 'manifest.json')}],
            'files': rows, 'count': len(rows), 'bytes': sum(x['bytes'] for x in rows),
            'scope': '197 source motion and independent review; 198/199 import failures and bounded200 ingestion redesign. Exact062 runtime retained; full scope and human lag incomplete.'}
(dest / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
assert all(sha(dest / 'files' / x['path']) == x['sha256'] for x in rows)
out = {'status': 'VERIFIED', 'overlay': str(dest), 'manifestSHA256': sha(dest / 'manifest.json'),
       'count': len(rows), 'bytes': manifest['bytes'], 'runtimeRowsMatched062': count}
(r / '.sites-runtime/overhaul-20261010/continuation-verification-075.json').write_text(json.dumps(out, indent=2), encoding='utf8')
print(json.dumps(out))
