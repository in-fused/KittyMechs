from pathlib import Path
import json,hashlib,datetime,time,subprocess
r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/overhaul-20261010/runtime-art-motion-028';out.mkdir(exist_ok=False)
e=json.loads((r/'.sites-runtime/overhaul-20261010/runtime-art-player-028/evidence.json').read_text(encoding='utf-8'))
video=Path(e['videos'][0]);before=hashlib.sha256(video.read_bytes()).hexdigest()
exe='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
clock=time.monotonic();start=datetime.datetime.now(datetime.timezone.utc).isoformat();jobs=[];failure=None
for label,filters in [('full','fps=4,scale=320:200,tile=8x15'),('detail','fps=4,crop=480:360:240:180,scale=320:240,tile=8x15')]:
    cmd=[exe,'-nostdin','-threads','1','-filter_threads','1','-ss','14','-i',str(video),'-t','29','-vf',filters,'-frames:v','1',str(out/(label+'.png'))]
    with (out/(label+'-stdout.txt')).open('wb') as f:
        child=subprocess.Popen(cmd,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
        try:code=child.wait(timeout=max(1,30-(time.monotonic()-clock)))
        except subprocess.TimeoutExpired:child.kill();child.wait();code=-1;failure='TIMEOUT; no retry'
    jobs.append({'command':cmd,'pid':child.pid,'exitCode':code})
    if code:failure=failure or 'FIRST_DERIVATION_FAILURE';break
assert hashlib.sha256(video.read_bytes()).hexdigest()==before
receipt={'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'video':str(video),'videoSHA256':before,'jobs':jobs,'failure':failure,'relativeVideoPTSSeconds':[14,43],'samplingFPS':4,'cropMayExcludeActors':True,'clockAlignment':'Relative original video PTS only; not exact native/render-clock alignment or contact certification'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps({'failure':failure,'elapsedSeconds':receipt['elapsedSeconds'],'output':str(out)}));raise SystemExit(1 if failure else 0)
