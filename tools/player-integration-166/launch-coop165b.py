from pathlib import Path
import hashlib,os,subprocess
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261009/build-060';env=dict(os.environ)
expected='a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b'
assert hashlib.sha256((b/'receipt.json').read_bytes()).hexdigest()==expected
env['KITTYMECH_BUILD_ROOT']=str(b);env['KITTYMECH_BUILD_RECEIPT']=expected
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-165/mission-capture.mjs'],cwd=r,env=env))
