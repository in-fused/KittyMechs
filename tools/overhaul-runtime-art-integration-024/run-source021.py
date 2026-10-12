from pathlib import Path
import json,hashlib,datetime,time,subprocess
r=Path(__file__).resolve().parents[2];o=r/'.sites-runtime/overhaul-20261010/wholebody-source-021';o.mkdir(exist_ok=False)
s=json.loads((r/'tools/overhaul-pounce-wholebody-source-021/source-seal.json').read_text(encoding='utf-8'))
protected=json.loads((r/'tools/overhaul-pounce-wholebody-source-021/protected-inputs.json').read_text(encoding='utf-8'))
rows=s.get('rows',s.get('files'))+protected.get('rows',protected.get('files'));verified=[]
for row in rows:
 b=(r/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path'];verified.append(row)
(o/'verified-inputs.json').write_text(json.dumps(verified,indent=2),encoding='utf-8')
cmd=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(r/'assets/source/overhaul-pounce-wholebody-source-021/author.py')]
deadline=datetime.datetime(2026,10,10,19,53,tzinfo=datetime.timezone.utc);cap=min(300,int((deadline-datetime.datetime.now(datetime.timezone.utc)).total_seconds())-15);assert cap>=30,'No honest bounded job window';start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic();failure=None
with (o/'blender-stdout.txt').open('wb') as f:
 child=subprocess.Popen(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=cap)
 except subprocess.TimeoutExpired:child.kill();child.wait();code=-1;failure='TIMEOUT; source cleanup unknown; no retry'
after=[]
for row in rows:
 b=(r/row['path']).read_bytes();after.append({'path':row['path'],'match':len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']})
receipt={'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'timeoutCapSeconds':cap,'elapsedSeconds':time.monotonic()-clock,'pid':child.pid,'exitCode':code,'failure':failure,'command':cmd,'inputsAfter':after,'stdoutSHA256':hashlib.sha256((o/'blender-stdout.txt').read_bytes()).hexdigest()}
(o/'process-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt,ensure_ascii=True));raise SystemExit(code)
