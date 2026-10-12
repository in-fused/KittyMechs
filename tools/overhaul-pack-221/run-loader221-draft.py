"""PREPARED/UNRUN: root approval required; one external30s owned Node/browser cap."""
import pathlib,subprocess,time,json,datetime,hashlib
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent;out=folder/'loader-evidence'
def snapshot():
 cmd="Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,@{n='CreationUTC';e={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress"
 r=subprocess.run(['powershell','-NoProfile','-Command',cmd],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=4)
 if r.returncode:raise RuntimeError('221_PROCESS_INVENTORY_FAILED')
 data=json.loads(r.stdout);return data if isinstance(data,list) else [data]
def verify():
 rows=[]
 for filename in ['pack-source-seal221.json','loader-source-seal221.json']:
  for r in json.loads((folder/filename).read_text())['files']:
   sha=hashlib.sha256((root/r['path']).read_bytes()).hexdigest();rows.append({'path':r['path'],'match':sha==r['sha256'],'expected':r['sha256'],'actual':sha})
 for r in json.loads((folder/'protected-inputs221.json').read_text())['files']:
  sha=hashlib.sha256((root/r['path']).read_bytes()).hexdigest();rows.append({'path':r['path'],'match':sha==r['sha256'],'expected':r['sha256'],'actual':sha})
 return rows
before=verify();out.mkdir(exist_ok=True);(out/'protected-before.json').write_text(json.dumps(before,indent=2))
if not all(r['match'] for r in before):raise RuntimeError('221_LOADER_SOURCE_PROTECTION_FAILED')
if any(r['Name'].lower() in ['msedge.exe','blender.exe'] for r in snapshot()):raise RuntimeError('221_MACHINE_SLOT_NOT_FREE')
command=['node',str(folder/'browser-equivalence221.mjs'),'--root-approved-loader221'];started=time.monotonic();receipt={'command':command,'capSeconds':30,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()};owned={}
with (out/'stdout.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=p.pid;receipt['creationUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'live-process.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
 while p.poll() is None and time.monotonic()-started<30:
  rows=snapshot();parents={p.pid};changed=True
  while changed:
   changed=False
   for r in rows:
    if r['ParentProcessId'] in parents and r['ProcessId'] not in parents:parents.add(r['ProcessId']);changed=True
  for r in rows:
   if r['ProcessId'] in parents and r['ProcessId']!=p.pid:owned[(r['ProcessId'],r['CreationUTC'])]=r
  time.sleep(min(.5,max(0,30-(time.monotonic()-started))))
 if p.poll() is None:
  subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],creationflags=subprocess.CREATE_NO_WINDOW,stdout=log,stderr=subprocess.STDOUT,timeout=5);p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_TREE_KILLED'
 else:receipt['status']='TERMINAL'
 receipt['exitCode']=p.returncode
 # Creation-identity check fences any surviving tracked Edge descendant after
 # timeout/orphaning; never kill a process by name or a recycled PID.
 survivors=[]
 for r in snapshot():
  if (r['ProcessId'],r['CreationUTC']) in owned and r['Name'].lower()=='msedge.exe':
   survivors.append(r);subprocess.run(['taskkill','/PID',str(r['ProcessId']),'/T','/F'],creationflags=subprocess.CREATE_NO_WINDOW,stdout=log,stderr=subprocess.STDOUT,timeout=5)
receipt['ownedDescendants']=list(owned.values());receipt['cleanupSurvivors']=survivors;receipt['remainingOwned']=[r for r in snapshot() if (r['ProcessId'],r['CreationUTC']) in owned];receipt['elapsedSeconds']=time.monotonic()-started;after=verify();(out/'protected-after.json').write_text(json.dumps(after,indent=2));receipt['protectedMatch']=all(r['match'] for r in after);(out/'process-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
raise SystemExit(0 if receipt['status']=='TERMINAL' and receipt['exitCode']==0 and not receipt['remainingOwned'] and receipt['protectedMatch'] else 1)
