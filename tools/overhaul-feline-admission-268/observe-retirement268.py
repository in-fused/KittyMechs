"""Read-only observation of EXACT decoder-owned identities; original failure retained."""
import pathlib,json,ctypes as C,ctypes.wintypes as W,datetime
FOLDER=pathlib.Path(__file__).resolve().parent;k=C.WinDLL('kernel32',use_last_error=True)
k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD];k.OpenProcess.restype=W.HANDLE;k.GetProcessTimes.argtypes=[W.HANDLE,C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME)];k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.GetExitCodeProcess.argtypes=[W.HANDLE,C.POINTER(W.DWORD)];k.CloseHandle.argtypes=[W.HANDLE]
source=json.loads((FOLDER/'process-receipt268.json').read_text());rows=[]
for pid,expected in source['owned'].items():
 row={'pid':int(pid),'expectedCreation':expected};h=k.OpenProcess(0x1000|0x100000,False,int(pid))
 if not h:row.update({'openError':C.get_last_error(),'originalAbsent':True,'originalExited':False})
 else:
  try:
   t=[W.FILETIME() for _ in range(4)];assert k.GetProcessTimes(h,*[C.byref(x) for x in t]);actual=(t[0].dwHighDateTime<<32)|t[0].dwLowDateTime;wait=k.WaitForSingleObject(h,0);exitcode=W.DWORD();assert k.GetExitCodeProcess(h,C.byref(exitcode));row.update({'currentCreation':actual,'originalAbsent':actual!=expected,'waitResult':wait,'exitCode':exitcode.value,'originalExited':actual==expected and wait==0 and exitcode.value!=259})
  finally:k.CloseHandle(h)
 rows.append(row)
ok=all((r['originalAbsent'] and r.get('openError',87)==87) or r['originalExited'] for r in rows)
result={'writer':'CLOSED','observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'READ_ONLY_ORIGINAL_OWNED_IDENTITY_OBSERVATION_NO_RETRY_NO_KILL','originalSupervisorExitCode':1,'originalImmediateRetirementFailurePreserved':True,'ownedFinal':rows,'allOwnedOriginalIdentitiesAbsentOrExited':ok,'retirementWithinOriginalDeadlineProven':False,'contactQualified':False}
(FOLDER/'retirement-observation268.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));raise SystemExit(0 if ok else 1)
