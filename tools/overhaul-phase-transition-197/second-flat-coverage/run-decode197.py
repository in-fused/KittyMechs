import subprocess,time,json,pathlib,datetime
r=pathlib.Path(__file__).resolve().parents[2];d=r/'tools/overhaul-phase-transition-197';command=['node',str(d/'browser-decode197.mjs')];started=time.monotonic();receipt={'command':command,'capSeconds':30,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (d/'decode-stdout197.txt').open('w',encoding='utf8') as f:
 p=subprocess.Popen(command,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,cwd=r);receipt['pid']=p.pid
 try:receipt['exitCode']=p.wait(timeout=30);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:
  subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);receipt['exitCode']=p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_PROCESS_TREE_KILLED'
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(d/'decode-process197.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(0 if receipt['exitCode']==0 else 1)
