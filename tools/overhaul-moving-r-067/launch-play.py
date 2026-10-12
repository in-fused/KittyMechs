from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-043/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='0cacbbd7c6c17d6c7bacb4aead027cd26812a640361f6cf25a78cfb3f855165d'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-moving-r-067/capture.mjs','.sites-runtime/overhaul-20261010/moving-r067-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
