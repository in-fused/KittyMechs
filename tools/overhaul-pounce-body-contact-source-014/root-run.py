from pathlib import Path
import subprocess,json,datetime,time,hashlib
root=Path(__file__).resolve().parents[2]
out=root/'.sites-runtime/overhaul-20261010/pounce-body-contact-source-014';out.mkdir(exist_ok=False)
cmd=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(root/'assets/source/overhaul-pounce-body-contact-source-014/author.py')]
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic();timeout=False
with (out/'blender-stdout.txt').open('wb') as f:
 proc=subprocess.Popen(cmd,cwd=root,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=proc.wait(timeout=180)
 except subprocess.TimeoutExpired:
  timeout=True;proc.kill();code=proc.wait(timeout=10)
r={'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.monotonic()-clock,'pid':proc.pid,'exitCode':code,'timedOut':timeout,'command':cmd,'firstAttempt':True,'stdoutSHA256':hashlib.sha256((out/'blender-stdout.txt').read_bytes()).hexdigest()}
(out/'process-receipt.json').write_text(json.dumps(r,indent=2),encoding='utf-8');print(json.dumps(r,ensure_ascii=True));raise SystemExit(code if not timeout else 1)
