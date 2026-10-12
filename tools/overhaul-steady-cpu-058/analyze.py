from pathlib import Path
import json,collections,hashlib
r=Path(__file__).resolve().parents[2];folder=r/'.sites-runtime/overhaul-20261010/steady058-cpu';p=json.loads((folder/'cpu.json').read_text());e=json.loads((folder/'evidence.json').read_text());nodes={x['id']:x for x in p['nodes']};selfTime=collections.Counter();inclusive=collections.Counter();parents={child:x['id'] for x in p['nodes'] for child in x.get('children',[])}
for ident,dt in zip(p['samples'],p['timeDeltas']):
 selfTime[ident]+=dt;current=ident;seen=set()
 while current in nodes and current not in seen:
  seen.add(current);inclusive[current]+=dt;current=parents.get(current)
def top(values):
 return [{'ms':round(us/1000,3),'id':ident,**nodes[ident]['callFrame']} for ident,us in values.most_common(35)]
out={'scope':'1ms sampled steady CPU under ordinary controls039; elapsed delta attribution is sampling, not exact instrumentation/GPU/IAB or perfqualification. Ancestors inclusive double-count paths.','profileMs':(p['endTime']-p['startTime'])/1000,'sampleDeltaMs':sum(p['timeDeltas'])/1000,'samples':len(p['samples']),'observerStatus':e['status'],'profileBeganMs':e['profileBeganMs'],'profileEndedMs':e['profileEndedMs'],'self':top(selfTime),'inclusive':top(inclusive)}
dest=folder/'analysis.json';assert not dest.exists();dest.write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps({'profileMs':out['profileMs'],'samples':out['samples'],'self':out['self'][:18]}))
