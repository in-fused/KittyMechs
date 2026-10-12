from pathlib import Path
import json,hashlib,subprocess,statistics
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261010';out=b/'playability158-review';out.mkdir(exist_ok=False)
d=json.loads((b/'playability158-public/evidence.json').read_text());p=json.loads((b/'playability158-public-observation/process-receipt.json').read_text())
assert p['exitCode']==0 and p['inclusiveBoundObserved'] and all(x['match'] for x in p['inputsAfter'])
rows=[]
for phase in d['phases']:
 ss=[x['sample'] for x in d['samples'] if x['phase']==phase['phase']];owners=[];coord=[]
 for s in ss:
  a=next(a for a in s['actors'] if a['name']=='Playable158')
  o=next((o for o in s['feline']['diagnostics'] if o['actor']==a['id']),{}) if phase['phase'].startswith('on-') else (s.get('contact') or {})
  c=o.get('coordination155') or o.get('sourceCoordination155')
  if c:coord.append(c)
  if o.get('lastOwnerMs') is not None:owners.append(o['lastOwnerMs'])
 fps=[s['performance']['fps'] for s in ss]
 rows.append({'phase':phase['phase'],'samples':len(ss),'fpsMedian':statistics.median(fps),'fpsMin':min(fps),'ownerMsMedian':statistics.median(owners) if owners else None,'ownerMsMax':max(owners) if owners else None,'cameraClear':all(s['camera']['clear'] for s in ss),'coordination':coord})
summary={'status':d['status'],'elapsedMs':d['elapsedMs'],'errors':d['errors'],'cleanupFailure':d.get('cleanupFailure'),'samples':len(d['samples']),'inputRows':len(p['inputsAfter']),'allInputsMatch':True,'pauseTickHeld':d['pause']['paused']['tick']==d['pause']['held']['tick'],'teardown':d['teardown']['session']['status'],'unsupportedActionObserved':d['unsupportedAction154']['observed'],'phases':rows,'video':d['video'],'scope':d['scope']}
(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
ff=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');v=Path(d['video']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(v)
for label,times in [('on',[10,11,12,13,16,20,21,22]),('off',[33,34,35,36,39,43,44,45])]:
 board=Image.new('RGB',(1440,1268),'#161c22');draw=ImageDraw.Draw(board)
 for i,t in enumerate(times):
  frame=out/f'{label}-{t}s.png';subprocess.run([str(ff),'-v','error','-ss',str(t),'-i',str(v),'-frames:v','1',str(frame)],check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
  im=Image.open(frame).convert('RGB');im.thumbnail((720,293));x=i%2*720;y=i//2*317;board.paste(im,(x,y+24));draw.text((x+8,y+6),f'{label} / original video {t}s',fill='white')
 board.save(out/f'{label}-board.png')
assert sha(v)==before
(out/'frames-receipt.json').write_text(json.dumps({'originalVideoSHA256':before,'originalUnchanged':True},indent=2))
print(json.dumps({**{k:summary[k] for k in ['status','elapsedMs','samples','inputRows','allInputsMatch','pauseTickHeld','teardown']},'phases':[{k:x[k] for k in ['phase','fpsMedian','fpsMin','ownerMsMedian','ownerMsMax','cameraClear']} for x in rows]},indent=2))
