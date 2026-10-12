from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-038/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-play-experience-057/capture.mjs','.sites-runtime/overhaul-20261010/experience057-baseline'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
