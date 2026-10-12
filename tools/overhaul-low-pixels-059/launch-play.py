from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-041/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='5d8ceac51465cf20ae96e3c1c96d777595d0bb1ae3ff44d6160c0465e143eb10'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-low-pixels-059/capture.mjs','.sites-runtime/overhaul-20261010/low059-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
