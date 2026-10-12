from pathlib import Path
import subprocess,json,hashlib,time
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];o=r/'.sites-runtime/overhaul-20261010/coop075-public';e=json.loads((o/'evidence.json').read_text());dest=o/'review-frames';dest.mkdir(exist_ok=False);started=time.monotonic();boards=[];sources=[]
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
for label,field in [('host','hostVideo'),('guest','guestVideo')]:
 v=Path(e[field]);digest=hashlib.sha256(v.read_bytes()).hexdigest();sources.append({'path':str(v),'sha256':digest})
 for phase,at,length in [('travel',35,6),('combat',175,6),('checkpoint',298,16),('failure',374,8)]:
  cmd=[ff,'-hide_banner','-loglevel','error','-ss',str(at),'-i',str(v),'-t',str(length),'-vf','fps=3,scale=480:300','-threads','1',str(dest/f'{label}-{phase}-%04d.jpg')]
  p=subprocess.run(cmd,creationflags=subprocess.CREATE_NO_WINDOW,capture_output=True,timeout=max(.1,min(5,35-(time.monotonic()-started))));assert p.returncode==0,p.stderr.decode(errors='replace')
  frames=sorted(dest.glob(f'{label}-{phase}-*.jpg'));assert frames,'No actualvideo frames in selected window'
  for begin in range(0,len(frames),24):
   board=Image.new('RGB',(2880,1280),'#171717');draw=ImageDraw.Draw(board)
   for j,frame in enumerate(frames[begin:begin+24]):
    x=(j%6)*480;y=(j//6)*320;board.paste(Image.open(frame),(x,y));draw.text((x+4,y+302),f'{label} {phase}: video {at+(begin+j)/3:.2f}s',(255,255,255))
   path=dest/f'{label}-{phase}-board-{begin//24+1}.jpg';board.save(path,quality=90);boards.append(path.relative_to(r).as_posix())
 assert hashlib.sha256(v.read_bytes()).hexdigest()==digest
assert time.monotonic()-started<35
(dest/'receipt.json').write_text(json.dumps({'sources':sources,'sourceUnchanged':True,'boards':boards,'elapsedSeconds':time.monotonic()-started,'scope':'Sparse actual own-video derivatives; video clock windows approximately chosen, not certified native event clock. No additional gameplay job.'},indent=2));print(json.dumps({'boards':boards}))
