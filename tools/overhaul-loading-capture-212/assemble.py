from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-212'
s=(r/'tools/overhaul-codec-210/supervise.py').read_text(encoding='utf-8')
s=s.replace("codec210-supervisor","loading212-supervisor").replace("tools/overhaul-codec-210/run.mjs","tools/overhaul-loading-capture-212/capture.mjs").replace("'capSeconds':30","'capSeconds':90").replace('>=29','>=89').replace('30-(time.monotonic()-start)','90-(time.monotonic()-start)').replace("'inclusiveBoundObserved':time.monotonic()-start<=30","'inclusiveBoundObserved':time.monotonic()-start<=90")
s=s.replace("after={pid:","# Release retained terminal child handle before checking PID creation identity.\n if child and child.returncode is not None:child._handle.Close()\n after={pid:")
s=s.replace('import ctypes as C,ctypes.wintypes as W,subprocess,time,json,hashlib','import ctypes as C,ctypes.wintypes as W,subprocess,time,json,hashlib,os')
s=s.replace("r=Path(__file__).resolve().parents[2];out=", "assert os.environ.get('KITTYMECH_212_ACTUAL_APPROVED')=='1','212 root actual gate absent; STATIC ONLY'\nr=Path(__file__).resolve().parents[2];out=")
preflight='''  query="$p=Get-CimInstance Win32_Process -Filter 'ProcessId=370280';$h=Invoke-RestMethod http://localhost:8799/health;$l=Get-NetTCPConnection -LocalPort 8799 -State Listen;[pscustomobject]@{pid=$p.ProcessId;command=$p.CommandLine;created=$p.CreationDate;listener=@($l.OwningProcess);status=$h.status;rooms=$h.rooms;players=$h.players;tickRate=$h.tickRate}|ConvertTo-Json -Depth 3"
  data=json.loads(subprocess.check_output(['powershell','-NoProfile','-Command',query],cwd=r,creationflags=subprocess.CREATE_NO_WINDOW,timeout=8).decode('utf-8-sig'))
  assert data['pid']==370280 and set(data['listener'])=={370280} and data['command'].endswith('--import tsx server/index.ts --production') and data['status']=='ok' and data['rooms']==0 and data['players']==0 and data['tickRate']==60
  (out/'native-preflight.json').write_text(json.dumps(data,indent=2)+'\\n',encoding='utf-8')
'''
s=s.replace("  child=subprocess.Popen",preflight+"  child=subprocess.Popen")
s=s.replace('raise SystemExit(1 if failure or child.returncode else 0)','raise SystemExit(1 if failure or child is None or child.returncode else 0)')
(p/'supervise.py').write_text(s,encoding='utf-8')
