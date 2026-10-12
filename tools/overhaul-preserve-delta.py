"""Preserve a source delta against an immutable full checkpoint; never delete files."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '.sites-runtime/overhaul-20261009/preserved-007'
if len(sys.argv) != 2 or not sys.argv[1].startswith('handoff-'):
    raise SystemExit('Supply a fresh handoff-NNN name.')
DEST = ROOT / '.sites-runtime/overhaul-20261010' / sys.argv[1]
if DEST.exists():
    raise SystemExit('Destination already exists; never overwrite a checkpoint.')
baseline = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
old = {r['path']: r for r in baseline['files']}
excluded = {'.git', 'node_modules', '.sites-runtime', 'test-results',
            'test-results-online', 'playwright-report', '__pycache__'}

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

DEST.mkdir(parents=True)
records = []
seen = set()
for directory, dirs, names in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in excluded]
    for name in names:
        source = Path(directory) / name
        rel = source.relative_to(ROOT).as_posix()
        seen.add(rel)
        sha = digest(source)
        if rel in old and old[rel]['sha256'].lower() == sha:
            continue
        target = DEST / 'files' / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        if digest(target) != sha or digest(source) != sha:
            raise SystemExit(f'Concurrent mutation or copy mismatch: {rel}')
        records.append({'path': rel, 'bytes': target.stat().st_size, 'sha256': sha})
status = subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=ROOT, text=True)
(DEST / 'git-status.txt').write_text(status, encoding='utf-8')
manifest = {'createdUnix': time.time(), 'root': str(ROOT), 'base': str(BASE),
            'baseManifestSha256': digest(BASE / 'manifest.json'),
            'scope': 'Verified current source delta including ignored editable assets; historical runtime evidence stays at original paths. Overlay files on preserved-007; do not delete historical assets.',
            'files': records, 'count': len(records),
            'bytes': sum(r['bytes'] for r in records),
            'absentFromCurrentWorkspace': [r for r in old if r not in seen and not r.startswith('.sites-runtime/')]}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'checkpoint': str(DEST), 'count': manifest['count'],
                  'bytes': manifest['bytes'], 'verified': True}))
