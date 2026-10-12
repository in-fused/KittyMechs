from pathlib import Path
import subprocess,time,json,shutil
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;start=time.monotonic();receipt={'writer':'CLOSED','scope':'one scoped type+geometry suite, inclusive30s, no browser/build/native gameplay','steps':[]};node=shutil.which('node')
try:
 for name,args in [('type',[node,str(r/'node_modules/typescript/bin/tsc'),'--project',str(f/'tsconfig280.json')]),('geometry',[node,'--import','tsx',str(f/'geometry280.ts')])]:
  remaining=28-(time.monotonic()-start)
  if remaining<=0:raise RuntimeError('280 inclusive test budget exhausted')
  began=time.monotonic();p=subprocess.run(args,cwd=r,capture_output=True,timeout=remaining,creationflags=subprocess.CREATE_NO_WINDOW);(f/(name+'280.stdout')).write_bytes(p.stdout);(f/(name+'280.stderr')).write_bytes(p.stderr);receipt['steps'].append({'name':name,'exit':p.returncode,'seconds':time.monotonic()-began})
  if p.returncode:break
except Exception as error:receipt['error']=repr(error)
finally:
 receipt['elapsedSeconds']=time.monotonic()-start;receipt['inclusive30Observed']=receipt['elapsedSeconds']<=30;(f/'terminal280.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
raise SystemExit(1 if receipt.get('error') or not receipt['inclusive30Observed'] or any(x['exit'] for x in receipt['steps']) else 0)
