from pathlib import Path
import json,subprocess,shutil,time
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent;node=shutil.which('node');assert node
receipt={'scope':'one type15 and fixture-only coherent owner suite30; exact CLOSED274 runtime, no browser/native game/build','steps':[]}
try:
 for label,args,cap in [('type',[node,str(R/'node_modules/typescript/bin/tsc'),'--project',str(H/'tsconfig275.json')],15),('suite',[node,str(R/'node_modules/tsx/dist/cli.mjs'),str(H/'owner275.test.ts')],30)]:
  start=time.monotonic();p=subprocess.run(args,cwd=R,capture_output=True,timeout=cap);(H/(label+'275.stdout')).write_bytes(p.stdout);(H/(label+'275.stderr')).write_bytes(p.stderr);receipt['steps'].append({'name':label,'command':args,'cap':cap,'exit':p.returncode,'seconds':time.monotonic()-start});(H/'terminal275.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
  if p.returncode:break
except Exception as error:receipt['wrapperFailure']=repr(error)
finally:
 (H/'terminal275.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
 if receipt.get('wrapperFailure') or any(s['exit'] for s in receipt['steps']):raise SystemExit(1)
