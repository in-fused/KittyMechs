from pathlib import Path
import sys,subprocess,json,datetime,time,hashlib
root=Path(__file__).resolve().parents[2]
out=root/'.sites-runtime/overhaul-20261010/camera-focus-016'
build=out/'build-root'
stage=sys.argv[1]
commands={'compile':['node',str(root/'node_modules/typescript/bin/tsc'),'--noEmit'],'build':['node',str(root/'node_modules/vite/bin/vite.js'),'build'],'capture':['node',str(root/'tools/overhaul-camera-focus-player-016.mjs')]}
if stage not in commands:raise SystemExit('Unknown stage')
receipt=out/(stage+'-receipt.json');stdout=out/(stage+'-stdout.txt')
if receipt.exists() or stdout.exists():raise SystemExit('Stage already attempted; never rerun')
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
with stdout.open('wb') as f:
 try:
  child=subprocess.run(commands[stage],cwd=root if stage=='capture' else build,stdout=f,stderr=subprocess.STDOUT,timeout=185 if stage=='capture' else 55)
  code=child.returncode;failure=None
 except subprocess.TimeoutExpired:
  code=-1;failure='TIMEOUT first attempt stopped'
r={'stage':stage,'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'exitCode':code,'failure':failure,'command':commands[stage],'cwd':str(root if stage=='capture' else build),'stdoutSHA256':hashlib.sha256(stdout.read_bytes()).hexdigest()}
receipt.write_text(json.dumps(r,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=True));raise SystemExit(code)
