from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];run=r/'.sites-runtime/shader-startup-238'
e=json.loads((run/'public277/evidence.json').read_text(encoding='utf-8'));rows=[]
observations=[]
for event in e['events']:
    for page in ['host','guest']:observations.append((page,event['label'],event[page]))
for f in e['partialFailureObservations']:
    if 'receipt' in f:observations.append((f['page'],'failure-read',f['receipt']))
for page,label,s in observations:
    owner=[{'actor':row['actor'],**{k:row['diagnostic'].get(k) for k in ['mode','status','frameClock','costMs','maxCostMs','browserClipContract','firstFailure','fatal']}} for row in s.get('native',{}).get('registry',{}).get('rows',[])]
    rows.append({'page':page,'label':label,'performance':s.get('performance'),'owners':owner})
out=run/'review276/metrics277.json';out.write_text(json.dumps({'writer':'CLOSED','scope':'Three staging events and two failure-read samples only; not sustained renderer/causal/human-lag benchmark. NativeModes277 intentionally omitted timing fields, so sealedsummary has zero cost/FPS samples there. HUD0bodies is legacy field, not physics-body census.','rows':rows},indent=2),encoding='utf-8')
print(json.dumps(rows))
