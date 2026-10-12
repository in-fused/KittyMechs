import subprocess,pathlib,time,json,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];folder=ROOT/'tools/overhaul-feline-animation-261';scratch=ROOT/'.sites-runtime/shader-startup-238/animation261';job=sys.argv[1];assert job in ('author','preview')
cmd=['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(folder/(job+'261.py'))];start=time.monotonic();r={'job':job,'command':cmd,'capInclusiveCleanup':180}
with (scratch/(job+'-stdout261.txt')).open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW);r['pid']=p.pid
 try:r['exitCode']=p.wait(timeout=170);r['status']='TERMINAL'
 except subprocess.TimeoutExpired:p.kill();r['exitCode']=p.wait(timeout=8);r['status']='OWN_PROCESS_KILLED_TIMEOUT'
r['elapsedSeconds']=time.monotonic()-start;(folder/(job+'-process261.json')).write_text(json.dumps(r,indent=2));print(json.dumps(r));sys.exit(0 if r['exitCode']==0 else 1)
