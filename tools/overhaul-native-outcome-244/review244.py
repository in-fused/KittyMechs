from pathlib import Path
import hashlib,json,subprocess,time
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve();start=time.monotonic()
d=json.loads((run/'public242/evidence.json').read_text());p=json.loads((run/'supervisor242/process-receipt.json').read_text());assert d['writer']=='CLOSED'
out=run/'review244';out.mkdir(exist_ok=False)
summary={'writer':'CLOSED','scope':'ACTUAL242 partial player observation; idleJ body oracle failure preserved; no broad gameplay/human lag approval','status':d['status'],'failure':d.get('failure'),'phase':d.get('unfinishedPhase'),'childMs':d['elapsedMs'],'supervisorSeconds':p['elapsedSeconds'],'rootTerminal':'36395_EXIT1_CONSUMED','nodePID':p['nodePID'],'knownOwnedIdentities':len(p['ownedPIDCreationTimes']),'retired':p['finalOriginalIdentitiesRetired'],'cleanup':d['cleanup'],'protectedBeforeAllMatch':all(x['match'] for x in d['protectedBefore']),'protectedAfterAllMatch':all(x['match'] for x in d['protectedAfter']),'errorCount':len(d['errors']),'cases':[{k:x.get(k) for k in ['name','pilot','status','displacement','realizedYawDelta']} for x in d['cases']],'pilots':{},'qualified':False}
for pilot in ['Program242Host','Program242Guest']:
 events=[e for e in d['events'] if e.get('pilot')==pilot];last=next(e for e in reversed(events) if e.get('shader'));shader=last['shader'];role='host' if pilot.endswith('Host') else 'guest';submit=next(e for e in d['events'] if e['label']==role+'-submit');complete=next((e for e in events if e['label']=='canvas-input-admission-complete'),None)
 summary['pilots'][pilot]={'submitWallMs':submit['wallMs'],'deadlineWallMs':submit['deadlineWallMs'],'completeWallMs':complete['wallMs'] if complete else None,'compositeAdmissionMs':complete['wallMs']-submit['wallMs'] if complete else None,'timely':bool(complete and complete['wallMs']<=submit['deadlineWallMs']),'finalShader':{k:shader.get(k) for k in ['epoch','admitted','fatal','queues','capture','draw']},'shaderEvents':[e for e in shader['events'] if e['kind'] in ['actual-program-set','warmup-start','KHR-availability','poll-complete','body-program-not-prepared','first-body-draw','full-draw-start','full-draw-end','211-local-visual-admitted','render-owner-released','error']]}
(out/'actual-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
for folder in [run/'public242',run/'supervisor242']:
 seal=folder/'output-seal.json';assert not seal.exists();rows=[]
 for q in sorted(folder.rglob('*')):
  if q.is_file():
   b=q.read_bytes();rows.append({'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 seal.write_text(json.dumps({'writer':'CLOSED','scope':'ACTUAL242 timelynativebody/canvasboth; W/S only; idleJ bodyoracle failure terminal1; latercasesINCOMPLETE','files':rows},indent=2),encoding='utf-8');print(json.dumps({'output':str(folder),'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'sealSHA256':hashlib.sha256(seal.read_bytes()).hexdigest()}),flush=True)
frames=out/'frames';frames.mkdir();movie=run/'public242/page@5fc19555e232b3165b4a62196638784d.webm';assert movie.exists()
ffmpeg='C:/Users/Taylor/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
result=subprocess.run([ffmpeg,'-v','error','-ss','16','-i',str(movie),'-t','12','-vf','fps=12','-frames:v','144',str(frames/'frame-%03d.png')],capture_output=True,timeout=20);assert result.returncode==0,result.stderr.decode(errors='replace')
paths=sorted(frames.glob('frame-*.png'));assert paths
crop=(340,270,620,540);images=[]
for i,q in enumerate(paths):
 if time.monotonic()-start>50:raise RuntimeError('244 CPU review50s bound')
 im=Image.open(q).convert('RGB').crop(crop).resize((560,540),Image.Resampling.NEAREST);ImageDraw.Draw(im).text((8,8),f'Video sample {16+i/12:.3f}s; 12fps review',fill='white');images.append(im)
images[0].save(out/'host-body-sample.gif',save_all=True,append_images=images[1:],duration=83,loop=0,optimize=False)
sheet=Image.new('RGB',(1120,1080));choices=[0,len(paths)//3,2*len(paths)//3,len(paths)-1]
for j,index in enumerate(choices):sheet.paste(images[index],((j%2)*560,(j//2)*540))
sheet.save(out/'body-contact-sheet.png');Image.open(paths[0]).save(out/'first-full-frame.png')
(out/'decode-receipt.json').write_text(json.dumps({'writer':'CLOSED','sourceMovie':movie.relative_to(r).as_posix(),'ffmpegExit':result.returncode,'requestedSourceIntervalSeconds':[16,28],'samplingFPS':12,'frames':len(paths),'crop':crop,'resize':'2x nearest inspection only','ownerIdentification':'MUST_VERIFY_PROGRAM242HOST_HUD_IN_FULLFRAME','timeMapping':'VIDEO_PRESENTATION_SAMPLES_NOT_EXACT_NODE_WALLCLOCK; requestedfps can aliasgait/cadence','elapsedSeconds':time.monotonic()-start,'scope':'CPU native pixel decoding only; no GPU/browser/gameplay replay or new performance claim'},indent=2),encoding='utf-8')
print(json.dumps({'status':'NATIVE_VIDEO_REVIEW_ARTIFACTS','frames':len(paths),'elapsedSeconds':time.monotonic()-start,'bodyGIF':str(out/'host-body-sample.gif'),'pilotAdmissionMs':{k:v['compositeAdmissionMs'] for k,v in summary['pilots'].items()}}))
