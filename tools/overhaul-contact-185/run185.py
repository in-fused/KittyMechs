import subprocess,time,json
from pathlib import Path
root=Path.cwd();out=root/'tools/overhaul-contact-185'
for name,cmd,cap in [('fixture',['node','node_modules/tsx/dist/cli.mjs','tools/overhaul-contact-185/check185.mts'],60),('types',['node','node_modules/typescript/bin/tsc','--noEmit'],60)]:
 start=time.perf_counter()
 with (out/(name+'-stdout185.txt')).open('w',encoding='utf-8') as log:
  p=subprocess.Popen(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
  try: code=p.wait(timeout=cap);status='TERMINAL'
  except subprocess.TimeoutExpired: p.kill();code=p.wait();status='TIMEOUT'
 receipt=dict(command=cmd,pid=p.pid,capSeconds=cap,elapsedSeconds=time.perf_counter()-start,exitCode=code,status=status)
 (out/(name+'-receipt185.json')).write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
 if code or status!='TERMINAL': break
