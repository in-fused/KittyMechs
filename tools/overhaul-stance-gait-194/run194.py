import subprocess,sys,time,json,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'tools/overhaul-stance-gait-194';name=sys.argv[1];cap=int(sys.argv[2]);assert name in ('inspect','author','preview','validate') and 1<=cap<=180
command=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(folder/(name+'194.py'))];started=time.monotonic();receipt={'job':name,'command':command,'capSeconds':cap,'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with (folder/(name+'-stdout194.txt')).open('w',encoding='utf8') as log:
 process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);receipt['pid']=process.pid
 try:receipt['exitCode']=process.wait(timeout=cap);receipt['status']='TERMINAL'
 except subprocess.TimeoutExpired:process.kill();receipt['exitCode']=process.wait(timeout=10);receipt['status']='TIMEOUT_OWN_PROCESS_KILLED'
receipt['elapsedSeconds']=time.monotonic()-started;receipt['closedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(folder/(name+'-process194.json')).write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt));sys.exit(0 if receipt['exitCode']==0 else 1)
