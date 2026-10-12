from pathlib import Path
import ctypes as C,ctypes.wintypes as W,json,hashlib,datetime,urllib.request
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;supervisor=r/'.sites-runtime/overhaul-20261011/native228-supervisor';actual=r/'.sites-runtime/overhaul-20261011/native228-public'
s=json.loads((supervisor/'process-receipt.json').read_text());assert s['exitCode']==1 and s['failure'] is None and s['inclusiveBoundObserved']
k=C.WinDLL('kernel32',use_last_error=True);k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD];k.OpenProcess.restype=W.HANDLE;k.CloseHandle.argtypes=[W.HANDLE];k.GetProcessTimes.argtypes=[W.HANDLE,C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME),C.POINTER(W.FILETIME)];k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.WaitForSingleObject.restype=W.DWORD
rows=[]
for pid,expected in s['ownedPIDCreationTimes'].items():
 h=k.OpenProcess(0x101000,False,int(pid));row={'pid':int(pid),'expectedCreation':expected,'originalBirthKnown':expected is not None}
 if not h:row.update(openError=C.get_last_error(),pidAbsentNow=C.get_last_error()==87,retiredNow=C.get_last_error()==87)
 else:
  try:
   ts=[W.FILETIME() for _ in range(4)];assert k.GetProcessTimes(h,*[C.byref(t) for t in ts]);current=(ts[0].dwHighDateTime<<32)|ts[0].dwLowDateTime;wait=k.WaitForSingleObject(h,0)
   row.update(currentCreation=current,waitResult=wait,retiredNow=(expected is not None and current!=expected) or wait==0)
  finally:k.CloseHandle(h)
 rows.append(row)
health=json.load(urllib.request.urlopen('http://localhost:8799/health',timeout=3));health={key:health[key] for key in ['status','rooms','players','tickRate']};assert health=={'status':'ok','rooms':0,'players':0,'tickRate':60}
closure={'writer':'CLOSED','scope':'LATER_NATIVE_PID_RETIREMENT_ONLY_NOT_ORIGINAL_DEADLINE_OR_SUCCESS_WAIVER','observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'originalJobExitCode':1,'originalGuestReadinessFailurePreserved':True,'originalGuestKeysCleanupTimeoutPreserved':True,'originalSupervisorFinalRetirementFalsePreserved':True,'unknownBirthPID375032Preserved':True,'ownedFinal':rows,'allObservedOwnedPIDsRetiredNow':all(x['retiredNow'] for x in rows),'nativeHealthAfter':health,'gameplayQualityAccepted':False}
assert closure['allObservedOwnedPIDsRetiredNow'];(f/'final-native-closure.json').write_text(json.dumps(closure,indent=2),encoding='utf8')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for folder in [actual,supervisor]:
 files=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='output-seal.json']
 (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'FAILED_GUEST20S_NO_MOVEMENT_CASES_UNADMITTED','files':files},indent=2),encoding='utf8');print(json.dumps({'folder':str(folder),'outputSHA256':sha(folder/'output-seal.json'),'count':len(files),'bytes':sum(x['bytes'] for x in files)}))
print(json.dumps({'closureSHA256':sha(f/'final-native-closure.json'),'observedPIDs':len(rows),'unknownOriginalBirth':sum(not x['originalBirthKnown'] for x in rows),'allRetiredNow':True,'nativeHealthAfter':health}))
