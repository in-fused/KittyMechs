from pathlib import Path
import subprocess,json,hashlib,datetime
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];o=r/'.sites-runtime/overhaul-20261010/coop116-public';dest=r/'.sites-runtime/overhaul-20261010/coop116-review';dest.mkdir(exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
rows=[]
for index,v in enumerate(sorted(o.glob('*.webm'))):
 before=sha(v);folder=dest/str(index);folder.mkdir()
 cmd=[ff,'-hide_banner','-loglevel','error','-i',str(v),'-vf','fps=1,scale=480:300','-threads','1',str(folder/'frame-%04d.jpg')]
 p=subprocess.run(cmd,creationflags=subprocess.CREATE_NO_WINDOW,capture_output=True,timeout=25);assert p.returncode==0,p.stderr.decode(errors='replace')
 frames=sorted(folder.glob('frame-*.jpg'));boards=[]
 # One sample per five video seconds; fixed sampling does not select flattering frames.
 selected=frames[::5]
 for start in range(0,len(selected),12):
  board=Image.new('RGB',(1920,960),'#171717');draw=ImageDraw.Draw(board)
  for j,frame in enumerate(selected[start:start+12]):
   x=(j%4)*480;y=(j//4)*320;board.paste(Image.open(frame),(x,y));draw.text((x+5,y+302),f'video {(start+j)*5}s',(255,255,255))
  path=folder/f'board-{start//12+1:02d}.jpg';board.save(path,quality=90);boards.append(path.relative_to(r).as_posix())
 assert sha(v)==before
 rows.append({'rawVideo':v.relative_to(r).as_posix(),'sha256':before,'unchanged':True,'command':cmd,'frames':len(frames),'boards':boards})
assert len(rows)==2
(dest/'receipt.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'videos':rows,'scope':'Own retained videos only; no new gameplay. Video clocks differ from native/presentation clocks; pages unlabelled until evidence identifies mapping.'},indent=2));print(json.dumps(rows))
