from pathlib import Path
import hashlib,os,subprocess,sys
r=Path(__file__).resolve().parents[2]
if sys.argv[1]=='syntax':
 for p in ['tools/overhaul-coop-controller-115/controller.mjs','tools/overhaul-coop-integration-116/mission-capture.mjs']:
  code=subprocess.call(['node','--check',p],cwd=r)
  if code:raise SystemExit(code)
else:
 env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256((r/'.sites-runtime/overhaul-20261009/build-052/receipt.json').read_bytes()).hexdigest()
 raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-integration-116/mission-capture.mjs','.sites-runtime/overhaul-20261010/coop116-public'],cwd=r,env=env))


