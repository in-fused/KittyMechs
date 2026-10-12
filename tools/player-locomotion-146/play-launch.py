from pathlib import Path
import os,json,hashlib,subprocess
r=Path(__file__).resolve().parents[2]
frozen=r/'.sites-runtime/overhaul-20261009/build-057'
env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((frozen/'receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','tools/player-locomotion-146/play.mjs'],cwd=r,env=env))
