from pathlib import Path
import json,hashlib,ctypes,ctypes.wintypes as w,datetime
r=Path(__file__).resolve().parents[2];base=r/'.sites-runtime/overhaul-20261010';prep=base/'coop204-supervisor-preparation';out=base/'coop204-supervisor';public=base/'coop204-public'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
e=read(public/'evidence.json');s=read(out/'process-receipt.json');p=read(prep/'wrapper-receipt.json');h=read(prep/'health-after-expiry.json')
k=ctypes.WinDLL('kernel32',use_last_error=True);k.OpenProcess.restype=w.HANDLE;k.OpenProcess.argtypes=[w.DWORD,w.BOOL,w.DWORD];k.CloseHandle.argtypes=[w.HANDLE];k.GetProcessTimes.argtypes=[w.HANDLE,ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME),ctypes.POINTER(w.FILETIME)]
def created(pid):
 handle=k.OpenProcess(0x1000,False,pid)
 if not handle:return None
 a,b,c,d=w.FILETIME(),w.FILETIME(),w.FILETIME(),w.FILETIME();ok=k.GetProcessTimes(handle,ctypes.byref(a),ctypes.byref(b),ctypes.byref(c),ctypes.byref(d));k.CloseHandle(handle);return ((a.dwHighDateTime<<32)|a.dwLowDateTime) if ok else None
identities=[{'pid':q['pid'],'name':q['name'],'expectedCreationFiletime':q['creationFiletime'],'currentCreationFiletime':created(q['pid'])} for q in p['owned']]
for q in identities:q['sameIdentityStillPresent']=q['currentCreationFiletime'] is not None and q['currentCreationFiletime']==q['expectedCreationFiletime']
assert not any(q['sameIdentityStillPresent'] for q in identities),'Owned process identity still present'
assert p['protectedMatch'] and all(x['match'] for x in s['inputsAfter']);assert h['rooms']==0 and h['players']==0 and h['status']=='ok'
summary={'writer':'CLOSED','status':'FIRST_GENUINE_FAILURE_STOP','actualGate':'ONE207 root-authorized204; no replay/repair','sourceSealSHA256':'3c1ea6da4f0a0ccab25f3c161106bfa5dace464c710b21355aa6e1d414a48cbd','buildReceiptSHA256':e['buildReceipt'],
 'process':{'execSession':68841,'wrapperPID':p['wrapperPID'],'supervisorPID':p['supervisorPID'],'nodePID':s['pid'],'browserRoots':[366804,372464],'supervisorElapsedSeconds':s['elapsedSeconds'],'wrapperElapsedSeconds':p['elapsedSeconds'],'exitCode':s['exitCode'],'supervisorFailure':s['failure'],'inclusive480Observed':s['inclusiveBoundObserved']},
 'failure':{'phase':e['unfinishedPhase'],'kind':e['failureKind'],'exact':e['failure'],'workElapsedMs':e['elapsedMs'],'captureInclusiveElapsedMs':e['inclusiveElapsedMs'],'observedGuestPixels':'Preparing your mech;35%;Sentinel_Scout.glb?rev=feline-upright-11','interpretation':'Native two-player admission observed; visual ordinary-readiness timed out before movement. No controller/native movement defect established.'},
 'observed':{'parityCount':len(e['native']['parity']),'allCommonPublicationsExact':all(all(x.get(k) is True for k in ['tickEqual','timeEqual','actorsEqual','worldEqual']) for x in e['native']['parity']),'waypoints':len(e['waypoints']),'turns':0,'movementPulses':0,'encounters':len(e.get('encounters201',[])),'lifecycle':e['lifecycle'],'browserErrors':e['errors'],'partialFailureErrors':[x for x in e['partialFailureObservations'] if 'error' in x]},
 'cleanup':{'captureActions':e['cleanup'],'resourceInventory':e['resourceInventory'],'wrapperExtraCleanup':p['cleanup'],'postTerminalIdentityChecks':identities,'currentHealth':{'status':h['status'],'rooms':h['rooms'],'players':h['players'],'tickRate':h['tickRate']},'metadataLimitation':'Wrapper creation-time-only check incorrectly retained exited supervisor Popen handle as live, taskkill returned128/process not found. Later active process identity check confirms all owned identities gone. Numeric372532 reused by unrelated MidiSrv; not touched.'},
 'preservation':{'sourceAndFrozenRows':len(p['inputsAfter']),'allAfterMatch':p['protectedMatch'],'preBrowserFailure':'First wrapper omitted existing server HTML meta injection; exact HTTP operands/first wrapper preserved. Correction used only exact existing injection. No browser allocated in that preflight.'},
 'limitations':['No204 public movement yaw/edges/held-send/ACK/rest/command-region checks reached.','Prospective ray motor tube and actual-current observed-segment convergence remain distinct; this run supplies no movement proof.','Checkpoint,combat,organicdown,publicrevive,genuinesquadfailure,publicretry,attempt+1,objectives,bothalive3Dextraction,winner and latejoin are UNREACHED.','Guest screenshot exceeded its1000ms capture bound; final image exists but the error remains recorded.','Screenshot FPS values are transient diagnostics, not a performance comparison or affected-human lag reproduction.'],'fullGoal':'INCOMPLETE'}
(out/'actual-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf8')
def row(q):
 b=q.read_bytes();return {'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[q for d in [public,out,prep] for q in d.rglob('*') if q.is_file() and q.name!='actual-output-seal.json']
paths += [Path(__file__).resolve(),r/'tools/player-integration-207/run-coop204.py']
seal=out/'actual-output-seal.json';seal.write_text(json.dumps({'writer':'CLOSED','files':[row(q) for q in sorted(paths)]},indent=2)+'\n',encoding='utf8')
print(json.dumps({'status':summary['status'],'summary':row(out/'actual-summary.json'),'outputSeal':row(seal),'allOwnedIdentitiesGone':True,'currentHealth':summary['cleanup']['currentHealth']}))
