"""Root serial execution with immutable-input verification and durable receipts."""
from pathlib import Path
import datetime, hashlib, json, subprocess, sys, time

root = Path(__file__).resolve().parents[2]
clock = time.monotonic()
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
kind = sys.argv[1]
if kind == 'visual028':
    seals = ['tools/overhaul-runtime-art-integration-028/seal.json']
    output = root / '.sites-runtime/overhaul-20261010/runtime-art-player-028-process'
    command = ['node', 'tools/overhaul-runtime-art-player-028.mjs']
    cap = 120
elif kind == 'performance026':
    seals = ['tools/overhaul-player-performance-026/baseline-seal.json']
    output = root / '.sites-runtime/overhaul-20261010/player-performance-026-process'
    command = ['node', 'tools/overhaul-player-performance-026/capture.mjs', '--origin', 'http://localhost:8800', '--output', '.sites-runtime/overhaul-20261010/player-performance-026-baseline']
    cap = 90
elif kind == 'pose027':
    seals = ['tools/overhaul-pounce-pose-owner-027/diagnostic-seal.json', 'tools/overhaul-pounce-pose-owner-027/protected-inputs.json']
    output = root / '.sites-runtime/overhaul-20261010/pose-owner-027-process'
    command = ['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe', '--background', '--factory-startup', '--python-exit-code', '1', '--python', str(root / 'assets/source/overhaul-pounce-pose-owner-027/diagnostic.py')]
    cap = 60
else:
    raise ValueError(kind)
output.mkdir(exist_ok=False)
rows = []
for path in seals:
    seal = json.loads((root / path).read_text(encoding='utf-8-sig'))
    rows.extend(seal.get('rows', seal.get('files', [])))
def verify(row):
    data = (root / row['path']).read_bytes()
    return len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'].lower()
for row in rows:
    assert verify(row), row['path']
(output / 'verified-inputs.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
failure = None
with (output / 'stdout.txt').open('wb') as stream:
    child = subprocess.Popen(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        code = child.wait(timeout=max(1, cap-(time.monotonic()-clock)-10))
    except subprocess.TimeoutExpired:
        # Stop the complete spawned tree, then observe the parent terminate.
        try:
            subprocess.run(['taskkill', '/PID', str(child.pid), '/T', '/F'], stdout=stream, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW, timeout=5)
            child.wait(timeout=2)
        except subprocess.TimeoutExpired:
            failure = 'TIMEOUT; cleanup not observed within reserved bound'
        code = -1
        failure = failure or 'TIMEOUT; tree-stop requested and parent termination observed; descendant termination unverified; no retry'
receipt = {'kind': kind, 'startUTC': start, 'endUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'elapsedSeconds': time.monotonic()-clock, 'capSeconds': cap, 'pid': child.pid, 'exitCode': code, 'failure': failure, 'command': command, 'inputsAfter': [{'path': row['path'], 'match': verify(row)} for row in rows], 'stdoutSHA256': hashlib.sha256((output/'stdout.txt').read_bytes()).hexdigest()}
receipt['elapsedSeconds'] = time.monotonic()-clock
receipt['inclusiveBoundObserved'] = receipt['elapsedSeconds'] <= cap
(output/'process-receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
print(json.dumps({key: receipt[key] for key in ['kind','startUTC','endUTC','elapsedSeconds','exitCode','failure']}, ensure_ascii=True))
raise SystemExit(code)
