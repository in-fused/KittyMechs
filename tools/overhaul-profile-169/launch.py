from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-060/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','tools/overhaul-profile-169/profile.mjs'],cwd=r,env=env))
