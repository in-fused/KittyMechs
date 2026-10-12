from pathlib import Path
import subprocess,shutil,json,time
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent;node=shutil.which('node');assert node
receipt={'scope':'one scoped type preflight + one finite actual-decoded numerical composition suite; no browser/native game','steps':[]}
try:
 for label,args,cap in [('type',[node,str(R/'node_modules/typescript/bin/tsc'),'--project',str(H/'tsconfig267.json')],20),('suite',[node,str(R/'node_modules/tsx/dist/cli.mjs'),str(H/'composed267.test.ts')],45)]:
  start=time.monotonic();p=subprocess.run(args,cwd=R,capture_output=True,timeout=cap);(H/(label+'267.stdout')).write_bytes(p.stdout);(H/(label+'267.stderr')).write_bytes(p.stderr)
  receipt['steps'].append({'name':label,'command':args,'cap':cap,'exit':p.returncode,'seconds':time.monotonic()-start});(H/'terminal267.json').write_text(json.dumps(receipt,indent=2))
  if p.returncode:break
except Exception as error:receipt['wrapperFailure']=repr(error)
finally:
 (H/'terminal267.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
 if receipt.get('wrapperFailure') or any(s['exit'] for s in receipt['steps']):raise SystemExit(1)
