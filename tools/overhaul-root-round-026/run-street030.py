from pathlib import Path
import json,hashlib,datetime,time,subprocess,sys
r=Path(__file__).resolve().parents[2];clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat()
mode=sys.argv[1];assert mode in ('build','capture');cap=180 if mode=='build' else 120
o=r/f'.sites-runtime/overhaul-20261010/street030-{mode}-process';o.mkdir(exist_ok=False)
rows=json.loads((r/'tools/overhaul-root-round-026/street030-seal.json').read_text(encoding='utf8'))['files']
def match(x):
 b=(r/x['path']).read_bytes();return len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256']
assert all(match(x) for x in rows)
cmd=['cmd.exe','/d','/c','npm.cmd run build'] if mode=='build' else ['node','tools/overhaul-street-player-030.mjs']
failure=None
with (o/'stdout.txt').open('wb') as f:
 child=subprocess.Popen(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=max(1,cap-10-(time.monotonic()-clock)))
 except subprocess.TimeoutExpired:
  code=-1;failure='TIMEOUT; no retry; descendant cleanup unverified'
  try:
   subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);child.wait(timeout=2)
  except subprocess.TimeoutExpired:failure+='; parent termination unobserved'
receipt={'startUTC':start,'exitCode':code,'failure':failure,'pid':child.pid,'command':cmd,'inputsAfter':[{'path':x['path'],'match':match(x)} for x in rows],'stdoutSHA256':hashlib.sha256((o/'stdout.txt').read_bytes()).hexdigest(),'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'capSeconds':cap}
receipt['inclusiveCapObserved']=receipt['elapsedSeconds']<=cap
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps({k:receipt[k] for k in ['startUTC','endUTC','elapsedSeconds','exitCode','failure']}));raise SystemExit(code)
