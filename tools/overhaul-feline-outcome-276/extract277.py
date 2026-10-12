from pathlib import Path
import subprocess,json,time
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';out=run/'review276';out.mkdir(exist_ok=False)
e=json.loads((run/'public277/evidence.json').read_text(encoding='utf-8'))
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
rows=[]
for name,key in [('host','hostVideo'),('guest','guestVideo')]:
    source=Path(e[key]);target=out/(name+'-sample32s277.png');began=time.monotonic()
    p=subprocess.run([ff,'-hide_banner','-loglevel','error','-ss','32','-i',str(source),'-t','2','-vf','fps=6,crop=720:360:120:200,scale=480:240,tile=3x4','-frames:v','1',str(target)],capture_output=True,timeout=15)
    rows.append({'source':str(source),'output':target.relative_to(r).as_posix(),'exitCode':p.returncode,'seconds':time.monotonic()-began,'stderr':p.stderr.decode('utf-8',errors='replace'),'scope':'Chronological full-video 32s/2s excerpt sampled6Hz and cropped; no synchronized native frame or cadence/force certificate'})
    if p.returncode:break
(out/'extraction277.json').write_text(json.dumps({'writer':'CLOSED','rows':rows},indent=2),encoding='utf-8')
print(json.dumps(rows))
