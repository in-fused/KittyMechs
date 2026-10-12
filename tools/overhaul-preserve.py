"""Copy and rehash current source, ignored art, and current playable package.
Never removes or rewrites an existing checkpoint. Run before overhaul mutation.
"""
from pathlib import Path
import hashlib, json, shutil, subprocess, time, os, sys

ROOT = Path(__file__).resolve().parents[1]
checkpoint = sys.argv[1] if len(sys.argv)>1 else 'preserved-001'
if not checkpoint.startswith('preserved-') or not checkpoint.removeprefix('preserved-').isdigit():
    raise SystemExit('Use a fresh numbered preserved-NNN checkpoint name.')
DEST = ROOT / '.sites-runtime' / 'overhaul-20261009' / checkpoint
if DEST.exists():
    raise SystemExit('Checkpoint exists; preserve it and choose a fresh destination.')
excluded = {'.git', 'node_modules', '.sites-runtime', 'test-results', 'test-results-online', 'playwright-report', '__pycache__'}
files = []
for directory, dirs, names in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in excluded]
    files.extend(Path(directory) / name for name in names)
release = ROOT / '.sites-runtime/city-fidelity-001/root/admitted-release-stage-001'
if not release.is_dir():
    raise SystemExit('Historical playable package absent; investigate before replacement.')
files += list(p for p in release.rglob('*') if p.is_file())
size = sum(p.stat().st_size for p in files)
if shutil.disk_usage(ROOT).free < size + 2_000_000_000:
    raise SystemExit(f'Insufficient space to preserve {size} bytes.')
DEST.mkdir(parents=True)
records = []
def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()
for p in files:
    rel = p.relative_to(ROOT)
    target = DEST / 'files' / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    before = digest(p)
    shutil.copy2(p, target)
    after = digest(target)
    if before != after: raise SystemExit(f'Copy mismatch: {rel}')
    records.append({'path': rel.as_posix(), 'bytes': target.stat().st_size, 'sha256': after})
    if len(records) % 500 == 0: print(f'Preserved {len(records)} files', flush=True)
status = subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=ROOT, text=True)
(DEST / 'git-status.txt').write_text(status, encoding='utf-8')
manifest = {'createdUnix': time.time(), 'root': str(ROOT), 'files': records, 'count': len(records), 'bytes': size,
            'scope': 'Working source including ignored art, dist and current retained playable release. Historical .sites-runtime evidence remains in its original location.'}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'checkpoint': str(DEST), 'files': len(records), 'bytes': size, 'verified': True}), flush=True)
