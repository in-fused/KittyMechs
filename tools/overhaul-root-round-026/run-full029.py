from pathlib import Path
import json,hashlib,datetime,time,subprocess
r=Path(__file__).resolve().parents[2];clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat()
o=r/'.sites-runtime/overhaul-20261010/paired-route-029-full-process';o.mkdir(exist_ok=False)
rows=[]
for path in ['tools/overhaul-pounce-paired-route-029/full-seal.json','tools/overhaul-pounce-paired-route-029/full-protected-inputs.json']:
    s=json.loads((r/path).read_text(encoding='utf-8-sig'));rows.extend(s.get('rows',s.get('files',[])))
def match(x):
    b=(r/x['path']).read_bytes();return len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'].lower()
for x in rows:assert match(x),x['path']
(o/'verified-inputs.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
cmd=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(r/'assets/source/overhaul-pounce-paired-route-029/author.py')]
deadline=datetime.datetime(2026,10,10,21,10,tzinfo=datetime.timezone.utc)
cap=min(300,(deadline-datetime.datetime.now(datetime.timezone.utc)).total_seconds()-10)
assert cap>=30,'No honest job window'
failure=None
with (o/'stdout.txt').open('wb') as f:
    child=subprocess.Popen(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    try:code=child.wait(timeout=max(1,cap-(time.monotonic()-clock)-10))
    except subprocess.TimeoutExpired:
        code=-1;failure='TIMEOUT; no retry; descendant cleanup unverified'
        try:
            subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);child.wait(timeout=2)
        except subprocess.TimeoutExpired:failure+='; parent termination unobserved'
receipt={'startUTC':start,'exitCode':code,'failure':failure,'pid':child.pid,'command':cmd,'inputsAfter':[{'path':x['path'],'match':match(x)} for x in rows],'stdoutSHA256':hashlib.sha256((o/'stdout.txt').read_bytes()).hexdigest(),'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'inclusiveCapSeconds':cap}
receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=cap
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps({k:receipt[k] for k in ['startUTC','endUTC','elapsedSeconds','exitCode','failure']},ensure_ascii=True));raise SystemExit(code)

