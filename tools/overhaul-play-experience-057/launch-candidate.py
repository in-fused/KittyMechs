from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-039/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='7975f3f3f86f67ea1ccc06fb804bf1f8eee317475fb08b157cacb49e277e6815'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-play-experience-057/capture.mjs','.sites-runtime/overhaul-20261010/experience057-candidate'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
