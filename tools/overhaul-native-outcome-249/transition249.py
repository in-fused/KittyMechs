from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';assert run.is_junction();out=run/'review249';frames=out/'transition-host';frames.mkdir(exist_ok=False)
movie=run/'public247/page@cfba49498cdf77c9e115a39b1fdecbb0.webm'
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
p=subprocess.run([ff,'-v','error','-ss','20','-i',str(movie),'-t','3','-vf','fps=12','-frames:v','36',str(frames/'frame-%03d.png')],capture_output=True,timeout=20);assert p.returncode==0,p.stderr.decode(errors='replace')
paths=sorted(frames.glob('*.png'));assert len(paths)==36
sheet=Image.new('RGB',(1680,1440))
for i,q in enumerate(paths):
 im=Image.open(q).convert('RGB').crop((370,280,580,520));ImageDraw.Draw(im).text((5,5),f'{20+i/12:.3f}s',fill='white');sheet.paste(im,((i%8)*210,(i//8)*240))
sheet.save(out/'host-first-R-ordered36.png')
(out/'transition-decode-receipt.json').write_text(json.dumps({'writer':'CLOSED','sourceMovie':movie.relative_to(r).as_posix(),'ffmpegExit':0,'frames':36,'sampleFPS':12,'intervalSeconds':[20,23],'nativeCrop':[370,280,580,520],'identity':'Root verified originalvideo0 HUD Controls247Host','limitations':'Native pixels sampled from recorded video, not exact Node/native clocks; 12FPS can alias movement. No new gameplay or pose modification.'},indent=2),encoding='utf-8')
print('36 originalhost transition samples CLOSED; no replay')
