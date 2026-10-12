from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];receipt=r/'.sites-runtime/overhaul-20261009/build-045/receipt.json'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(receipt.read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-play-075/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop075-public'],env=env))
