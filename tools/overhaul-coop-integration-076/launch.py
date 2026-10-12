from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2]
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-045/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-play-076/capture.mjs','.sites-runtime/overhaul-20261010/coop076-public'],env=env))
