from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];env=dict(os.environ)
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-059/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','tools/player-experience-158/play158.mjs'],cwd=r,env=env))
