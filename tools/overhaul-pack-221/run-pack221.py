import pathlib,subprocess,time,json,hashlib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
seals=[root/'tools/overhaul-native-214/source-seal.json',root/'tools/overhaul-native-wiring-218/source-seal.json']
protected=json.loads((folder/'protected-inputs221.json').read_text())['files']
def verify():
 rows=[]
 for s in seals:
  for r in json.loads(s.read_text())['files']:
   p=root/r['path'];sha=hashlib.sha256(p.read_bytes()).hexdigest();rows.append({'path':r['path'],'expected':r['sha256'],'actual':sha,'match':sha==r['sha256']})
 for r in protected:
  p=root/r['path'];sha=hashlib.sha256(p.read_bytes()).hexdigest();rows.append({'path':r['path'],'expected':r['sha256'],'actual':sha,'match':sha==r['sha256']})
 return rows
before=verify();(folder/'protected-before221.json').write_text(json.dumps(before,indent=2))
if not all(r['match'] for r in before):raise RuntimeError('221_BEFORE_PROTECTION_FAILED')
command=['node',str(folder/'pack221.mjs'),'--root-approved-pack221'];started=time.monotonic();receipt={'command':command,'capSeconds':15,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (folder/'pack221-stdout.txt').open('w',encoding='utf8') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=p.pid;receipt['creationUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(folder/'pack221-live.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
 try:receipt['exitCode']=p.wait(timeout=15);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],creationflags=subprocess.CREATE_NO_WINDOW,stdout=log,stderr=subprocess.STDOUT,timeout=5);receipt['exitCode']=p.wait(timeout=5);receipt['status']='TIMEOUT_OWN_PROCESS_TREE_KILLED'
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();after=verify();(folder/'protected-after221.json').write_text(json.dumps(after,indent=2));receipt['protectedMatch']=all(r['match'] for r in after);(folder/'pack221-process-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
raise SystemExit(0 if receipt['status']=='TERMINAL' and receipt['exitCode']==0 and receipt['protectedMatch'] else 1)
