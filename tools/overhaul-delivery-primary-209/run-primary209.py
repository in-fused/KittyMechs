import subprocess,time,json,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-delivery-primary-209';out=root/'.sites-runtime/overhaul-20261010/delivery209-primary';out.mkdir(parents=True,exist_ok=True);command=['node',str(folder/'browser-decode209.mjs')];started=time.monotonic();receipt={'command':command,'capSeconds':30,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (out/'stdout.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,cwd=root,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=p.pid
 try:receipt['exitCode']=p.wait(timeout=30);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);receipt['exitCode']=p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_NODE_TREE_KILLED'
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt));raise SystemExit(0 if receipt['exitCode']==0 else 1)
