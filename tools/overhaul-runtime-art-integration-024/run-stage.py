from pathlib import Path
import sys,subprocess,json,datetime,time,hashlib
root=Path(__file__).resolve().parents[2]
out=root/'.sites-runtime/overhaul-20261010/runtime-art-integration-024'
out.mkdir(parents=True,exist_ok=True)
stage=sys.argv[1]
commands={'compile':['node',str(root/'node_modules/typescript/bin/tsc'),'--noEmit'],'build':['node',str(root/'node_modules/vite/bin/vite.js'),'build'],'capture':['node',str(root/'tools/overhaul-runtime-art-player-024.mjs')]}
if stage not in commands:raise SystemExit('Unknown stage')
receipt=out/(stage+'-receipt.json');stdout=out/(stage+'-stdout.txt')
if receipt.exists() or stdout.exists():raise SystemExit('Stage already attempted; never rerun')
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic();failure=None
with stdout.open('wb') as f:
 child=subprocess.Popen(commands[stage],cwd=root,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=180 if stage=='capture' else 70)
 except subprocess.TimeoutExpired:
  failure='TIMEOUT first attempt stopped'
  subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
  child.wait();code=-1
r={'stage':stage,'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'exitCode':code,'failure':failure,'command':commands[stage],'cwd':str(root),'stdoutSHA256':hashlib.sha256(stdout.read_bytes()).hexdigest()}
receipt.write_text(json.dumps(r,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=True));raise SystemExit(code)
