from pathlib import Path
import json,hashlib,subprocess
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];b=r/'.sites-runtime/overhaul-20261010';out=b/'playability159-review';out.mkdir(exist_ok=False)
d=json.loads((b/'coop159-public/evidence.json').read_text());p=json.loads((b/'coop159-public-observation/process-receipt.json').read_text())
assert p['inclusiveBoundObserved'] and all(x['match'] for x in p['inputsAfter'])
parity=d['native']['parity'];assert all(all(x[k] for k in ['tickEqual','timeEqual','actorsEqual','worldEqual']) for x in parity)
summary={'status':d['status'],'failure':d['failure'],'unfinishedPhase':d['unfinishedPhase'],'supervisorExit':p['exitCode'],'elapsedSeconds':p['elapsedSeconds'],'allInputsMatch':True,'inputs':len(p['inputsAfter']),'parityPublications':len(parity),'allExactParityEqual':True,'checkpoint':d['checkpoint'],'events':[{'label':x['label'],'phase':x['phase']} for x in d['events']],'tracking':[{'pilot':x['name'],'target':x['target'],'exit':x['exit'],'steps':len(x['steps']),'settlements':len(x['aimSettlements'])} for x in d['tracking']],'exposurePlans':[{'kind':x['kind'],'tick':x['tick'],'goals':x['goals'],'routes':x['routes'],'sourceSight':x['sourceSight'],'plannerMs':x['plannerMs'],'actualArrivalAndLOS':x.get('actualArrivalAndLOS')} for x in d['plannedExposure']],'failedSegment':{k:v for k,v in d['failureReceipt'].items() if k not in ['read','geometry']},'failedReadActor':{k:d['failureReceipt']['read']['actor'][k] for k in ['position','hp','kills','grounded','stance']},'cleanup':d['cleanup'],'resourceInventory':d['resourceInventory'],'videos':{'host':d['hostVideo'],'guest':d['guestVideo']},'scope':'Derived closed159 evidence only, no new gameplay. Complete mission/latejoin/contact/art/humanlag/fullgoal incomplete.'}
(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
ffmpeg=Path('C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');rows=[]
for pilot,video in summary['videos'].items():
 v=Path(video);before=hashlib.sha256(v.read_bytes()).hexdigest();board=Image.new('RGB',(1440,952),'#161c22');draw=ImageDraw.Draw(board)
 for i,at in enumerate([5,60,120,180,220,260]):
  frame=out/f'{pilot}-{at}s.png';subprocess.run([str(ffmpeg),'-v','error','-ss',str(at),'-i',str(v),'-frames:v','1',str(frame)],check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
  im=Image.open(frame).convert('RGB');im.thumbnail((720,293));x=i%2*720;y=i//2*317;board.paste(im,(x,y+24));draw.text((x+8,y+6),f'{pilot} / original video {at}s / retrospective',fill='white')
 board.save(out/f'{pilot}-board.png');assert hashlib.sha256(v.read_bytes()).hexdigest()==before;rows.append({'pilot':pilot,'originalVideoSHA256':before,'originalUnchanged':True})
(out/'frames-receipt.json').write_text(json.dumps(rows,indent=2));print(json.dumps({k:summary[k] for k in ['status','tracking','checkpoint','exposurePlans','failedSegment']},indent=2))
