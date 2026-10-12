from pathlib import Path
import json,collections,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;o=r/'.sites-runtime/overhaul-20261010/render-rescue074-play';p=json.loads((o/'cpu-profile.json').read_text());nodes={n['id']:n for n in p['nodes']};parents={c:n['id'] for n in p['nodes'] for c in n.get('children',[])};own=collections.Counter();inclusive=collections.Counter()
for node,dt in zip(p['samples'],p['timeDeltas']):
 own[node]+=dt
 while node in nodes:inclusive[node]+=dt;node=parents.get(node)
def describe(node,micros):
 c=nodes[node]['callFrame'];return {'name':c['functionName'],'url':c['url'],'line':c['lineNumber']+1,'column':c['columnNumber']+1,'sampledMs':micros/1000}
e=json.loads((o/'evidence.json').read_text());s={'status':e['status'],'errors':e['errors'],'durationMs':(p['endTime']-p['startTime'])/1000,'sampleCount':len(p['samples']),'selfTop':[describe(i,v) for i,v in own.most_common(25)],'inclusiveTop':[describe(i,v) for i,v in inclusive.most_common(25)],'observedFrames':[{'label':x['label'],'performance':x['performance'],'ruins':len(x['state'].get('ruins',[])),'facadeCell24':next((b['hp'][24] for b in x['state']['structures'] if b['id']=='7734:overhaul:spawn-west:facade-bank'),None)} for x in e['samples']],'scope':'Different route/mode/weather/recorder from069; no causal before/after FPS claim, no GPU/IAB qualification.'};(h/'summary.json').write_text(json.dumps(s,indent=2));print(json.dumps(s['observedFrames']))
