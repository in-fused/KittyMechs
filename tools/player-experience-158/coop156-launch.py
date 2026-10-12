from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2]
frozen=r/'.sites-runtime/overhaul-20261009/build-058';env=dict(os.environ)
env['KITTYMECH_BUILD_ROOT']=str(frozen)
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((frozen/'receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-156/mission-capture.mjs'],cwd=r,env=env))
