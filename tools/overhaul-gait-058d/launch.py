from pathlib import Path
import json,subprocess,time
r=Path(__file__).resolve().parents[2];clock=time.monotonic();here=r/'assets/source/overhaul-pounce-gait-058d'
for name in ['export-receipt.json','saved-key-readback.json','Pounce_Gait058D.temporary.glb','gait-verification.json']:
 assert not (here/name).exists(),f'Existing output {name}; no retry'
def run(cmd,cap):
 child=subprocess.Popen(cmd,cwd=r,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=cap)
 except subprocess.TimeoutExpired:
  subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],timeout=5,creationflags=subprocess.CREATE_NO_WINDOW)
  raise RuntimeError('JOB_TIMEOUT_STOP_NO_RETRY')
 if code:raise RuntimeError(f'FIRST_FAILURE exit{code}; no downstream stage')
run(['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python','assets/source/overhaul-pounce-gait-058d/export_saved.py'],120)
receipt=json.loads((here/'export-receipt.json').read_text());assert receipt['status']=='SAVED058B_EXPORT_ONLY',receipt['status']
run(['python','tools/overhaul-gait-058d/graft_verify.py'],min(40,max(1,165-(time.monotonic()-clock))))
