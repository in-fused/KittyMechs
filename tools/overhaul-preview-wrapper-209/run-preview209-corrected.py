"""UNRUN. ONE approved Blender preview plus assembly within180s total.
Uses exact saved209 poses, new61 master; old source/receipts never overwritten."""
import pathlib,subprocess,time,json,datetime,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'tools/overhaul-preview-209'
def protected():
 seal=json.loads((HERE/'readiness-seal209.json').read_text());out=[]
 for r in seal['files']+seal['protectedInputs']:
  p=ROOT/r['path'];out.append(dict(r,match=p.stat().st_size==r['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']))
 return out
before=protected()
if not all(r['match'] for r in before):raise RuntimeError('209_PREVIEW_PROTECTED_SOURCE_CHANGED')
if (HERE/'preview-receipt209.json').exists() or any((HERE/'preview').glob('*.png')):raise RuntimeError('209_PREVIEW_FRESH_OUTPUT_ONLY')
command=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--python-exit-code','1','--python',str(HERE/'preview209.py')];start=time.monotonic();receipt={'command':command,'capSeconds':180,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'protectedBefore':before}
with (HERE/'preview-stdout209.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,cwd=ROOT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=p.pid
 try:receipt['exitCode']=p.wait(timeout=max(1,180-(time.monotonic()-start)));receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:p.kill();receipt['exitCode']=p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_BLENDER_KILLED'
 if receipt['exitCode']==0:
  remaining=180-(time.monotonic()-start)
  if remaining<=0:receipt['status']='TIMEOUT_ASSEMBLY_UNREACHED';receipt['exitCode']=1
  else:
   a=subprocess.Popen([sys.executable,str(HERE/'assemble-preview209.py')],stdout=log,stderr=subprocess.STDOUT,cwd=ROOT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['assemblyPID']=a.pid
   try:receipt['assemblyExitCode']=a.wait(timeout=remaining)
   except subprocess.TimeoutExpired:a.kill();receipt['assemblyExitCode']=a.wait(timeout=5);receipt['status']='TIMEOUT_OWN_ASSEMBLY_KILLED'
   if receipt['assemblyExitCode']!=0:receipt['exitCode']=1
receipt['elapsedSeconds']=time.monotonic()-start;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt['protectedAfter']=protected();(HERE/'preview-process209.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));raise SystemExit(0 if receipt['exitCode']==0 and all(r['match'] for r in receipt['protectedAfter']) else 1)
