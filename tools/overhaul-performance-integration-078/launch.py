from pathlib import Path
import sys,os,subprocess,hashlib
r=Path(__file__).resolve().parents[2];mode=sys.argv[1];assert mode in ['baseline','candidate']
build='045' if mode=='baseline' else '046';receipt=r/('.sites-runtime/overhaul-20261009/build-'+build+'/receipt.json')
env=os.environ.copy();env['KITTYMECH_BUILD_RECEIPT']=hashlib.sha256(receipt.read_bytes()).hexdigest()
raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-performance-integration-078/capture.mjs','.sites-runtime/overhaul-20261010/performance078-'+mode],env=env))
