from pathlib import Path
import subprocess,json
r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/overhaul-20261010/experience057-motion';out.mkdir(exist_ok=False);commands=[]
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
with (out/'stdout.txt').open('wb') as f:
 for label in ['baseline','candidate']:
  source=r/f'.sites-runtime/overhaul-20261010/experience057-{label}';e=json.loads((source/'evidence.json').read_text(encoding='utf8'));video=Path(e['video']).resolve();assert video.is_relative_to(source.resolve()) and video.is_file()
  cmd=[ffmpeg,'-hide_banner','-loglevel','error','-i',str(video),'-vf','fps=1,scale=240:-1,tile=8x5','-frames:v','1',str(out/(label+'.png'))];commands.append(cmd)
  p=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,timeout=25,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
(out/'receipt.json').write_text(json.dumps({'commands':commands,'scope':'Each original single own video sampled1fps fromvideo0; forty panels maximum includingstartup. Video/nativewall alignmentnotcertified, no retiming/injection. Raworiginalsretained.'},indent=2),encoding='utf8');print(str(out))
