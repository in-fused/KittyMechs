from pathlib import Path
import json,hashlib,datetime,time,subprocess
r=Path(__file__).resolve().parents[2]; clock=time.monotonic(); start=datetime.datetime.now(datetime.timezone.utc).isoformat()
o=r/'.sites-runtime/overhaul-20261010/paired-route-029-diagnostic-process';o.mkdir(exist_ok=False)
rows=[]
for path in ['tools/overhaul-pounce-paired-route-029/diagnostic-seal.json','tools/overhaul-pounce-paired-route-029/protected-inputs.json']:
    s=json.loads((r/path).read_text(encoding='utf-8-sig'));rows.extend(s.get('rows',s.get('files',[])))
def match(x):
    b=(r/x['path']).read_bytes();return len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'].lower()
for x in rows:assert match(x),x['path']
(o/'verified-inputs.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
cmd=['python',str(r/'assets/source/overhaul-pounce-paired-route-029/triangle_diagnostic.py')]
failure=None
with (o/'stdout.txt').open('wb') as f:
    child=subprocess.Popen(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    try:code=child.wait(timeout=max(1,50-(time.monotonic()-clock)))
    except subprocess.TimeoutExpired:
        code=-1;failure='TIMEOUT; no retry; descendant cleanup unverified'
        try:
            subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);child.wait(timeout=2)
        except subprocess.TimeoutExpired:failure+='; parent termination unobserved'
receipt={'startUTC':start,'exitCode':code,'failure':failure,'pid':child.pid,'command':cmd,'inputsAfter':[{'path':x['path'],'match':match(x)} for x in rows],'stdoutSHA256':hashlib.sha256((o/'stdout.txt').read_bytes()).hexdigest(),'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock}
receipt['inclusive60sObserved']=receipt['elapsedSeconds']<=60
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps({k:receipt[k] for k in ['startUTC','endUTC','elapsedSeconds','exitCode','failure']},ensure_ascii=True));raise SystemExit(code)

