from pathlib import Path
import json,hashlib,datetime,subprocess,time
r=Path(__file__).resolve().parents[2];clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat();o=r/'.sites-runtime/overhaul-20261010/art-motion-039';o.mkdir(exist_ok=False)
e=json.loads((r/'.sites-runtime/overhaul-20261010/art-player-039/evidence.json').read_text());v=Path(e['videos'][0]);sha=hashlib.sha256(v.read_bytes()).hexdigest()
exe='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
cmd=[exe,'-nostdin','-threads','1','-filter_threads','1','-i',str(v),'-vf','fps=2,scale=480:300,tile=8x8','-frames:v','5',str(o/'video-%02d.png')]
with (o/'stdout.txt').open('wb') as f:
 p=subprocess.Popen(cmd,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 try:code=p.wait(timeout=max(1,40-(time.monotonic()-clock)))
 except subprocess.TimeoutExpired:
  subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=f,stderr=subprocess.STDOUT,timeout=5);p.wait(timeout=2);code=-1
assert hashlib.sha256(v.read_bytes()).hexdigest()==sha
j={'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'exitCode':code,'videoSHA256':sha,'command':cmd,'scope':'Original-video relative PTS two samples/second,64samples/board; no exact native clock or contact certification','boards':[p.name for p in sorted(o.glob('video-*.png'))]}
(o/'receipt.json').write_text(json.dumps(j,indent=2));print(json.dumps(j));raise SystemExit(code)
