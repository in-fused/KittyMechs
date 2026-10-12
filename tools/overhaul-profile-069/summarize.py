from pathlib import Path
import json,collections,hashlib,statistics
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;o=r/'.sites-runtime/overhaul-20261010/profile069-play';p=json.loads((o/'cpu-profile.json').read_text());nodes={n['id']:n for n in p['nodes']};parents={c:n['id'] for n in p['nodes'] for c in n.get('children',[])};own=collections.Counter();inclusive=collections.Counter()
for node,dt in zip(p['samples'],p['timeDeltas']):
 own[node]+=dt
 while node in nodes:
  inclusive[node]+=dt;node=parents.get(node)
def describe(node,micros):
 c=nodes[node]['callFrame'];return {'name':c['functionName'],'url':c['url'],'line':c['lineNumber']+1,'column':c['columnNumber']+1,'sampledMs':micros/1000}
e=json.loads((o/'evidence.json').read_text());f=sorted(e['frames'][1:]);summary={'status':e['status'],'errors':e['errors'],'durationMs':(p['endTime']-p['startTime'])/1000,'samples':len(p['samples']),'selfTop':[describe(i,v) for i,v in own.most_common(35)],'inclusiveTop':[describe(i,v) for i,v in inclusive.most_common(35)],'rAF':{'medianMs':statistics.median(f),'p95Ms':f[int(len(f)*.95)],'p99Ms':f[int(len(f)*.99)]},'scope':'Sampled browser main-thread CPU only. Includes CDP observation/screenshot overhead; not GPU time or actual user IAB diagnosis.'}
(h/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
def row(path):
 b=path.read_bytes();return {'path':path.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[p for folder in [o,r/'.sites-runtime/overhaul-20261010/profile069-process'] for p in folder.rglob('*') if p.is_file()]+[h/'summary.json',h/'run-seal.json',Path(__file__)]
(h/'result-seal.json').write_text(json.dumps({'files':[row(path) for path in paths],'scope':summary['scope']},indent=2),encoding='utf8');print(json.dumps(summary))
