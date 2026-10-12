import subprocess,time,json,pathlib,hashlib,os,sys
root=pathlib.Path(__file__).resolve().parents[2];out=root/'tools/overhaul-far-city-198';assets=root/'assets/source/overhaul-far-city-198'
if (assets/'Rainline_Far198.blend').exists() or (out/'repair-process-receipt.json').exists():raise RuntimeError('198_FIRST_RUN_ONLY')
source=root/'assets/source/overhaul-city-v4/Rainline_Identity_v4.blend';before=hashlib.sha256(source.read_bytes()).hexdigest();start=time.monotonic()
cmd=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(assets/'author198.py')]
with open(out/'repair-stdout.txt','w') as stdout,open(out/'repair-stderr.txt','w') as stderr:
 p=subprocess.Popen(cmd,cwd=root,stdout=stdout,stderr=stderr,creationflags=subprocess.CREATE_NO_WINDOW)
 (out/'repair-process-active.json').write_text(json.dumps({'writer':'OPEN','pid':p.pid,'capSeconds':175,'command':cmd},indent=2))
 try:code=p.wait(timeout=175);status='TERMINAL'
 except subprocess.TimeoutExpired:p.kill();code=p.wait(timeout=10);status='TIMEOUT_FIRST_FAILURE_STOP'
receipt={'writer':'CLOSED','status':status,'pid':p.pid,'exitCode':code,'inclusiveSeconds':time.monotonic()-start,'capSeconds':175,'sourceMasterBefore':before,'sourceMasterAfter':hashlib.sha256(source.read_bytes()).hexdigest(),'outputs':[{'path':str(f.relative_to(root)).replace('\\','/'),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in assets.iterdir() if f.is_file() and f.name!='author198.py']}
(out/'repair-process-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt));sys.exit(0 if code==0 and status=='TERMINAL' and receipt['sourceMasterBefore']==receipt['sourceMasterAfter'] else 1)
