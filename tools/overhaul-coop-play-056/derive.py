from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).resolve().parents[2];source=r/'.sites-runtime/overhaul-20261010/coop056-public';out=r/'.sites-runtime/overhaul-20261010/coop056-motion';out.mkdir(exist_ok=False)
e=json.loads((source/'evidence.json').read_text(encoding='utf8'));commands=[]
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
with (out/'stdout.txt').open('wb') as f:
 for label,key in [('host','hostVideo'),('guest','guestVideo')]:
  video=Path(e[key]).resolve();assert video.is_relative_to(source.resolve()) and video.is_file()
  for window,seek in [('travel',35),('rescue',105)]:
   cmd=[ffmpeg,'-hide_banner','-loglevel','error','-ss',str(seek),'-i',str(video),'-vf','fps=3,scale=320:-1,tile=6x3','-frames:v','1',str(out/(label+'-'+window+'.png'))];commands.append(cmd)
   p=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,timeout=25,creationflags=subprocess.CREATE_NO_WINDOW);assert p.returncode==0
(out/'derivative-receipt.json').write_text(json.dumps({'commands':commands,'scope':'Each original own video sampled at3fps for18 frames, approximate35s travel/105s rescue windows. Video clocks are not certified event alignment; no retiming or injected frames. Raw originals retained.'},indent=2),encoding='utf8')
print(str(out))
