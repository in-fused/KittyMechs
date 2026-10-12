from pathlib import Path
import ctypes as C,ctypes.wintypes as W,subprocess,time,json,hashlib,os
assert os.environ.get('KITTYMECH_221_ACTUAL_APPROVED')=='1','221 root actual gate absent; STATIC ONLY'
r=Path(__file__).resolve().parents[2];out=r/'tools/overhaul-pack-221/loader-supervisor';out.mkdir(exist_ok=False);start=time.monotonic()
k=C.WinDLL('kernel32',use_last_error=True)
class BASIC(C.Structure):_fields_=[('PerProcessUserTimeLimit',C.c_longlong),('PerJobUserTimeLimit',C.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',C.c_size_t),('MaximumWorkingSetSize',C.c_size_t),('ActiveProcessLimit',W.DWORD),('Affinity',C.c_size_t),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class IO(C.Structure):_fields_=[(n,C.c_ulonglong) for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class EXT(C.Structure):_fields_=[('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',C.c_size_t),('JobMemoryLimit',C.c_size_t),('PeakProcessMemoryUsed',C.c_size_t),('PeakJobMemoryUsed',C.c_size_t)]
class PIDLIST(C.Structure):_fields_=[('assigned',W.DWORD),('count',W.DWORD),('ids',C.c_size_t*128)]
k.CreateJobObjectW.argtypes=[C.c_void_p,W.LPCWSTR];k.CreateJobObjectW.restype=W.HANDLE
k.SetInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD];k.AssignProcessToJobObject.argtypes=[W.HANDLE,W.HANDLE];k.QueryInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD,C.c_void_p];k.CloseHandle.argtypes=[W.HANDLE]
k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD];k.OpenProcess.restype=W.HANDLE
k.GetProcessTimes.argtypes=[W.HANDLE,C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME)]
job=k.CreateJobObjectW(None,None);limits=EXT();limits.BasicLimitInformation.LimitFlags=0x2000
assert job and k.SetInformationJobObject(job,9,C.byref(limits),C.sizeof(limits))
def creation(pid):
 h=k.OpenProcess(0x1000,False,pid)
 if not h:return None
 t=[W.FILETIME() for _ in range(4)]
 try:
  return (t[0].dwHighDateTime<<32)|t[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in t]) else None
 finally:k.CloseHandle(h)
def protection():
 rows=[]
 for name in ['pack-source-seal221.json','loader-source-seal221.json']:
  for row in json.loads((r/'tools/overhaul-pack-221'/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 for name in ['tools/overhaul-native-214/source-seal.json','tools/overhaul-native-wiring-218/source-seal.json','tools/overhaul-pack-221/protected-inputs221.json']:
  for row in json.loads((r/name).read_text())['files']:
   actual=hashlib.sha256((r/row['path']).read_bytes()).hexdigest();rows.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256']})
 return rows
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
  child=subprocess.Popen(['node','tools/overhaul-pack-221/browser-equivalence221.mjs','--root-approved-loader221'],cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
  assert k.AssignProcessToJobObject(job,int(child._handle))
  print(json.dumps({'nodePID':child.pid,'creationTime':creation(child.pid),'jobObjectKillOnClose':True,'capSeconds':30}),flush=True)
  while child.poll() is None:
   ids=PIDLIST();assert k.QueryInformationJobObject(job,3,C.byref(ids),C.sizeof(ids),None)
   for pid in ids.ids[:ids.count]:owned[str(pid)]=creation(pid)
   if time.monotonic()-start>=27:failure='TIMEOUT FIRST_FAILURE; native job object owns all descendants';break
   time.sleep(.25)
except BaseException as error:
 failure=repr(error)
finally:
 k.CloseHandle(job)
 if child:
  try:child.wait(timeout=max(.1,30-(time.monotonic()-start)))
  except subprocess.TimeoutExpired:failure=(failure or '')+' child termination not observed'
 # Release retained terminal child handle before checking PID creation identity.
 if child and child.returncode is not None:child._handle.Close()
 after={pid:{'creationBefore':stamp,'creationAfter':creation(int(pid)),'originalIdentityAbsent':creation(int(pid))!=stamp} for pid,stamp in owned.items()}
 receipt={'nodePID':child.pid if child else None,'exitCode':child.returncode if child else None,'failure':failure,'elapsedSeconds':time.monotonic()-start,'capSeconds':30,'ownedPIDCreationTimes':owned,'ownedAfter':after,'inclusiveBoundObserved':time.monotonic()-start<=30}
 afterProtection=protection();(out/'protected-after.json').write_text(json.dumps(afterProtection,indent=2));receipt['protectedMatch']=all(x['match'] for x in afterProtection);receipt['finalOriginalIdentitiesAbsent']=all(v['originalIdentityAbsent'] for v in after.values());receipt['elapsedSeconds']=time.monotonic()-start;receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=30;
 (out/'process-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt),flush=True)
raise SystemExit(1 if failure or child is None or child.returncode or not receipt['protectedMatch'] or not receipt['finalOriginalIdentitiesAbsent'] or not receipt['inclusiveBoundObserved'] else 0)
