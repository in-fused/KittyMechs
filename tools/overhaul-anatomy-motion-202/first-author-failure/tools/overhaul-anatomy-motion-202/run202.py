import subprocess,sys,time,json,pathlib,datetime,hashlib
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-anatomy-motion-202';name=sys.argv[1];cap=int(sys.argv[2]);assert name in ('inspect','author','preview','validate') and 1<=cap<=180
command=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(folder/(name+'202.py'))];started=time.monotonic();receipt={'job':name,'command':command,'capSeconds':cap,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (folder/(name+'-stdout202.txt')).open('w',encoding='utf8') as log:
 process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=process.pid
 try:receipt['exitCode']=process.wait(timeout=cap);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:process.kill();receipt['exitCode']=process.wait(timeout=10);receipt['status']='TIMEOUT_OWN_PROCESS_KILLED'
if name=='author' and receipt['exitCode']==0:
 try:
  source=root/'assets/source/overhaul-anatomy-motion-202';records=json.loads((source/'authored-motion-records202.json').read_text());contract=json.loads((source/'export-contract202.json').read_text());profile=json.loads((source/'rig-profile202.json').read_text());paths=[source/'Pounce_Anatomy202.blend',folder/'output/Pounce_Anatomy202.glb'];receipt['outputs']=[{'path':str(p.relative_to(root)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths];receipt['actualRecords']=len(records);receipt['actualBones']=len(profile['bones']);receipt['actualClips']=len(contract['clips']);receipt['actualPrimitives']=contract['primitives']
  if len(records)!=45 or len(profile['bones'])!=61 or len(contract['clips'])!=45 or contract['primitives']>5 or receipt['outputs'][1]['sha256']!=contract['sha256']:raise RuntimeError('202_AUTHOR_OUTPUT_CONTRACT')
 except Exception as exc:receipt['outputFailure']=str(exc);receipt['exitCode']=1
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(folder/(name+'-process202.json')).write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt));sys.exit(0 if receipt['exitCode']==0 else 1)
