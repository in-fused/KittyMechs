"""ONE atomic Job-Object-owned native run; stdlib only, no runtime compiler."""
import time
START=time.perf_counter()
import ctypes as C
from ctypes import wintypes as W
import json
import os
import threading
ROOT=r'C:\Users\Taylor\Documents\GitHub\KittyMech-Web'
OUT=os.path.join(ROOT,'.sites-runtime','overhaul-20261010','overhaul-native-contact-clock-semantics-004')
NODE=r'C:\Program Files\nodejs\node.exe'
CAP=128*1024*1024
RESERVE=32*1024*1024
K=C.WinDLL('kernel32',use_last_error=True)
HANDLE=W.HANDLE
SIZE=C.c_size_t
ULONG64=C.c_ulonglong

class SECURITY(C.Structure):
    _fields_=[('length',W.DWORD),('descriptor',C.c_void_p),('inherit',W.BOOL)]
class STARTUP(C.Structure):
    _fields_=[('cb',W.DWORD),('reserved',W.LPWSTR),('desktop',W.LPWSTR),('title',W.LPWSTR),('x',W.DWORD),('y',W.DWORD),('xs',W.DWORD),('ys',W.DWORD),('xc',W.DWORD),('yc',W.DWORD),('fill',W.DWORD),('flags',W.DWORD),('show',W.WORD),('reserved2Length',W.WORD),('reserved2',C.c_void_p),('stdin',HANDLE),('stdout',HANDLE),('stderr',HANDLE)]
class STARTUP_EX(C.Structure):
    _fields_=[('startup',STARTUP),('attributes',C.c_void_p)]
class PROCESS(C.Structure):
    _fields_=[('process',HANDLE),('thread',HANDLE),('pid',W.DWORD),('tid',W.DWORD)]
class BASIC(C.Structure):
    _fields_=[('processTime',C.c_longlong),('jobTime',C.c_longlong),('flags',W.DWORD),('minWS',SIZE),('maxWS',SIZE),('activeLimit',W.DWORD),('affinity',SIZE),('priority',W.DWORD),('scheduling',W.DWORD)]
class IO(C.Structure):
    _fields_=[(name,ULONG64) for name in ('readOperations','writeOperations','otherOperations','readBytes','writeBytes','otherBytes')]
class EXTENDED(C.Structure):
    _fields_=[('basic',BASIC),('io',IO),('processMemory',SIZE),('jobMemory',SIZE),('peakProcessMemory',SIZE),('peakJobMemory',SIZE)]
class ACCOUNT(C.Structure):
    _fields_=[('user',C.c_longlong),('kernel',C.c_longlong),('periodUser',C.c_longlong),('periodKernel',C.c_longlong),('pageFaults',W.DWORD),('total',W.DWORD),('active',W.DWORD),('terminated',W.DWORD)]

def api(name,restype,args):
    f=getattr(K,name);f.restype=restype;f.argtypes=args;return f
CreateJob=api('CreateJobObjectW',HANDLE,[C.c_void_p,W.LPCWSTR])
SetJob=api('SetInformationJobObject',W.BOOL,[HANDLE,C.c_int,C.c_void_p,W.DWORD])
QueryJob=api('QueryInformationJobObject',W.BOOL,[HANDLE,C.c_int,C.c_void_p,W.DWORD,C.c_void_p])
TerminateJob=api('TerminateJobObject',W.BOOL,[HANDLE,W.UINT])
Close=api('CloseHandle',W.BOOL,[HANDLE])
InitAttributes=api('InitializeProcThreadAttributeList',W.BOOL,[C.c_void_p,W.DWORD,W.DWORD,C.POINTER(SIZE)])
UpdateAttributes=api('UpdateProcThreadAttribute',W.BOOL,[C.c_void_p,W.DWORD,SIZE,C.c_void_p,SIZE,C.c_void_p,C.c_void_p])
DeleteAttributes=api('DeleteProcThreadAttributeList',None,[C.c_void_p])
CreateFile=api('CreateFileW',HANDLE,[W.LPCWSTR,W.DWORD,W.DWORD,C.POINTER(SECURITY),W.DWORD,W.DWORD,HANDLE])
CreateProcess=api('CreateProcessW',W.BOOL,[W.LPCWSTR,W.LPWSTR,C.c_void_p,C.c_void_p,W.BOOL,W.DWORD,C.c_void_p,W.LPCWSTR,C.POINTER(STARTUP_EX),C.POINTER(PROCESS)])
Resume=api('ResumeThread',W.DWORD,[HANDLE])
Wait=api('WaitForSingleObject',W.DWORD,[HANDLE,W.DWORD])
ExitCode=api('GetExitCodeProcess',W.BOOL,[HANDLE,C.POINTER(W.DWORD)])
Times=api('GetProcessTimes',W.BOOL,[HANDLE,C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])
CurrentProcess=api('GetCurrentProcess',HANDLE,[])
TerminateProcess=api('TerminateProcess',W.BOOL,[HANDLE,W.UINT])

def check(ok,name):
    if not ok:raise C.WinError(C.get_last_error(),name)
def account(job):
    a=ACCOUNT();check(QueryJob(job,1,C.byref(a),C.sizeof(a),None),'Query owned accounting');return {k:getattr(a,k) for k,_ in a._fields_}
def pids(job):
    raw=C.create_string_buffer(8+128*C.sizeof(SIZE));check(QueryJob(job,3,raw,C.sizeof(raw),None),'Query complete owned PID list')
    assigned=W.DWORD.from_buffer(raw,0).value;count=W.DWORD.from_buffer(raw,4).value
    if assigned!=count or count>128:raise RuntimeError('Owned PID list overflow STOP')
    return [SIZE.from_buffer(raw,8+i*C.sizeof(SIZE)).value for i in range(count)]

def main():
    if os.name!='nt' or os.path.normcase(os.getcwd())!=os.path.normcase(ROOT):raise RuntimeError('Frozen Windows workspace mismatch')
    # No hashing/source loading or runtime compilation occurs in the outer owner.
    log=None
    lock=threading.Lock();errors=[];timedout=threading.Event();done=threading.Event();observed=set();job=None;pi=PROCESS();attributes=None;input_handle=None;output_handle=None;created=False;resumed=False;tree_zero=False;root_exit=False;exitcode=None
    def row(kind,**data):
        with lock:
            log.write(json.dumps({'kind':kind,'elapsedSeconds':time.perf_counter()-START,**data},allow_nan=False,separators=(',',':'))+'\n');log.flush();os.fsync(log.fileno())
    def killer():
        if not done.wait(max(0,178-(time.perf_counter()-START))):
            timedout.set()
            # Independent of child hashes/module loading/Vitest/native loops and outer file I/O.
            if not TerminateJob(job,124):errors.append('Independent deadline TerminateJob failed: '+str(C.get_last_error()))
            # Hard owner stop at180 even if outer cleanup or durable file I/O stalls.
            # Closing this owner's noninherited job handle also kills all atomic-owned descendants.
            if not done.wait(max(0,180-(time.perf_counter()-START))):TerminateProcess(CurrentProcess(),124)
    try:
        job=CreateJob(None,None);check(job,'Create exclusive job')
        limits=EXTENDED();limits.basic.flags=0x2000 # KILL_ON_JOB_CLOSE; no breakaway flags; handle noninheritable.
        check(SetJob(job,9,C.byref(limits),C.sizeof(limits)),'Set exclusive kill-on-close nonbreakaway job')
        # Timer starts BEFORE CreateProcess, any worker/source hash or native startup.
        watchdog=threading.Thread(target=killer,name='independent-native-deadline',daemon=True);watchdog.start()
        # File startup is also below the already-running independent deadline thread.
        for filename in ('raw.ndjson','watchdog.ndjson','native-stdout.txt'):
            if os.path.exists(os.path.join(OUT,filename)):raise RuntimeError('Single-run output exists STOP')
        log=open(os.path.join(OUT,'watchdog.ndjson'),'x',encoding='utf8')
        sa=SECURITY(C.sizeof(SECURITY),None,True)
        output_handle=CreateFile(os.path.join(OUT,'native-stdout.txt'),0x40000000,3,C.byref(sa),1,0x80,None);check(output_handle!=HANDLE(-1).value,'Create NEW stdout')
        input_handle=CreateFile('NUL',0x80000000,3,C.byref(sa),3,0x80,None);check(input_handle!=HANDLE(-1).value,'Open NUL stdin')
        size=SIZE();InitAttributes(None,2,0,C.byref(size));check(size.value>0,'Query attribute list size')
        attributes=C.create_string_buffer(size.value);check(InitAttributes(attributes,2,0,C.byref(size)),'Initialize extended attributes')
        jobs=(HANDLE*1)(job);inherited=(HANDLE*2)(input_handle,output_handle)
        check(UpdateAttributes(attributes,0,0x0002000D,jobs,C.sizeof(jobs),None,None),'Set atomic PROC_THREAD_ATTRIBUTE_JOB_LIST')
        check(UpdateAttributes(attributes,0,0x00020002,inherited,C.sizeof(inherited),None,None),'Set exclusive inherited stdio handle list')
        si=STARTUP_EX();si.startup.cb=C.sizeof(STARTUP_EX);si.startup.flags=0x100;si.startup.stdin=input_handle;si.startup.stdout=output_handle;si.startup.stderr=output_handle;si.attributes=C.cast(attributes,C.c_void_p)
        command=f'"{NODE}" "{ROOT}\\node_modules\\vitest\\vitest.mjs" run --config "{ROOT}\\tools\\overhaul-native-contact-clock-semantics-004\\vitest.config.ts"'
        row('atomic-owned-child-create-request',command=command,jobFlags=limits.basic.flags,creationFlags=0x08080004,deadlineIncludesOwnedSourceHashesAndNativeStartup=True)
        # JOB_LIST assignment is part of kernel process creation; no unowned suspended-child interval.
        check(CreateProcess(NODE,C.create_unicode_buffer(command),None,None,True,0x08080004,None,ROOT,C.byref(si),C.byref(pi)),'Create atomic job-owned suspended hidden child')
        created=True;observed.add(pi.pid);born=ULONG64();ended=ULONG64();kernel=ULONG64();user=ULONG64();check(Times(pi.process,C.byref(born),C.byref(ended),C.byref(kernel),C.byref(user)),'Read actual child creation identity')
        native_pids=pids(job);observed.update(native_pids);check(pi.pid in native_pids,'Actual root not in atomic job before Resume')
        row('actual-owned-suspended-child',pid=pi.pid,creationFileTime=born.value,jobPids=native_pids,accounting=account(job))
        if timedout.is_set():raise TimeoutError('Deadline before Resume; owned child remains stopped')
        check(Resume(pi.thread)!=0xffffffff,'Resume atomic owned child');resumed=True
        while True:
            owned=pids(job);observed.update(owned);a=account(job);wait=Wait(pi.process,0)
            if wait==0:
                root_exit=True;code=W.DWORD();check(ExitCode(pi.process,C.byref(code)),'Read actual root exit');exitcode=code.value
                if a['active']==0:tree_zero=True;break
            elif wait!=258:raise RuntimeError('Wait owned process error '+str(C.get_last_error()))
            total=sum(entry.stat().st_size for entry in os.scandir(OUT) if entry.is_file())
            if total>=CAP-RESERVE:raise RuntimeError('External artifact normal quota STOP')
            if timedout.is_set():raise TimeoutError('Independent owned-startup/native deadline STOP')
            time.sleep(.01)
    except BaseException as error:
        errors.append(repr(error))
        try:row('FIRST_EXTERNAL_FAILURE_STOP',error=repr(error),nativeCleanup='UNKNOWN' if resumed else 'NO_RESUMED_NATIVE_CHILD')
        except BaseException as write_error:errors.append('raw external failure write: '+repr(write_error))
    finally:
        if job:
            try:
                if account(job)['active']>0:check(TerminateJob(job,125),'Finally terminate actual owned tree')
            except BaseException as error:errors.append('termination: '+repr(error))
        if created:
            try:
                remaining=max(0,min(1000,int((180-(time.perf_counter()-START))*1000)));root_exit=Wait(pi.process,remaining)==0
                if root_exit:code=W.DWORD();check(ExitCode(pi.process,C.byref(code)),'Read final root exit');exitcode=code.value
                else:errors.append('Actual root exit UNOBSERVED')
            except BaseException as error:errors.append('exit: '+repr(error))
        final_account=None
        if job:
            try:final_account=account(job);tree_zero=final_account['active']==0;observed.update(pids(job))
            except BaseException as error:errors.append('tree accounting: '+repr(error))
        if attributes:
            try:DeleteAttributes(attributes)
            except BaseException as error:errors.append('attribute cleanup: '+repr(error))
        for name,handle in [('thread',pi.thread),('process',pi.process),('stdin',input_handle),('stdout',output_handle),('job',job)]:
            if handle and handle!=HANDLE(-1).value:
                try:check(Close(handle),'Close actual '+name)
                except BaseException as error:errors.append(name+' close: '+repr(error))
        wall=time.perf_counter()-START
        if wall>180:errors.append('Actual inclusive wall exceeded180s STOP')
        if created and not tree_zero:errors.append('Owned tree zero UNOBSERVED STOP')
        success=created and resumed and root_exit and tree_zero and exitcode==0 and not timedout.is_set() and not errors
        try:
            if log is not None:row('external-owned-run-closed',actualCreated=created,actualResumed=resumed,rootExitObserved=root_exit,rootExitCode=exitcode,ownedTreeZeroObserved=tree_zero,observedOwnedPids=sorted(observed),finalActualAccounting=final_account,timedOut=timedout.is_set(),errors=errors,completed=success,nativeCleanup='REQUIRES_ACTUAL_NATIVE_RETURN_ROWS' if success else 'UNKNOWN_IF_EXTERNALLY_STOPPED',noRetry=True)
        finally:
            if log is not None:log.close()
            done.set()
    return 0 if success else 1

if __name__=='__main__':os._exit(main())

