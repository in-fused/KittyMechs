from pathlib import Path
import json,subprocess,sys,time
r=Path(__file__).resolve().parents[2];clock=time.monotonic()
here=r/'assets/source/overhaul-pounce-gait-058'
for name in ['author-receipt.json','pose-owner-readback.jsonl','Pounce_Gait058.blend','Pounce_Gait058.temporary.glb','gait-verification.json']:
 assert not (here/name).exists(),f'Existing job output {name}; no retry'
def run(cmd,cap):
 child=subprocess.Popen(cmd,cwd=r,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=cap)
 except subprocess.TimeoutExpired:
  subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],timeout=5,creationflags=subprocess.CREATE_NO_WINDOW)
  raise RuntimeError('JOB_TIMEOUT_STOP_NO_RETRY')
 if code:raise RuntimeError(f'FIRST_FAILURE exit{code}; no downstream stage')
run(['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python','assets/source/overhaul-pounce-gait-058/author.py'],120)
receipt=json.loads((here/'author-receipt.json').read_text())
assert receipt['status']=='FIVE_GAIT_CURVES_AUTHORED_EXPORT_ONLY',receipt['status']
run(['python','tools/overhaul-gait-058/graft_verify.py'],min(40,max(1,165-(time.monotonic()-clock))))
