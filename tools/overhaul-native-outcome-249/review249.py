from pathlib import Path
import json,hashlib,statistics,subprocess
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
d=json.loads((run/'public247/evidence.json').read_text());assert d['writer']=='CLOSED';out=run/'review249';out.mkdir(exist_ok=False)
summary={'writer':'CLOSED','scope':'Actual247 partial R and passive pad/support evidence; original failure preserved, no gameplay quality/contact/lag approval','failure':d.get('failure'),'phase':d.get('unfinishedPhase'),'childMs':d['elapsedMs'],'cases':[{'name':x['name'],'pilot':x.get('pilot'),'status':x['status']} for x in d['cases']],'errors':len(d['errors']),'cleanupClosed':all(x['status']=='CLOSED' for x in d['cleanup']),'protectedBefore':all(x['match'] for x in d['protectedBefore']),'protectedAfter':all(x['match'] for x in d['protectedAfter']),'pilots':{}}
for pilot in ['Controls247Host','Controls247Guest']:
 events=[e for e in d['events'] if e.get('pilot')==pilot];role='host' if pilot.endswith('Host') else 'guest';submit=next(e for e in d['events'] if e['label']==role+'-submit');complete=next(e for e in events if e['label']=='canvas-input-admission-complete')
 observations={}
 for e in events:
  for row in (e.get('native') or {}).get('registry',{}).get('rows',[]):
   o=row['diagnostic'].get('grounded246')
   if row['actor']==(e.get('actor') or {}).get('id') and o and o.get('status')=='OBSERVED_CURRENT_MAIN_RENDER':observations.setdefault(o['frameClock'],{'event':e['label'],'wallMs':e['wallMs'],'observation':o})
 values=list(observations.values());gaps=[f['normalGap'] for v in values for f in v['observation']['feet'] if f.get('sourceLoaded') and f.get('normalGap') is not None];costs=[v['observation'].get('costMs',0) for v in values]
 summary['pilots'][pilot]={'admissionMs':complete['wallMs']-submit['wallMs'],'timely':complete['wallMs']<=submit['deadlineWallMs'],'uniqueObservedFrames':len(values),'observationCostMs':{'median':statistics.median(costs) if costs else None,'max':max(costs) if costs else None},'loadedNormalGapsMetres':{'count':len(gaps),'minimum':min(gaps) if gaps else None,'maximum':max(gaps) if gaps else None,'median':statistics.median(gaps) if gaps else None},'observations':values}
ev=[e for e in d['events'] if e.get('pilot')=='Controls247Host' and e['label'].startswith('movingR-upright')]
if ev:
 pre,last=ev[0],ev[-1];mark=pre['input']['at'];requests={}
 for e in ev:
  for s in e['input']['sent']:
   if s['at']>=mark and s['input'].get('stanceRequest',{}).get('seq',0)>0:requests.setdefault(s['input']['seq'],s)
 summary['movingRFailureOperands']={'preInputAt':mark,'preStanceRequest':pre['input']['input'].get('stanceRequest'),'actualEdges':[e for e in last['input']['controlEvents'] if e['at']>=mark],'positiveRequestsAcrossSavedEvents':list(requests.values()),'positiveRequestsInFinalRead':sum(1 for s in last['input']['sent'] if s['at']>=mark and s['input'].get('stanceRequest',{}).get('seq',0)>0),'postStance':last['actor']['stance'],'postVelocity':last['actor']['velocity'],'postNativeACK':last['actor']['lastInput'],'assessment':'Observe bounded sent-ring retention and sampled event clocks; do not retroactively PASS failed pulse'}
(out/'actual-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
for folder in [run/'public247',run/'supervisor247']:
 assert not (folder/'output-seal.json').exists()
 rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(folder.rglob('*')) if p.is_file()]
 (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':summary['scope'],'files':rows},indent=2),encoding='utf-8')
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
decoded=[]
for i,movie in enumerate(sorted((run/'public247').glob('*.webm'))):
 frames=out/f'video{i}';frames.mkdir();proc=subprocess.run([ff,'-v','error','-ss','16','-i',str(movie),'-t','22','-vf','fps=4','-frames:v','88',str(frames/'frame-%03d.png')],capture_output=True,timeout=20);assert proc.returncode==0,proc.stderr.decode(errors='replace');paths=sorted(frames.glob('*.png'))
 sheet=Image.new('RGB',(1920,2400));chosen=[min(len(paths)-1,j*max(1,len(paths)//8)) for j in range(8)]
 for j,n in enumerate(chosen):
  im=Image.open(paths[n]).convert('RGB');ImageDraw.Draw(im).text((12,12),f'Video{i} sample {16+n/4:.2f}s (4FPS inspection)',fill='white');sheet.paste(im,((j%2)*960,(j//2)*600))
 sheet.save(out/f'video{i}-full-frame-sheet.png');Image.open(paths[0]).save(out/f'video{i}-identity.png')
 decoded.append({'movie':movie.relative_to(r).as_posix(),'frames':len(paths),'ffmpegExit':proc.returncode,'identity':'VERIFY_HUD_IN_FULL_FRAME','time':'video presentation not exact native/wall clock;4FPS can alias motion'})
(out/'decode-receipt.json').write_text(json.dumps({'writer':'CLOSED','scope':'CPU decoding original actual247 only; no new browser/gameplay run','videos':decoded},indent=2),encoding='utf-8')
print(json.dumps({'status':'CLOSED_ACTUAL247_SUMMARY_CPU_REVIEW','failurePhase':summary['phase'],'pilots':{k:{a:v[a] for a in ['admissionMs','uniqueObservedFrames','observationCostMs','loadedNormalGapsMetres']} for k,v in summary['pilots'].items()},'movingRRequestWitnesses':len(summary.get('movingRFailureOperands',{}).get('positiveRequestsAcrossSavedEvents',[]))}))
