from pathlib import Path
import subprocess,json
r=Path(__file__).resolve().parents[2]
source=r/'.sites-runtime/overhaul-20261010/player050-candidate';out=r/'.sites-runtime/overhaul-20261010/player050-candidate-motion';out.mkdir(exist_ok=False)
e=json.loads((source/'evidence.json').read_text());videos=list(source.glob('*.webm'));assert len(videos)==1
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';commands=[]
with (out/'stdout.txt').open('wb') as f:
 for name in ['quad-moving-fire','upright-moving-fire']:
  offset=max(0,next(x['at'] for x in e['frames'] if x['stage']==name)/1000-.4)
  cmd=[ffmpeg,'-hide_banner','-loglevel','error','-ss',str(offset),'-i',str(videos[0]),'-vf','fps=12,scale=240:-1,tile=8x6','-frames:v','1',str(out/(name+'-approx.png'))];commands.append(cmd)
  p=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
(out/'derivative-receipt.json').write_text(json.dumps({'commands':commands,'scope':'Actual original candidate video. Seek offsets use first stage browser RAF time minus0.4s; approximate, unsynchronized with recorder, no per-frame contact certificate. Entire original retained.'},indent=2))
