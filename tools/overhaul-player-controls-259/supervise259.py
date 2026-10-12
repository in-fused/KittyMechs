from pathlib import Path

import ctypes as C,ctypes.wintypes as W,subprocess,time,json,hashlib,os

assert os.environ.get('KITTYMECH_259_ACTUAL_APPROVED')=='1','227 root actual gate absent; STATIC ONLY'

r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/shader-startup-238/supervisor259';assert (r/'.sites-runtime/shader-startup-238').is_junction() and (r/'.sites-runtime/shader-startup-238').resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve(),'242 D output run junction changed'

start=time.monotonic()

clean=subprocess.run(['powershell','-NoProfile','-Command','npm run storage:clean'],cwd=r,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=25)

assert clean.returncode==0,'259 actual storage cleanup failed: '+clean.stdout.decode(errors='replace')

text=clean.stdout.decode('utf-8-sig');budget=json.loads(text[text.index('{'):])

assert budget['ArtifactGiB']<=48 and budget['HistoryGiB']<=2 and budget['CFreeGiB']>=30 and budget['DFreeGiB']>=100

receipt={'writer':'CLOSED','passed':True,'at':int(time.time()*1000),'scratchGiB':budget['ArtifactGiB'],'historyGiB':budget['HistoryGiB'],'cFreeGiB':budget['CFreeGiB'],'dFreeGiB':budget['DFreeGiB'],'deletedCount':budget['DeletedCount'],'command':'npm run storage:clean','exitCode':clean.returncode}

receiptPath=r/'.sites-runtime/shader-startup-238/storage259.json';assert not receiptPath.exists(),'259 storage receipt must be fresh'

receiptTemp=receiptPath.with_suffix('.json.tmp');assert not receiptTemp.exists(),'259 storage receipt temporary must be fresh'
receiptTemp.write_text(json.dumps(receipt,indent=2),encoding='utf-8');os.replace(receiptTemp,receiptPath)

os.environ['KITTYMECH_259_STORAGE_PATH']='.sites-runtime/shader-startup-238/storage259.json'

os.environ['KITTYMECH_259_STORAGE_SHA']=hashlib.sha256(receiptPath.read_bytes()).hexdigest()

out.mkdir(exist_ok=False)

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

owned={};failure=None;child=None

try:

 with (out/'stdout.txt').open('wb') as f:

  query="$p=Get-CimInstance Win32_Process -Filter 'ProcessId=370280';$h=Invoke-RestMethod http://localhost:8799/health;$l=Get-NetTCPConnection -LocalPort 8799 -State Listen;[pscustomobject]@{pid=$p.ProcessId;command=$p.CommandLine;created=$p.CreationDate;listener=@($l.OwningProcess);status=$h.status;rooms=$h.rooms;players=$h.players;tickRate=$h.tickRate}|ConvertTo-Json -Depth 3"

  data=json.loads(subprocess.check_output(['powershell','-NoProfile','-Command',query],cwd=r,creationflags=subprocess.CREATE_NO_WINDOW,timeout=8).decode('utf-8-sig'))

  assert data['pid']==370280 and set(data['listener'])=={370280} and data['command'].endswith('--import tsx server/index.ts --production') and data['status']=='ok' and data['rooms']==0 and data['players']==0 and data['tickRate']==60

  assert creation(370280)==134362153569448006,'227 exact retained server creation identity changed'

  (out/'native-preflight.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')

  child=subprocess.Popen(['node','tools/overhaul-player-controls-259/capture259.mjs'],cwd=r,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)

  assert k.AssignProcessToJobObject(job,int(child._handle))

  print(json.dumps({'nodePID':child.pid,'creationTime':creation(child.pid),'jobObjectKillOnClose':True,'capSeconds':150}),flush=True)

  while child.poll() is None:

   ids=PIDLIST();assert k.QueryInformationJobObject(job,3,C.byref(ids),C.sizeof(ids),None)

   for pid in ids.ids[:ids.count]:

    stamp=creation(pid)

    if stamp is not None:owned.setdefault(str(pid),stamp)

   if time.monotonic()-start>=149:failure='TIMEOUT FIRST_FAILURE; native job object owns all descendants';break

   time.sleep(.25)

finally:

 k.CloseHandle(job)

 if child:

  try:child.wait(timeout=max(.1,150-(time.monotonic()-start)))

  except subprocess.TimeoutExpired:failure=(failure or '')+' child termination not observed'

 # Release retained terminal child handle before checking PID creation identity.

 if child and child.returncode is not None:child._handle.Close()

 after={pid:{'creationBefore':stamp,'creationAfter':creation(int(pid)),'originalIdentityRetired':creation(int(pid))!=stamp} for pid,stamp in owned.items()}

 receipt={'nodePID':child.pid if child else None,'exitCode':child.returncode if child else None,'failure':failure,'elapsedSeconds':time.monotonic()-start,'capSeconds':150,'ownedPIDCreationTimes':owned,'ownedAfter':after,'inclusiveBoundObserved':time.monotonic()-start<=150}

 receipt['finalOriginalIdentitiesRetired']=all(row['originalIdentityRetired'] for row in after.values())

 (out/'process-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt),flush=True)

raise SystemExit(1 if failure or child is None or child.returncode or not receipt['inclusiveBoundObserved'] or not receipt['finalOriginalIdentitiesRetired'] else 0)

