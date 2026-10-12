from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];env=os.environ.copy()
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-056/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','tools/player-locomotion-146/solo-baseline.mjs'],cwd=r,env=env))
