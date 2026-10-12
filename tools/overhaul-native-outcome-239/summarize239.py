from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238';d=json.loads((run/'public/evidence.json').read_text());p=json.loads((run/'supervisor/process-receipt.json').read_text())
last=next(e for e in reversed(d['events']) if e.get('shader'))
events=last['shader']['events'];interesting=[e for e in events if e['kind'] in ['warmup-start','KHR-availability','prepare-start','prepare-end','stale-signature','poll-complete','full-draw-start','full-draw-end','first-body-draw','211-local-visual-admitted','render-owner-released','error']]
summary={'writer':'CLOSED','scope':'ACTUAL238 firstbrowser of234 rejected; no20swaiver or replay; precise changing signature field UNKNOWN','status':d['status'],'failure':d.get('failure'),'phase':d.get('unfinishedPhase'),'childMs':d['elapsedMs'],'supervisorSeconds':p['elapsedSeconds'],'rootTerminal':'23556_EXIT1_CONSUMED','nodePID':p['nodePID'],'ownedIdentities':len(p['ownedPIDCreationTimes']),'retired':p['finalOriginalIdentitiesRetired'],'cleanup':d['cleanup'],'protectedBeforeAllMatch':all(x['match'] for x in d['protectedBefore']),'protectedAfterAllMatch':all(x['match'] for x in d['protectedAfter']),'cases':d['cases'],'errorCount':len(d['errors']),'firstError':d['errors'][0] if d['errors'] else None,'hostSubmit':next((e for e in d['events'] if e['label']=='host-submit'),None),'guestSubmit':next((e for e in d['events'] if e['label']=='guest-submit'),None),'shaderFinal':{k:v for k,v in last['shader'].items() if k!='events'},'shaderEvents':interesting,'canvasEvents':[e for e in d['events'] if e['label'].startswith('canvas-input-admission')],'drawObserved':any(e['kind']=='first-body-draw' for e in events),'qualified':False}
f=Path(__file__).resolve().parent;out=f/'actual-summary.json';assert not out.exists();out.write_text(json.dumps(summary,indent=2),encoding='utf-8')
for folder in [run/'public',run/'supervisor']:
 seal=folder/'output-seal.json';assert not seal.exists();rows=[]
 for q in sorted(folder.rglob('*')):
  if q.is_file():
   b=q.read_bytes();rows.append({'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 seal.write_text(json.dumps({'writer':'CLOSED','scope':'ACTUAL238 failure before hostbodydraw; fullcleanupretired; allunreached gameplayINCOMPLETE','files':rows},indent=2),encoding='utf-8')
 print(json.dumps({'output':str(folder),'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'sealSHA256':hashlib.sha256(seal.read_bytes()).hexdigest()}))
print(json.dumps({k:summary[k] for k in ['phase','childMs','supervisorSeconds','retired','protectedBeforeAllMatch','protectedAfterAllMatch','errorCount','drawObserved']}))
