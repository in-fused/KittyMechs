from pathlib import Path
import hashlib,os,subprocess,sys
r=Path(__file__).resolve().parents[2];env=os.environ.copy()
env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-054/receipt.json').read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/player-integration-134/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop134-public'],cwd=r,env=env))
