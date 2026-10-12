from pathlib import Path
import subprocess,shutil,json,time
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).parent
receipt={'scope':'one finite decoded-rig equivalence/cost suite, no browser/build/native game','steps':[]}
node=shutil.which('node');assert node
try:
 for label,command,cap in [('type',[node,str(ROOT/'node_modules/typescript/bin/tsc'),'--project',str(HERE/'tsconfig256.json')],15),('suite',[node,str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(HERE/'equivalence256.test.ts')],30)]:
  start=time.monotonic();result=subprocess.run(command,cwd=ROOT,capture_output=True,timeout=cap)
  (HERE/(label+'256.stdout')).write_bytes(result.stdout);(HERE/(label+'256.stderr')).write_bytes(result.stderr)
  receipt['steps'].append({'name':label,'command':command,'capSeconds':cap,'exit':result.returncode,'elapsedSeconds':time.monotonic()-start})
  (HERE/'terminal256.json').write_text(json.dumps(receipt,indent=2))
  if result.returncode:break
except Exception as error:receipt['wrapperFailure']=repr(error)
finally:
 (HERE/'terminal256.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
 if receipt.get('wrapperFailure') or any(s['exit'] for s in receipt['steps']):raise SystemExit(1)
