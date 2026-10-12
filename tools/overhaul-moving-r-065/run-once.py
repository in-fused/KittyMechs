from pathlib import Path
import json,hashlib,subprocess,datetime,time
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;start=time.monotonic();stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
s=json.loads((h/'run-seal.json').read_text());rows=s['files'];assert all((r/x['path']).stat().st_size==x['bytes'] and sha(r/x['path'])==x['sha256'] for x in rows)
o=r/'.sites-runtime/overhaul-20261010/moving-r065-curve';o.mkdir(exist_ok=False);failure=None
with (o/'stdout.txt').open('wb') as f:
 p=subprocess.Popen(s['command'],cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=p.wait(timeout=max(.1,7-(time.monotonic()-start)))
 except subprocess.TimeoutExpired:
  failure='FIRST_FAILURE_TIMEOUT; no retry';code=-1
  try:subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=1);p.wait(timeout=.5)
  except subprocess.TimeoutExpired:failure+='; cleanup not confirmed'
receipt={'startUTC':stamp,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-start,'inclusiveCapSeconds':10,'exitCode':code,'failure':failure,'pid':p.pid,'command':s['command'],'sealSHA256':sha(h/'run-seal.json'),'inputsAfter':[{'path':x['path'],'match':(r/x['path']).stat().st_size==x['bytes'] and sha(r/x['path'])==x['sha256']} for x in rows],'stdoutSHA256':sha(o/'stdout.txt')};receipt['inclusiveBoundObserved']=time.monotonic()-start<=10
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt));raise SystemExit(code)
