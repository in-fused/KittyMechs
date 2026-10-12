from pathlib import Path
import subprocess,time,json,datetime
r=Path.cwd();p=r/'tools/overhaul-render-181';command=['node','node_modules/typescript/bin/tsc','--noEmit'];started=time.monotonic();receipt={'writer':'CLOSED','command':command,'capSeconds':60,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (p/'types-stdout181.txt').open('w',encoding='utf8') as f:
 proc=subprocess.Popen(command,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=proc.pid
 try:receipt['exitCode']=proc.wait(timeout=60);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:proc.kill();receipt['exitCode']=proc.wait(timeout=10);receipt['status']='TIMEOUT_OWN_PID_KILLED'
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(p/'types-process181.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(receipt['exitCode'])
