from pathlib import Path
import json, hashlib, subprocess, statistics
from PIL import Image, ImageDraw
r=Path(__file__).resolve().parents[2]
base=r/'.sites-runtime/overhaul-20261010'
out=base/'playability154-review';out.mkdir(exist_ok=False)
d=json.loads((base/'playability154-public/evidence.json').read_text())
receipt=json.loads((base/'playability154-public-observation/process-receipt.json').read_text())
assert receipt['exitCode']==0 and all(x['match'] for x in receipt['inputsAfter'])
assert not d['errors'] and not d.get('cleanupFailure') and not d.get('videoPathFailure')
summary={'status':d['status'],'receipt':d['receipt'],'inputs':len(receipt['inputsAfter']),'allInputsMatch':True,'video':d['video'],'unsupportedAction':d['unsupportedAction154'],'teardownStatus':d['teardown']['session']['status'],'phases':[],'scope':'Derived review only; no new gameplay job. No contact qualification or affected-client lag proof.'}
for p in d['phases']:
 s=[x['sample'] for x in d['samples'] if x['phase']==p['phase']]
 fps=[x['performance']['fps'] for x in s]
 summary['phases'].append({'phase':p['phase'],'stance':p['nativeStance'],'samples':len(s),'fpsMin':min(fps),'fpsMedian':statistics.median(fps),'nativeTickFirst':s[0]['tick'],'nativeTickLast':s[-1]['tick']})
(out/'summary.json').write_text(json.dumps(summary,indent=2))
ffmpeg=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
video=Path(d['video']);before=hashlib.sha256(video.read_bytes()).hexdigest()
# Decode regular temporal samples, preserving the source video and actual phase screenshots.
subprocess.run([str(ffmpeg),'-v','error','-i',str(video),'-vf','fps=6,scale=720:450','-start_number','0',str(out/'temporal-%04d.png')],check=True,timeout=30,creationflags=subprocess.CREATE_NO_WINDOW)
frames=sorted(out.glob('temporal-*.png'))
for page in range((len(frames)+17)//18):
 board=Image.new('RGB',(2160,2916),'#111820');draw=ImageDraw.Draw(board)
 for j,p in enumerate(frames[page*18:(page+1)*18]):
  i=page*18+j;x=j%3*720;y=j//3*486
  board.paste(Image.open(p).convert('RGB'),(x,y+30));draw.text((x+8,y+8),f'Original video {i/6:.3f}s',fill='white')
 board.save(out/f'temporal-board-{page:02d}.jpg',quality=90)
assert hashlib.sha256(video.read_bytes()).hexdigest()==before
(out/'frames-receipt.json').write_text(json.dumps({'videoSHA256':before,'originalUnchanged':True,'decodedFrames':len(frames),'sampleRate':6,'boards':(len(frames)+17)//18},indent=2))
print(json.dumps(summary,indent=2))
