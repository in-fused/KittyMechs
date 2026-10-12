# NEW045 sole finite full-mission supervisor: explicit 420s work +30s cleanup, 480s inclusive root maximum. Original180s wrapper remains unchanged. No automatic retry.
from pathlib import Path
import json,hashlib,datetime,time,subprocess,sys
r=Path(__file__).resolve().parents[2];clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat()
seal=r/sys.argv[1];s=json.loads(seal.read_text(encoding='utf8'));cap=int(sys.argv[3]);assert cap==480
o=r/'.sites-runtime/overhaul-20261010'/sys.argv[2];o.mkdir(exist_ok=False)
rows=s.get('files',[])+s.get('protected',[])
def match(x):
 b=(r/x['path']).read_bytes();return len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'].lower()
assert all(match(x) for x in rows)
cmd=s['command'];failure=None
with (o/'stdout.txt').open('wb') as f:
 child=subprocess.Popen(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=max(1,cap-10-(time.monotonic()-clock)))
 except subprocess.TimeoutExpired:
  code=-1;failure='TIMEOUT; no retry; descendant cleanup unverified'
  try:
   subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);child.wait(timeout=2)
  except subprocess.TimeoutExpired:failure+='; parent termination unobserved'
receipt={'startUTC':start,'exitCode':code,'failure':failure,'pid':child.pid,'command':cmd,'sealSHA256':hashlib.sha256(seal.read_bytes()).hexdigest(),'inputsAfter':[{'path':x['path'],'match':match(x)} for x in rows],'stdoutSHA256':hashlib.sha256((o/'stdout.txt').read_bytes()).hexdigest(),'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'inclusiveCapSeconds':cap}
receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=cap
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps({k:receipt[k] for k in ['startUTC','endUTC','elapsedSeconds','exitCode','failure']}));raise SystemExit(code)
