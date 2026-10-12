from pathlib import Path
import json,subprocess,hashlib,sys
from PIL import Image,ImageDraw
n=sys.argv[1] if len(sys.argv)>1 else '151';assert n in ['151','153']
r=Path(__file__).resolve().parents[2];out=r/'.sites-runtime/overhaul-20261010'/('playability150-coop-review' if n=='151' else 'playability153-coop-review')
timestamps=[5,60,120,180,220,232] if n=='151' else [5,20,40,60,75,85]
s=json.loads((out/'summary.json').read_text(encoding='utf8'))
ffmpeg=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
assert ffmpeg.is_file()
rows=[]
for pilot,video in s['videos'].items():
 p=Path(video);before=hashlib.sha256(p.read_bytes()).hexdigest();board=Image.new('RGB',(1440,952),'#161c22');draw=ImageDraw.Draw(board)
 for i,at in enumerate(timestamps):
  frame=out/f'{pilot}-{at}s.png';assert not frame.exists()
  subprocess.run([str(ffmpeg),'-v','error','-ss',str(at),'-i',str(p),'-frames:v','1',str(frame)],check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
  image=Image.open(frame).convert('RGB');image.thumbnail((720,450));x=(i%2)*720;y=(i//2)*317
  image.thumbnail((720,293));board.paste(image,(x,y+24));draw.text((x+8,y+6),f'{pilot} / source video {at}s / retrospectively decoded',fill='white')
 boardPath=out/f'{pilot}-board.png';board.save(boardPath);assert hashlib.sha256(p.read_bytes()).hexdigest()==before
 rows.append({'pilot':pilot,'videoSHA256':before,'board':str(boardPath),'timestampsSeconds':timestamps})
(out/'frames-receipt.json').write_text(json.dumps({'scope':'Derived original closed151 videos, no new browser/native/gameplay job; video timestamps do not imply native publication clock.','rows':rows},indent=2),encoding='utf8')
print('Two preserved-video boards extracted; both original video hashes unchanged')
