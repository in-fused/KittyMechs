from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];receipt=r/'.sites-runtime/overhaul-20261009/build-038/receipt.json'
digest=hashlib.sha256(receipt.read_bytes()).hexdigest();assert digest=='02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=digest
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-startup-rig-055/startup-capture.mjs','.sites-runtime/overhaul-20261010/startup055-public'],env=env))
