from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-039/receipt.json';digest=hashlib.sha256(p.read_bytes()).hexdigest()
assert digest=='7975f3f3f86f67ea1ccc06fb804bf1f8eee317475fb08b157cacb49e277e6815'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=digest
raise SystemExit(subprocess.run(['node','tools/overhaul-steady-cpu-058/capture.mjs','.sites-runtime/overhaul-20261010/steady058-cpu'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
