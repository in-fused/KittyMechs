from pathlib import Path
import hashlib,json,statistics
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/shader-startup-238/public242/evidence.json';d=json.loads(p.read_text())
rows=[]
for name in ['Program242Host','Program242Guest']:
 e=next(x for x in reversed(d['events']) if x.get('pilot')==name and x.get('telemetry'))
 frames=e['telemetry']['frames'][-300:];v=[x['ms'] for x in frames]
 rows.append({'pilot':name,'event':e['label'],'sampleCount':len(v),'pagePerformanceIntervalMs':[frames[0]['at'],frames[-1]['at']],'RAFMedianMs':statistics.median(v),'RAFP95Ms':sorted(v)[int(.95*(len(v)-1))],'RAFMaxMs':max(v),'lastHUD':e.get('performance'),'ownerCosts':[{k:x.get('diagnostic',{}).get(k) for k in ['actor','costMs','maxCostMs']} for x in e.get('native',{}).get('registry',{}).get('rows',[])]})
out=r/'tools/overhaul-grounded-integration-248/prior-performance.json';assert not out.exists()
out.write_text(json.dumps({'writer':'CLOSED','source':p.relative_to(r).as_posix(),'sourceSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'Retained242 last300 instrumented RAF samples, mixed idle/movement cold session; no new game execution or isolated GPU timing','limitations':'Not a matched affected-human/IAB benchmark. Neither HUD nor inverse median proves stable60FPS. Public severe Lowest lag unresolved.','rows':rows},indent=2),encoding='utf-8')
print(json.dumps(rows))
