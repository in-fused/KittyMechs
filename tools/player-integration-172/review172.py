from pathlib import Path
import json,hashlib,subprocess,statistics
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261010';out=b/'playability172-review';out.mkdir(exist_ok=False)
d=json.loads((b/'playability172-public/evidence.json').read_text());p=json.loads((b/'playability172-public-observation/process-receipt.json').read_text())
assert p['exitCode']==0 and p['inclusiveBoundObserved'] and all(x['match'] for x in p['inputsAfter']) and not d['errors'] and not d.get('cleanupFailure')
rows=[]
for phase in d['phases']:
 ss=[x['sample'] for x in d['samples'] if x['phase']==phase['phase']];owners=[];coord=[];actors=[]
 for s in ss:
  a=next(a for a in s['actors'] if a['name']=='Playable172');actors.append(a)
  o=next((o for o in s['feline']['diagnostics'] if o['actor']==a['id']),{}) if phase['phase'].startswith('on-') else (s.get('contact') or {})
  c=o.get('coordination164') or o.get('sourceCoordination164')
  if c:coord.append(c)
  if o.get('lastOwnerMs') is not None:owners.append(o['lastOwnerMs'])
 fps=[s['performance']['fps'] for s in ss];a,z=actors[0],actors[-1]
 rows.append({'phase':phase['phase'],'samples':len(ss),'fpsMedian':statistics.median(fps),'fpsMin':min(fps),'ownerMsMedian':statistics.median(owners) if owners else None,'ownerMsMax':max(owners) if owners else None,'cameraClear':all(s['camera']['clear'] for s in ss),'distanceXZ':((z['position']['x']-a['position']['x'])**2+(z['position']['z']-a['position']['z'])**2)**.5,'hpFirst':a['hp'],'hpLast':z['hp'],'coordination':coord})
summary={'status':d['status'],'elapsedMs':d['elapsedMs'],'errors':d['errors'],'cleanupFailure':d.get('cleanupFailure'),'samples':len(d['samples']),'inputRows':len(p['inputsAfter']),'allInputsMatch':True,'pauseTickHeld':d['pause']['paused']['tick']==d['pause']['held']['tick'],'teardown':d['teardown']['session']['status'],'unsupportedActionObserved':d['unsupportedAction154']['observed'],'phases':rows,'video':d['video'],'scope':d['scope'],'sharedCamera167':d['sharedCamera167'],'coordination164':d['coordination164']}
(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
ff=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');v=Path(d['video']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(v)
# Public phase screenshots are exact. Video frame offsets use an approximate
# root/child wall origin and are explicitly labelled; original video is retained.
rootstart=__import__('datetime').datetime.fromisoformat(p['startUTC']).timestamp()*1000
for route in ['on','off']:
 chosen=[x for x in d['phases'] if x['phase'] in [route+'-forward',route+'-reverse',route+'-moving-R-up',route+'-moving-R-down']]
 frames=[]
 for phase in chosen:
  for fraction in [.25,.75]:
   t=(phase['began']+(phase['ended']-phase['began'])*fraction-rootstart)/1000-1
   f=out/(phase['phase']+'-'+str(fraction)+'.png');subprocess.run([str(ff),'-v','error','-ss',str(max(0,t)),'-i',str(v),'-frames:v','1',str(f)],check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW);frames.append((f,phase['phase'],t))
 board=Image.new('RGB',(1440,1268),'#161c22');draw=ImageDraw.Draw(board)
 for i,(f,name,t) in enumerate(frames):
  im=Image.open(f).convert('RGB');im.thumbnail((720,293));x=i%2*720;y=i//2*317;board.paste(im,(x,y+24));draw.text((x+8,y+6),f'{name} / approx video {t:.2f}s',fill='white')
 board.save(out/(route+'-board.png'))
assert sha(v)==before
(out/'frames-receipt.json').write_text(json.dumps({'originalVideoSHA256':before,'originalUnchanged':True,'timestampScope':'Approximate video offsets from root wall start minus1s; exact public phase end PNGs and original video control interpretation.'},indent=2),encoding='utf8')
print(json.dumps({**{k:summary[k] for k in ['status','elapsedMs','samples','inputRows','allInputsMatch','pauseTickHeld','teardown']},'phases':[{k:x[k] for k in ['phase','fpsMedian','fpsMin','ownerMsMedian','cameraClear','distanceXZ','hpLast']} for x in rows]},indent=2))
