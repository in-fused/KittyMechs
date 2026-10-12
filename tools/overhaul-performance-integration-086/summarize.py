from pathlib import Path
import json, statistics, math, hashlib
r=Path(__file__).resolve().parents[2]
def quantile(values,p):
    v=sorted(values); return v[min(len(v)-1,math.floor(len(v)*p))] if v else None
out={'scope':'Sequential profiled headless Edge comparison; eligibility is not GPU submission. Actual user IAB lag and gameplay quality unverified. No causal claim from unmatched actor/weather views.','runs':[]}
for name in ['baseline','candidate']:
    d=r/('.sites-runtime/overhaul-20261010/performance'+('084' if name=='baseline' else '086')+'-'+name)
    e=json.loads((d/'evidence.json').read_text()); assert e['status']=='CAPTURED_INDEPENDENT_REVIEW_REQUIRED'
    row={'run':name,'receipt':e['receipt'],'renderer':e['renderer'],'phases':[],'evidenceSHA256':hashlib.sha256((d/'evidence.json').read_bytes()).hexdigest()}
    for phase in e['phases']:
        frames=phase['frames']; samples=[x['sample'] for x in e['samples'] if x['phase']==phase['phase']]
        row['phases'].append({'phase':phase['phase'],'frames':len(frames),'medianMs':statistics.median(frames),'p95Ms':quantile(frames,.95),'over33ms':sum(x>33.333 for x in frames),'sampleCount':len(samples),'callsMedian':statistics.median(x['performance']['calls'] for x in samples),'trianglesMedian':statistics.median(x['performance']['triangles'] for x in samples),'boundsSamples':[x['bounds'] for x in samples if x['bounds'] is not None],'weatherSamples':[x.get('weather') for x in samples]})
    profile=json.loads((d/'cpu-profile.json').read_text()); nodes={x['id']:x for x in profile['nodes']};parents={c:x['id'] for x in profile['nodes'] for c in x.get('children',[])}
    duration=buffer=0
    for nid,delta in zip(profile['samples'],profile['timeDeltas']):
        duration+=delta
        chain=[]
        while nid in nodes:
            chain.append(nodes[nid]['callFrame']['functionName']);nid=parents.get(nid)
        if 'renderBufferDirect' in chain:buffer+=delta
    row['profile']={'observedMs':duration/1000,'renderBufferDirectInclusiveMs':buffer/1000,'renderBufferDirectProfilePercent':100*buffer/duration}
    out['runs'].append(row)
p=Path(__file__).parent/'comparison.json';assert not p.exists();p.write_text(json.dumps(out,indent=2)); print(json.dumps([{k:v for k,v in x.items() if k not in ['phases']} for x in out['runs']]))
