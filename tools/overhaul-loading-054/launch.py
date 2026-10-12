from pathlib import Path
import os,subprocess,hashlib
r=Path(__file__).resolve().parents[2]
receipt=r/'.sites-runtime/overhaul-20261009/build-037/receipt.json'
digest=hashlib.sha256(receipt.read_bytes()).hexdigest()
assert digest=='9a3b25dfacca91d8e359b58484acb91ac771d224cf1bbd3efc1f59b6d8303f85'
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=digest
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-loading-054/startup-capture-b.mjs','.sites-runtime/overhaul-20261010/loading054-public'],env=env))
