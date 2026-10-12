"""Root-owned ONE207 wrapper for admitted204; no replay or source repair."""
from pathlib import Path
import ctypes,ctypes.wintypes as w,json,hashlib,os,subprocess,time,datetime,sys,urllib.request,re
r=Path(__file__).resolve().parents[2];clock=time.monotonic();now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
base=r/'.sites-runtime/overhaul-20261010';out=base/'coop204-supervisor';prep=base/'coop204-supervisor-preparation';public=base/'coop204-public'
for p in [out,public]:assert not p.exists(),str(p)
if prep.exists():assert (prep/'first-preflight-failure.json').is_file() and not (prep/'run-seal.json').exists(),'Existing actual preparation cannot replay'
else:prep.mkdir()
def save(p,x):p.write_text(json.dumps(x,indent=2)+'\n',encoding='utf8')
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def match(x):return row(r/x['path'])==x
seal=r/'tools/overhaul-coop-204/source-seal.json';assert row(seal)['sha256']=='3c1ea6da4f0a0ccab25f3c161106bfa5dace464c710b21355aa6e1d414a48cbd'
s=json.loads(seal.read_text(encoding='utf8'));assert s['writer']=='CLOSED';assert all(match(x) for x in s['files'])
deps=json.loads((r/'tools/overhaul-coop-204/protected-inputs.json').read_text(encoding='utf8'))['files'];assert len(deps)==88;assert all(match(x) for x in deps)
build=r/'.sites-runtime/overhaul-20261009/build-062';br=build/'receipt.json';receipt='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c';assert row(br)['sha256']==receipt
frozen=[]
for x in json.loads(br.read_text(encoding='utf8'))['files']:
 p=build/'playable-root'/x['path'];b=p.read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'];frozen.append(row(p))
frozen.append(row(br))
def get(url):
 with urllib.request.urlopen('http://localhost:8799'+url,timeout=4) as response:return response.status,response.read(),dict(response.headers)
code,health,_=get('/health');h=json.loads(health);assert code==200 and h['status']=='ok' and h['rooms']==0 and h['players']==0 and h['tickRate']==60
code,index,headers=get('/');expectedIndex=(build/'playable-root/dist/index.html').read_bytes().replace(b'</head>',b'<meta name="kittymech-arena" content="same-origin"/><meta name="kittymech-client-report" content="local"/></head>');assert code==200 and index==expectedIndex
asset=re.search(rb'(?:src|href)="(/assets/[^" ]+\.js)"',index).group(1).decode();code,content,_=get(asset);assert code==200 and content==(build/'playable-root/dist'/asset.lstrip('/')).read_bytes()
cmd="Get-CimInstance Win32_Process -Filter \"ProcessId = 370280\" | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate | ConvertTo-Json -Compress; Get-NetTCPConnection -State Listen -LocalPort 8799 | Select-Object OwningProcess,LocalAddress,LocalPort | ConvertTo-Json -Compress"
p=subprocess.run(['powershell','-NoProfile','-Command',cmd],capture_output=True,text=True,timeout=8,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
lines=[json.loads(x) for x in p.stdout.splitlines() if x.strip()];server=lines[0];listeners=lines[1] if isinstance(lines[1],list) else [lines[1]]
assert server['ProcessId']==370280 and server['Name']=='node.exe' and '--import tsx server/index.ts --production' in server['CommandLine'];assert all(x['OwningProcess']==370280 for x in listeners)
save(prep/'preflight.json',{'at':now(),'wrapperPID':os.getpid(),'server':server,'listeners':listeners,'health':h,'indexSHA256':hashlib.sha256(index).hexdigest(),'asset':asset,'assetSHA256':hashlib.sha256(content).hexdigest(),'buildReceipt':receipt,'frozenRows':len(frozen),'sourceRows':len(s['files']),'recursiveDependencyRows':len(deps),'sourceProtected':'ALL_MATCH'})
# Primary Windows process tree inventory; no browser/native commands injected.
class PE(ctypes.Structure):
 _fields_=[('dwSize',w.DWORD),('cntUsage',w.DWORD),('th32ProcessID',w.DWORD),('th32DefaultHeapID',ctypes.c_size_t),('th32ModuleID',w.DWORD),('cntThreads',w.DWORD),('th32ParentProcessID',w.DWORD),('pcPriClassBase',w.LONG),('dwFlags',w.DWORD),('szExeFile',w.WCHAR*260)]
k=ctypes.WinDLL('kernel32',use_last_error=True);k.CreateToolhelp32Snapshot.restype=w.HANDLE;k.Process32FirstW.argtypes=[w.HANDLE,ctypes.POINTER(PE)];k.Process32NextW.argtypes=[w.HANDLE,ctypes.POINTER(PE)];k.CloseHandle.argtypes=[w.HANDLE];k.OpenProcess.restype=w.HANDLE;k.OpenProcess.argtypes=[w.DWORD,w.BOOL,w.DWORD];k.GetProcessTimes.argtypes=[w.HANDLE,ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME)]
def created(pid):
 handle=k.OpenProcess(0x1000,False,pid)
 if not handle:return None
 a,b,c,d=w.FILETIME(),w.FILETIME(),w.FILETIME(),w.FILETIME();ok=k.GetProcessTimes(handle,ctypes.byref(a),ctypes.byref(b),ctypes.byref(c),ctypes.byref(d));k.CloseHandle(handle);return ((a.dwHighDateTime<<32)|a.dwLowDateTime) if ok else None
def processes():
 handle=k.CreateToolhelp32Snapshot(2,0);entry=PE();entry.dwSize=ctypes.sizeof(entry);items=[]
 try:
  ok=k.Process32FirstW(handle,ctypes.byref(entry))
  while ok:
   items.append({'pid':entry.th32ProcessID,'parentPID':entry.th32ParentProcessID,'name':entry.szExeFile});ok=k.Process32NextW(handle,ctypes.byref(entry))
 finally:k.CloseHandle(handle)
 return items
assert not any(x['name'].lower() in ['msedge.exe','chrome.exe','blender.exe'] for x in processes()),'Exclusive graphics ownership preflight failed'
fileRows={x['path']:x for x in [row(seal)]+s['files']+deps+[row(Path(__file__).resolve()),row(r/'docs/overhaul/critic/coop204-source-review.md'),row(r/'tools/overhaul-root-round-033/run-mission-seal045.py')]}
env={'KITTYMECH_BUILD_ROOT':str(build),'KITTYMECH_BUILD_RECEIPT':receipt};run={'writer':'CLOSED','scope':'ONE207 admitted204 ordinary publicmission; no repair/replay;20ready420work30cleanup450child480supervisor','files':list(fileRows.values()),'protected':frozen,'sourceSealSHA256':row(seal)['sha256'],'buildReceiptSHA256':receipt,'command':['C:/Program Files/nodejs/node.exe','--import','tsx','tools/overhaul-coop-204/mission-capture.mjs',str(public)],'requiredEnvironment':env}
save(prep/'run-seal.json',run)
owned={};snapshots=[];failure=None;child=None;code=None
command=[sys.executable,'tools/overhaul-root-round-033/run-mission-seal045.py',str((prep/'run-seal.json').relative_to(r)),'coop204-supervisor','480']
try:
 with (prep/'wrapper-stdout.txt').open('wb') as log:
  child=subprocess.Popen(command,cwd=r,env={**os.environ,**env},stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
  print(json.dumps({'status':'ACTUAL204_RUNNING','wrapperPID':os.getpid(),'supervisorPID':child.pid,'capSeconds':480,'sourceSealSHA256':row(seal)['sha256']}),flush=True)
  while child.poll() is None:
   allp=processes();ids={child.pid};changed=True
   while changed:
    changed=False
    for q in allp:
     if q['parentPID'] in ids and q['pid'] not in ids:ids.add(q['pid']);changed=True
   current=[]
   for q in allp:
    if q['pid'] in ids:
     q={**q,'creationFiletime':created(q['pid'])};owned.setdefault(q['pid'],q);current.append(q)
   snapshots.append({'at':now(),'elapsedSeconds':time.monotonic()-clock,'processes':current});save(prep/'owned-processes-live.json',{'wrapperPID':os.getpid(),'supervisorPID':child.pid,'owned':list(owned.values()),'snapshots':snapshots})
   if time.monotonic()-clock>480:
    failure='EXTERNAL480_BOUND_STOP';subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],capture_output=True,timeout=5,creationflags=subprocess.CREATE_NO_WINDOW);break
   time.sleep(2)
  code=child.wait(timeout=5)
except Exception as error:failure=str(error)
finally:
 cleanup=[]
 for pid,q in reversed(list(owned.items())):
  identity=created(pid)
  if identity is not None and identity==q['creationFiletime']:
   z=subprocess.run(['taskkill','/PID',str(pid),'/T','/F'],capture_output=True,text=True,timeout=5,creationflags=subprocess.CREATE_NO_WINDOW);cleanup.append({'pid':pid,'identityMatched':True,'exitCode':z.returncode,'stdout':z.stdout,'stderr':z.stderr})
 after=[]
 for x in list(fileRows.values())+frozen:after.append({'path':x['path'],'match':match(x)})
 try:_,b,_=get('/health');save(prep/'health-after.json',json.loads(b))
 except Exception as error:save(prep/'health-after.json',{'error':str(error)})
 save(prep/'wrapper-receipt.json',{'writer':'CLOSED','exitCode':code,'failure':failure,'wrapperPID':os.getpid(),'supervisorPID':child.pid if child else None,'elapsedSeconds':time.monotonic()-clock,'inclusiveCapSeconds':480,'owned':list(owned.values()),'cleanup':cleanup,'remainingSameIdentity':[q for q in owned.values() if created(q['pid'])==q['creationFiletime']],'inputsAfter':after,'protectedMatch':all(x['match'] for x in after)})
 print(json.dumps({'status':'TERMINAL','exitCode':code,'failure':failure,'protectedMatch':all(x['match'] for x in after),'elapsedSeconds':time.monotonic()-clock}),flush=True)
sys.exit(code if code is not None else 1)
