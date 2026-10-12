from pathlib import Path
import hashlib,json,math,subprocess
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261010';out=b/'coop165-review';out.mkdir(exist_ok=False)
d=json.loads((b/'coop165-public/evidence.json').read_text());p=json.loads((b/'coop165b-public-observation/process-receipt.json').read_text());assert p['inclusiveBoundObserved'] and all(x['match'] for x in p['inputsAfter'])
parity=d['native']['parity'];assert all(all(x[k] for k in ['tickEqual','timeEqual','actorsEqual','worldEqual']) for x in parity)
f=d['failureReceipt'];a=f['read']['actor'];other=f['rejection']['certificate']['blocker'];sep=math.hypot(other['position']['x']-a['position']['x'],other['position']['z']-a['position']['z'])
summary={'status':d['status'],'failure':d['failure'],'unfinishedPhase':d['unfinishedPhase'],'elapsedSeconds':p['elapsedSeconds'],'childInclusiveMs':d['inclusiveElapsedMs'],'allInputsMatch':True,'inputs':len(p['inputsAfter']),'parityPublications':len(parity),'allExactParityEqual':True,'events':[{'label':x['label'],'phase':x['phase']} for x in d['events']],'failedRoute':{k:v for k,v in f.items() if k not in ['read','geometry']},'savedHostPosition':a['position'],'savedTeammateSeparation':sep,'originalClearancePlusPounceRadius':2.85+1.75,'originalThresholdMinusSeparation':4.6-sep,'numericScope':'Read-only saved position arithmetic; no predicate tolerance change, native collision claim or route admission. Shared actorHullRadius current quadruped Pounce1.75; exact source critic must assess provenance.','cleanup':d['cleanup'],'resourceInventory':d['resourceInventory'],'videos':{'host':d['hostVideo'],'guest':d['guestVideo']},'scope':'ONE165 stopped before first route movement, WEST relay/current origin parked teammate rejection. No checkpoint/combat/down/revive/retry/extraction/win/latejoin acceptance.060 limited retention remains separately qualified.'}
(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8');ff=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');receipts=[]
for pilot,video in summary['videos'].items():
 v=Path(video);before=hashlib.sha256(v.read_bytes()).hexdigest();board=Image.new('RGB',(1440,952),'#161c22');draw=ImageDraw.Draw(board)
 for i,t in enumerate([5,10,15,20,25,30]):
  frame=out/f'{pilot}-{t}s.png';subprocess.run([str(ff),'-v','error','-ss',str(t),'-i',str(v),'-frames:v','1',str(frame)],check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
  im=Image.open(frame).convert('RGB');im.thumbnail((720,293));x=i%2*720;y=i//2*317;board.paste(im,(x,y+24));draw.text((x+8,y+6),f'{pilot} original video {t}s',fill='white')
 board.save(out/f'{pilot}-board.png');assert hashlib.sha256(v.read_bytes()).hexdigest()==before;receipts.append({'pilot':pilot,'originalVideoSHA256':before,'originalUnchanged':True})
(out/'frames-receipt.json').write_text(json.dumps(receipts,indent=2));print(json.dumps({k:summary[k] for k in ['status','elapsedSeconds','parityPublications','savedTeammateSeparation','originalThresholdMinusSeparation']}))
