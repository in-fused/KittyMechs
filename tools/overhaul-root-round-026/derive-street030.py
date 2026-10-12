from pathlib import Path
import json,hashlib,datetime,time,subprocess
r=Path(__file__).resolve().parents[2];clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat()
out=r/'.sites-runtime/overhaul-20261010/street-motion-030';out.mkdir(exist_ok=False)
e=json.loads((r/'.sites-runtime/overhaul-20261010/street-player-030/evidence.json').read_text(encoding='utf8'));video=Path(e['videos'][0]);sha=hashlib.sha256(video.read_bytes()).hexdigest()
exe='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
cmd=[exe,'-nostdin','-threads','1','-filter_threads','1','-ss','12','-i',str(video),'-t','70','-vf','fps=1,scale=360:225,tile=7x10','-frames:v','1',str(out/'route.png')]
failure=None
with (out/'stdout.txt').open('wb') as f:
 child=subprocess.Popen(cmd,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=child.wait(timeout=max(1,40-(time.monotonic()-clock)))
 except subprocess.TimeoutExpired:
  code=-1;failure='TIMEOUT; no retry; cleanup unverified'
  try:subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW,timeout=5);child.wait(timeout=2)
  except subprocess.TimeoutExpired:failure+='; parent termination unobserved'
assert hashlib.sha256(video.read_bytes()).hexdigest()==sha
receipt={'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'command':cmd,'pid':child.pid,'exitCode':code,'failure':failure,'videoSHA256':sha,'relativePTSSeconds':[12,82],'samplingFPS':1,'scope':'Original-video relative PTS contact sheet only, no exact native-clock or contact certification'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt));raise SystemExit(code)
