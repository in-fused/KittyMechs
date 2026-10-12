from pathlib import Path
import ctypes as C,ctypes.wintypes as W,subprocess,time,json,hashlib,os
assert os.environ.get('KITTYMECH_241_BUILD_APPROVED')=='1','226 root build gate absent; STATIC ONLY'
r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/shader-startup-238/build241-supervisor';assert (r/'.sites-runtime/shader-startup-238').is_junction() and (r/'.sites-runtime/shader-startup-238').resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve(),'241 D output run junction changed'
out.mkdir(exist_ok=False);start=time.monotonic()
k=C.WinDLL('kernel32',use_last_error=True)
class BASIC(C.Structure):_fields_=[('PerProcessUserTimeLimit',C.c_longlong),('PerJobUserTimeLimit',C.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',C.c_size_t),('MaximumWorkingSetSize',C.c_size_t),('ActiveProcessLimit',W.DWORD),('Affinity',C.c_size_t),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class IO(C.Structure):_fields_=[(n,C.c_ulonglong) for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class EXT(C.Structure):_fields_=[('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',C.c_size_t),('JobMemoryLimit',C.c_size_t),('PeakProcessMemoryUsed',C.c_size_t),('PeakJobMemoryUsed',C.c_size_t)]
class PIDLIST(C.Structure):_fields_=[('assigned',W.DWORD),('count',W.DWORD),('ids',C.c_size_t*128)]
k.CreateJobObjectW.argtypes=[C.c_void_p,W.LPCWSTR];k.CreateJobObjectW.restype=W.HANDLE
k.SetInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD];k.AssignProcessToJobObject.argtypes=[W.HANDLE,W.HANDLE];k.QueryInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD,C.c_void_p];k.CloseHandle.argtypes=[W.HANDLE]
k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD];k.OpenProcess.restype=W.HANDLE
k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.WaitForSingleObject.restype=W.DWORD
k.GetProcessTimes.argtypes=[W.HANDLE,C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME)]
job=k.CreateJobObjectW(None,None);limits=EXT();limits.BasicLimitInformation.LimitFlags=0x2000
assert job and k.SetInformationJobObject(job,9,C.byref(limits),C.sizeof(limits))
def creation(pid):
 h=k.OpenProcess(0x101000,False,pid)
 if not h:return None
 t=[W.FILETIME() for _ in range(4)]
 try:
  return None if k.WaitForSingleObject(h,0)==0 else ((t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None)
 finally:k.CloseHandle(h)
def protection():
 rows=[]
 for row in json.loads((r/'tools/overhaul-program-integration-241/binding.json').read_text())['files']:
  b=(r/row['path']).read_bytes();actual=hashlib.sha256(b).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256'] and len(b)==row['bytes']})
 for name in ['pack-source-seal221.json','loader-source-seal221.json']:
  for row in json.loads((r/'tools/overhaul-pack-221'/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 for name in ['tools/overhaul-native-214/source-seal.json','tools/overhaul-native-wiring-218/source-seal.json','tools/overhaul-pack-221/protected-inputs221.json']:
  for row in json.loads((r/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 return rows
os.environ.update(KITTYMECH_225_BUILD_APPROVED='1',KITTYMECH_220_DELIVERY_APPROVED='1',KITTYMECH_222_LOADER_RECEIPT='tools/overhaul-pack-221/loader-evidence/evidence.json',KITTYMECH_222_LOADER_RECEIPT_SHA='4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232')
before=protection();(out/'protected-before.json').write_text(json.dumps(before,indent=2));assert all(x['match'] for x in before),'221 before protection failed'
owned={};failure=None;child=None
try:
 with (out/'stdout.txt').open('wb') as f:
  query="$p=Get-CimInstance Win32_Process -Filter 'ProcessId=370280';$h=Invoke-RestMethod http://127.0.0.1:8799/health;$l=Get-NetTCPConnection -LocalPort 8799 -State Listen;[pscustomobject]@{pid=$p.ProcessId;command=$p.CommandLine;created=$p.CreationDate;listener=@($l.OwningProcess);status=$h.status;rooms=$h.rooms;players=$h.players;tickRate=$h.tickRate}|ConvertTo-Json -Depth 3"
  data=json.loads(subprocess.check_output(['powershell','-NoProfile','-Command',query],cwd=r,creationflags=subprocess.CREATE_NO_WINDOW,timeout=8).decode('utf-8-sig'))
  (out/'native-preflight-operands.json').write_text(json.dumps(data,indent=2))
  assert creation(370280)==134362153569448006,'221 retained server creation changed'
  idle=subprocess.check_output(['powershell','-NoProfile','-Command',"@(Get-CimInstance Win32_Process | Where-Object {$_.Name -in @('msedge.exe','blender.exe')}).Count"],creationflags=subprocess.CREATE_NO_WINDOW,timeout=5).decode().strip();assert idle=='0','221 machine slot occupied'
  assert data['pid']==370280 and set(data['listener'])=={370280} and data['command']=='"C:\\Program Files\\nodejs\\node.exe" --import tsx server/index.ts --production' and data['status']=='ok' and data['rooms']==0 and data['players']==0 and data['tickRate']==60
  (out/'native-preflight.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
  assert not (r/'.sites-runtime/shader-startup-238/private241').exists(),'226 output must be fresh; no automatic repair/rebuild'
  child=subprocess.Popen(['node','tools/overhaul-program-integration-241/build241.mjs'],cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
  assert k.AssignProcessToJobObject(job,int(child._handle))
  print(json.dumps({'nodePID':child.pid,'creationTime':creation(child.pid),'jobObjectKillOnClose':True,'capSeconds':60}),flush=True)
  while child.poll() is None:
   ids=PIDLIST();assert k.QueryInformationJobObject(job,3,C.byref(ids),C.sizeof(ids),None)
   for pid in ids.ids[:ids.count]:
    stamp=creation(pid)
    if stamp is not None:owned.setdefault(str(pid),stamp)
   if time.monotonic()-start>=55:failure='TIMEOUT FIRST_FAILURE; native job object owns all descendants';break
   time.sleep(.25)
except BaseException as error:
 failure=repr(error)
finally:
 k.CloseHandle(job)
 if child:
  try:child.wait(timeout=max(.1,60-(time.monotonic()-start)))
  except subprocess.TimeoutExpired:failure=(failure or '')+' child termination not observed'
 # Release retained terminal child handle before checking PID creation identity.
 if child and child.returncode is not None:child._handle.Close()
 after={pid:{'creationBefore':stamp,'creationAfter':creation(int(pid)),'originalIdentityRetired':creation(int(pid))!=stamp} for pid,stamp in owned.items()}
 receipt={'nodePID':child.pid if child else None,'exitCode':child.returncode if child else None,'failure':failure,'elapsedSeconds':time.monotonic()-start,'capSeconds':60,'ownedPIDCreationTimes':owned,'ownedAfter':after,'inclusiveBoundObserved':time.monotonic()-start<=60}
 afterProtection=protection();(out/'protected-after.json').write_text(json.dumps(afterProtection,indent=2));receipt['protectedMatch']=all(x['match'] for x in afterProtection);receipt['finalOriginalIdentitiesRetired']=all(v['originalIdentityRetired'] for v in after.values());receipt['elapsedSeconds']=time.monotonic()-start;receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=60;
 (out/'process-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt),flush=True)
raise SystemExit(1 if failure or child is None or child.returncode or not receipt['protectedMatch'] or not receipt['finalOriginalIdentitiesRetired'] or not receipt['inclusiveBoundObserved'] else 0)
