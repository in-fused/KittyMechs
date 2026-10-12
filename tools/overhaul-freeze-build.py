"""Copy an existing build receipt into a fresh, verified playable root."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

workspace = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2 or not sys.argv[1].startswith('build-') or not sys.argv[1][6:].isdigit():
    raise SystemExit('Supply an existing build-NNN receipt.')
checkpoint = workspace / '.sites-runtime/overhaul-20261009' / sys.argv[1]
receipt_path = checkpoint / 'receipt.json'
receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
destination = checkpoint / 'playable-root'
if destination.exists():
    raise SystemExit('Playable root already exists; never overwrite a checkpoint.')

def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()

# Validate every path and current source before creating a partial checkpoint.
for row in receipt['files']:
    source = (workspace / row['path']).resolve()
    target = (destination / row['path']).resolve()
    if not source.is_relative_to(workspace) or not target.is_relative_to(destination):
        raise SystemExit('Receipt path escapes its checkpoint.')
    if source.stat().st_size != row['bytes'] or digest(source) != row['sha256']:
        raise SystemExit(f"Source changed since receipt: {row['path']}")

destination.mkdir()
for row in receipt['files']:
    source = workspace / row['path']
    target = destination / row['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    if digest(target) != row['sha256'] or digest(source) != row['sha256']:
        raise SystemExit(f"Concurrent mutation or copy mismatch: {row['path']}")

result = {
    'scope': 'SHA-verified frozen source, client and admitted assets; not gameplay approval.',
    'receipt': str(receipt_path), 'receiptSha256': digest(receipt_path),
    'playableRoot': str(destination), 'files': len(receipt['files']),
    'bytes': sum(row['bytes'] for row in receipt['files']), 'verified': True,
}
(checkpoint / 'playable-checkpoint.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
