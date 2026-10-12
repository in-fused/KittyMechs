import subprocess,time,json,pathlib,datetime
r=pathlib.Path.cwd();p=r/'tools/overhaul-render-178';commands=[('fixture',['node','node_modules/tsx/dist/cli.mjs','tools/overhaul-render-178/check178.mts'],45),('types',['node','node_modules/typescript/bin/tsc','--noEmit'],60)];receipts=[]
for name,command,cap in commands:
 started=time.monotonic();v={'writer':'CLOSED','job':name,'command':command,'capSeconds':cap,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 with (p/(name+'-stdout178.txt')).open('w',encoding='utf8') as f:
  proc=subprocess.Popen(command,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);v['pid']=proc.pid
  try:v['exitCode']=proc.wait(timeout=cap);v['status']='TERMINAL'
  except subprocess.TimeoutExpired:proc.kill();v['exitCode']=proc.wait(timeout=10);v['status']='TIMEOUT_OWN_PID_KILLED'
 v['elapsedSeconds']=time.monotonic()-started;v['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(p/(name+'-process178.json')).write_text(json.dumps(v,indent=2));receipts.append(v)
 if v['exitCode']!=0:break
print(json.dumps(receipts));raise SystemExit(receipts[-1]['exitCode'])
