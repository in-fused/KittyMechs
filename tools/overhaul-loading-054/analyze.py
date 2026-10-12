from pathlib import Path
from collections import defaultdict
import json,hashlib
r=Path(__file__).resolve().parents[2]
p=r/'.sites-runtime/overhaul-20261010/loading054-public'
trace=json.loads((p/'startup-trace.json').read_text(encoding='utf8'))
e=json.loads((p/'evidence.json').read_text(encoding='utf8'))
out={'scope':'Instrumented startup evidence only; no uninstrumented FPS or prior-failure causal claim','status':e['status'],'failure':e.get('failure'),'traceFailure':e.get('traceFailure'),'clients':{}}
for label,t in trace.items():
 profile=json.loads((p/t['cpuProfile']).read_text(encoding='utf8'))
 nodes={n['id']:n for n in profile['nodes']};self_us=defaultdict(int)
 for node,dt in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):self_us[node]+=dt
 top=[]
 for node,us in sorted(self_us.items(),key=lambda x:-x[1])[:25]:
  cf=nodes[node]['callFrame'];top.append({'selfSampleMs':round(us/1000,3),'name':cf['functionName'],'url':cf['url'],'line0':cf['lineNumber'],'column0':cf['columnNumber']})
 req={}
 for row in t['network']:
  v=req.setdefault(row['requestId'],{})
  for k in ['url','status','mime','fromDiskCache','fromServiceWorker','encodedDataLength','errorText']:
   if row.get(k) is not None:v[k]=row[k]
  v[row['event']]=row['at']
 # Native opaque URL includes exact selected034 hash. Keep all asset transfers,
 # including requested-but-unfinished ones; never conflate response with parse.
 assets=[v for v in req.values() if '/assets/' in v.get('url','')]
 samples=t['samples'];name='MissionHost' if label=='host' else 'MissionGuest'
 owner_first=visual_first=None
 for s in samples:
  actor=next((a for a in s.get('actors') or [] if a['name']==name),None)
  owner=next((a for a in s.get('owners') or [] if actor and a['actor']==actor['id']),None)
  if owner and owner_first is None:owner_first={'at':s['at'],'owner':owner}
  if (s.get('camera') or {}).get('visualFrameClock',-1)>=0 and visual_first is None:visual_first={'at':s['at'],'camera':s['camera']}
 metric_sets=[{v['name']:v['value'] for v in m['metrics']} for m in t['metrics']]
 delta={k:metric_sets[-1].get(k,0)-metric_sets[0].get(k,0) for k in ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration']}
 out['clients'][label]={'samples':len(samples),'firstSampledOwner':owner_first,'firstSampledVisual':visual_first,'lastSample':samples[-1] if samples else None,'assets':assets,'cpuSelfSamplesMs':round(sum(self_us.values())/1000,3),'cpuTopSelf':top,'metricDeltaSeconds':delta,'observer':t.get('observer')}
dest=p/'analysis.json';assert not dest.exists()
dest.write_text(json.dumps(out,indent=2),encoding='utf8')
print(json.dumps({'status':out['status'],'failure':out['failure'],'clients':{k:{'samples':v['samples'],'ownerAt':v['firstSampledOwner'] and v['firstSampledOwner']['at'],'visualAt':v['firstSampledVisual'] and v['firstSampledVisual']['at'],'unfinishedAssets':[a for a in v['assets'] if 'loadingFinished' not in a],'cpuTopSelf':v['cpuTopSelf'][:8],'metricDeltaSeconds':v['metricDeltaSeconds']} for k,v in out['clients'].items()},'analysisSHA256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
