from pathlib import Path
import os,hashlib,subprocess
r=Path(__file__).resolve().parents[2];frozen=r/'.sites-runtime/overhaul-20261009/build-056';env=os.environ.copy()
env['KITTYMECH_BUILD_ROOT']=str(frozen)
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((frozen/'receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-138/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop138-public'],cwd=r,env=env))
