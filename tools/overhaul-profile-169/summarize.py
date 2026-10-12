from pathlib import Path
import json,collections,statistics
r=Path(__file__).resolve().parents[2];folder=r/'.sites-runtime/overhaul-20261010/profile169-public';d=json.loads((folder/'evidence.json').read_text());out={'status':d['status'],'errors':d['errors'],'cleanupFailure':d.get('cleanupFailure'),'scope':'Sampled MAIN V8 leaves, profiling overhead and variable actual combat. Not GPU/worker/IAB timings or controlled ON/OFF performance gain. Repeated gait error makes sustained play unqualified.','phases':[]}
for phase in d['phases']:
 p=json.loads((folder/phase['profile']).read_text());nodes={n['id']:n for n in p['nodes']};counts=collections.Counter();times=collections.Counter();samples=p.get('samples',[]);deltas=p.get('timeDeltas',[])
 for i,n in enumerate(samples):
  f=nodes[n]['callFrame'];key=(f['functionName'],f['url'],f['lineNumber'],f['columnNumber']);counts[key]+=1;times[key]+=deltas[i] if i<len(deltas) else 0
 total=sum(times.values());rows=[{'function':k[0],'url':k[1],'line':k[2],'column':k[3],'sampledMicros':v,'fractionOfSampledTime':v/total if total else None,'samples':counts[k]} for k,v in times.most_common(20)]
 ss=phase['samples'];out['phases'].append({'name':phase['name'],'elapsedMs':phase['durationMs'],'fpsMedian':statistics.median(s['performance']['fps'] for s in ss),'hpFirstLast':[ss[0]['actor']['hp'],ss[-1]['actor']['hp']],'drawCallsMedian':statistics.median(s['performance']['calls'] for s in ss),'trianglesMedian':statistics.median(s['performance']['triangles'] for s in ss),'sampledMicros':total,'topLeaves':rows})
(folder/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps({'status':out['status'],'phases':[{'name':x['name'],'fps':x['fpsMedian'],'hp':x['hpFirstLast'],'top':[(a['function'],round(a['fractionOfSampledTime'],3)) for a in x['topLeaves'][:8]]} for x in out['phases']]},indent=2))
