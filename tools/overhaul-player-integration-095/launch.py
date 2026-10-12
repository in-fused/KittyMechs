from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];receipt=r/'.sites-runtime/overhaul-20261009/build-048/receipt.json'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(receipt.read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-player-view-089/capture.mjs','.sites-runtime/overhaul-20261010/player095-candidate'],env=env))
