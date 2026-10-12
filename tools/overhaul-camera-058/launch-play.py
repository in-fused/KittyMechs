from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261009/build-040/receipt.json'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='99fc6e628c99e635cf8f4a04cadbb5cd4787096cb24a41e3358d68f7b9a4061f'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(p.read_bytes()).hexdigest()
raise SystemExit(subprocess.run(['node','tools/overhaul-camera-058/capture.mjs','.sites-runtime/overhaul-20261010/camera058-play'],cwd=r,env=env,creationflags=subprocess.CREATE_NO_WINDOW,timeout=115).returncode)
