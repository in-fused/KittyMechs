from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-042/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='e849a169d97519e5546ea33ad8dcc5d474132a1c3f53e2185147b879800338ee'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-observer-063/capture.mjs','.sites-runtime/overhaul-20261010/observer063-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
