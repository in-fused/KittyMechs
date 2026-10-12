import subprocess,time,json
from pathlib import Path
p=Path('tools/player-animation-package-196');start=time.perf_counter();cmd=['node','node_modules/tsx/dist/cli.mjs',str(p/'decode196.mts')]
with (p/'decode-stdout196.txt').open('w') as log:
 proc=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=proc.wait(timeout=30);status='TERMINAL'
 except subprocess.TimeoutExpired:proc.kill();code=proc.wait();status='TIMEOUT'
r=dict(command=cmd,pid=proc.pid,capSeconds=30,elapsedSeconds=time.perf_counter()-start,exitCode=code,status=status);(p/'decode-process196.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
