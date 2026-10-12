from pathlib import Path
import json,hashlib,statistics,subprocess
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
d=json.loads((run/'public251/evidence.json').read_text());p=json.loads((run/'supervisor251/process-receipt.json').read_text());assert d['writer']=='CLOSED' and p['exitCode']==0
out=run/'review254';out.mkdir(exist_ok=False)
def quant(v):return {'count':len(v),'median':statistics.median(v) if v else None,'p95':sorted(v)[int(.95*(len(v)-1))] if v else None,'max':max(v) if v else None}
summary={'writer':'CLOSED','scope':'ONE actual251 completed public control witnesses; materially changed253 planted ordinary pose; independent temporal quality pending','status':d['status'],'childMs':d['elapsedMs'],'supervisorSeconds':p['elapsedSeconds'],'rootTerminal':'33404_EXIT0_CONSUMED','knownOriginalIdentities':len(p['ownedPIDCreationTimes']),'retired':p['finalOriginalIdentitiesRetired'],'cleanupClosed':all(x['status']=='CLOSED' for x in d['cleanup']),'errorCount':len(d['errors']),'protectedBeforeMatch':all(x['match'] for x in d['protectedBefore']),'protectedAfterMatch':all(x['match'] for x in d['protectedAfter']),'cases':[{k:x.get(k) for k in ['name','pilot','status','displacement','look','steering']} for x in d['cases']],'pilots':{},'qualityApproved':False}
for name in ['Controls251Host','Controls251Guest']:
 ev=[e for e in d['events'] if e.get('pilot')==name];role='host' if name.endswith('Host') else 'guest';submit=next(e for e in d['events'] if e['label']==role+'-submit');complete=next(e for e in ev if e['label']=='canvas-input-admission-complete');seen={};samples=[]
 for e in ev:
  for row in (e.get('native') or {}).get('registry',{}).get('rows',[]):
   dg=row['diagnostic'];g=(dg.get('sourceTasks') or {}).get('grounded250')
   if row['actor']==(e.get('actor') or {}).get('id') and g and dg['frameClock'] not in seen:
    s={'event':e['label'],'wallMs':e['wallMs'],'frameClock':dg['frameClock'],'actor':{k:e['actor'].get(k) for k in ['id','jumpEpoch','position','velocity','yaw','stance','stanceChangedAt']},'ownerCostMs':dg.get('costMs'),'grounded':g,'mainRenderNormal':dg.get('grounded246')};seen[dg['frameClock']]=s;samples.append(s)
 feet=[f for s in samples for f in s['grounded']['feet']];fulfilled=[f for f in feet if f.get('fulfilled')];moving=[s for s in samples if __import__('math').hypot(s['actor']['velocity']['x'],s['actor']['velocity']['z'])>.3];mf=[f for s in moving for f in s['grounded']['feet'] if f.get('fulfilled')]
 last=next(e for e in reversed(ev) if e.get('telemetry'));frames=last['telemetry']['frames'][-300:]
 summary['pilots'][name]={'admissionMs':complete['wallMs']-submit['wallMs'],'timely':complete['wallMs']<=submit['deadlineWallMs'],'uniqueKernelFrames':len(samples),'fulfilledFootSamples':len(fulfilled),'fulfilledMovingFootSamples':len(mf),'sampledStates':dict(__import__('collections').Counter(f.get('finalState',f['state']) for f in feet)),'fulfilledPointResidualMetres':quant([f['samePointError'] for f in fulfilled]),'fulfilledNormalGapMetres':quant([f['normalGap'] for f in fulfilled]),'kernelCostMs':quant([s['grounded']['costMs'] for s in samples]),'ownerCostMs':quant([s['ownerCostMs'] for s in samples if s['ownerCostMs'] is not None]),'last300InstrumentedRAFMixedMs':quant([x['ms'] for x in frames]),'lastHUD':last['performance'],'samples':samples,'limitations':'Foot samples not whole-body contact frames; touch/release/unleased not fulfilled. Last300 RAF is mixed scenario, not matched affected-human or isolated GPU timing. Mainrender observation may precede current read kernel frame; inspect clocks.'}
(out/'actual-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
for folder in [run/'public251',run/'supervisor251']:
 assert not (folder/'output-seal.json').exists();rows=[{'path':q.relative_to(r).as_posix(),'bytes':q.stat().st_size,'sha256':hashlib.sha256(q.read_bytes()).hexdigest()} for q in sorted(folder.rglob('*')) if q.is_file()]
 (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':summary['scope'],'files':rows},indent=2),encoding='utf-8')
ff='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';receipt=[]
for i,movie in enumerate(sorted((run/'public251').glob('*.webm'))):
 frames=out/f'video{i}';frames.mkdir();proc=subprocess.run([ff,'-v','error','-ss','16','-i',str(movie),'-t','48','-vf','fps=4','-frames:v','192',str(frames/'frame-%03d.png')],capture_output=True,timeout=25);assert proc.returncode==0,proc.stderr.decode(errors='replace');paths=sorted(frames.glob('*.png'))
 grid=Image.new('RGB',(1920,3600))
 for j in range(12):
  n=min(len(paths)-1,int(j*(len(paths)-1)/11));im=Image.open(paths[n]).convert('RGB');ImageDraw.Draw(im).text((12,12),f'video{i} {16+n/4:.2f}s;4FPS inspection',fill='white');grid.paste(im,((j%2)*960,(j//2)*600))
 grid.save(out/f'video{i}-full-frame-sheet.png');Image.open(paths[0]).save(out/f'video{i}-identity.png')
 receipt.append({'movie':movie.relative_to(r).as_posix(),'frames':len(paths),'ffmpegExit':0,'identity':'VERIFY_HUD_BEFORE_ATTRIBUTION','time':'video presentation not exact native/wallclock;4FPS mayalias movement'})
(out/'decode-receipt.json').write_text(json.dumps({'writer':'CLOSED','scope':'CPU decoding original actual251 only; no game replay','videos':receipt},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','pilotFacts':{k:{a:v[a] for a in ['admissionMs','uniqueKernelFrames','fulfilledFootSamples','fulfilledMovingFootSamples','fulfilledPointResidualMetres','kernelCostMs','ownerCostMs','last300InstrumentedRAFMixedMs','lastHUD']} for k,v in summary['pilots'].items()}}))
