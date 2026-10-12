from pathlib import Path
import subprocess,json,hashlib,datetime
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];o=r/'.sites-runtime/overhaul-20261010/anatomy125-public';e=json.loads((o/'evidence.json').read_text());v=Path(e['video']);before=hashlib.sha256(v.read_bytes()).hexdigest();dest=o/'review-frames';dest.mkdir(exist_ok=False)
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
cmd=[ff,'-hide_banner','-loglevel','error','-i',str(v),'-vf','fps=6,scale=480:300','-threads','1',str(dest/'frame-%04d.jpg')]
p=subprocess.run(cmd,creationflags=subprocess.CREATE_NO_WINDOW,capture_output=True,timeout=25);assert p.returncode==0,p.stderr.decode(errors='replace')
frames=sorted(dest.glob('frame-*.jpg'));boards=[]
for start in range(0,len(frames),36):
 board=Image.new('RGB',(2880,1920),'#171717');draw=ImageDraw.Draw(board)
 for j,frame in enumerate(frames[start:start+36]):
  x=(j%6)*480;y=(j//6)*320;board.paste(Image.open(frame),(x,y));draw.text((x+5,y+302),f'video {(start+j)/6:.3f}s',(255,255,255))
 path=dest/f'board-{start//36+1:02d}.jpg';board.save(path,quality=90);boards.append(path.relative_to(r).as_posix())
assert hashlib.sha256(v.read_bytes()).hexdigest()==before
(dest/'receipt.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'sourceSHA256':before,'sourceUnchanged':True,'frameRate':6,'frames':len(frames),'boards':boards,'scope':'Own savedvideo review; no new gameplay job. Video clock differs from native/presentation clocks.'},indent=2));print(json.dumps({'frames':len(frames),'boards':boards}))
