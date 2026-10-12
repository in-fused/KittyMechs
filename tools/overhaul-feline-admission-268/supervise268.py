import pathlib,subprocess,time,json,ctypes as C,ctypes.wintypes as W
ROOT=pathlib.Path(__file__).resolve().parents[2];folder=ROOT/'tools/overhaul-feline-admission-268';out=ROOT/'.sites-runtime/shader-startup-238/admission268';start=time.monotonic();k=C.WinDLL('kernel32',use_last_error=True)
class BASIC(C.Structure):_fields_=[('PerProcessUserTimeLimit',C.c_longlong),('PerJobUserTimeLimit',C.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',C.c_size_t),('MaximumWorkingSetSize',C.c_size_t),('ActiveProcessLimit',W.DWORD),('Affinity',C.c_size_t),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class IO(C.Structure):_fields_=[(n,C.c_ulonglong) for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class EXT(C.Structure):_fields_=[('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',C.c_size_t),('JobMemoryLimit',C.c_size_t),('PeakProcessMemoryUsed',C.c_size_t),('PeakJobMemoryUsed',C.c_size_t)]
class PIDLIST(C.Structure):_fields_=[('assigned',W.DWORD),('count',W.DWORD),('ids',C.c_size_t*128)]
k.CreateJobObjectW.argtypes=[C.c_void_p,W.LPCWSTR];k.CreateJobObjectW.restype=W.HANDLE;k.SetInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD];k.AssignProcessToJobObject.argtypes=[W.HANDLE,W.HANDLE];k.QueryInformationJobObject.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD,C.c_void_p];k.CloseHandle.argtypes=[W.HANDLE];k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD];k.OpenProcess.restype=W.HANDLE;k.GetProcessTimes.argtypes=[W.HANDLE,C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME)]
def creation(pid):
 h=k.OpenProcess(0x1000,False,pid)
 if not h:return None
 ts=[W.FILETIME() for _ in range(4)]
 try:return (ts[0].dwHighDateTime<<32)|ts[0].dwLowDateTime if k.GetProcessTimes(h,*[C.byref(x) for x in ts]) else None
 finally:k.CloseHandle(h)
job=k.CreateJobObjectW(None,None);limits=EXT();limits.BasicLimitInformation.LimitFlags=0x2000;assert job and k.SetInformationJobObject(job,9,C.byref(limits),C.sizeof(limits));p=None;failure=None;owned={}
try:
 with (out/'stdout268.txt').open('wb') as log:
  p=subprocess.Popen(['node',str(folder/'decode268.mjs')],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);assert k.AssignProcessToJobObject(job,int(p._handle));print(json.dumps({'nodePID':p.pid,'creationTime':creation(p.pid),'capInclusiveSeconds':60,'nativeJobKillOnClose':True}),flush=True)
  while p.poll() is None:
   ids=PIDLIST();assert k.QueryInformationJobObject(job,3,C.byref(ids),C.sizeof(ids),None)
   for pid in ids.ids[:ids.count]:
    stamp=creation(pid)
    if stamp is not None:owned[str(pid)]=stamp
   if time.monotonic()-start>55:failure='TIMEOUT_FIRST_FAILURE';break
   time.sleep(.2)
except BaseException as e:failure=repr(e)
finally:
 k.CloseHandle(job)
 if p:
  try:p.wait(timeout=max(.1,58-(time.monotonic()-start)))
  except subprocess.TimeoutExpired:failure=(failure or '')+' OWNED_TERMINATION_UNOBSERVED'
  if p.returncode is not None:p._handle.Close()
 after={pid:{'creationBefore':stamp,'creationAfter':creation(int(pid)),'originalIdentityAbsent':creation(int(pid))!=stamp} for pid,stamp in owned.items()};receipt={'writer':'CLOSED','nodePID':p.pid if p else None,'exitCode':p.returncode if p else None,'failure':failure,'elapsedSeconds':time.monotonic()-start,'capInclusiveSeconds':60,'owned':owned,'ownedAfter':after,'allOriginalIdentitiesAbsent':all(v['originalIdentityAbsent'] for v in after.values())};receipt['inclusiveBoundObserved']=receipt['elapsedSeconds']<=60;(folder/'process-receipt268.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
raise SystemExit(0 if p and p.returncode==0 and not failure and receipt['allOriginalIdentitiesAbsent'] and receipt['inclusiveBoundObserved'] else 1)
