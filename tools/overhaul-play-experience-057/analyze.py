from pathlib import Path
import json,sys,hashlib,statistics
r=Path(__file__).resolve().parents[2];folder=r/'.sites-runtime/overhaul-20261010'/sys.argv[1];e=json.loads((folder/'evidence.json').read_text(encoding='utf8'))
def percentile(a,p):
 a=sorted(a);return a[min(len(a)-1,int((len(a)-1)*p))] if a else None
out={'status':e['status'],'failure':e.get('failure'),'elapsedMs':e['elapsedMs'],'gpu':e.get('gpu'),'frameMs':{'count':len(e['frames']),'median':percentile(e['frames'],.5),'p95':percentile(e['frames'],.95),'p99':percentile(e['frames'],.99)},'phases':[]}
for phase in dict.fromkeys(x['phase'] for x in e['samples']):
 s=[x for x in e['samples'] if x['phase']==phase];actor=lambda x:next(a for a in x['snapshot']['actors'] if a['name']=='Experience057')
 out['phases'].append({'phase':phase,'samples':len(s),'first':actor(s[0]),'last':actor(s[-1]),'fpsMedian':statistics.median(x['performance']['fps'] for x in s),'trianglesMedian':statistics.median(x['performance']['triangles'] for x in s),'callsMedian':statistics.median(x['performance']['calls'] for x in s),'cameraFitFalse':sum(not x['camera']['fitAvailable'] for x in s),'clearFalse':sum(not x['camera']['clear'] for x in s),'camera':[{k:x['camera'].get(k) for k in ['frameClock','visualFrameClock','position','focus','fitAvailable','snapped','lookPitch','preferredDistance','visualCorners']} for x in s]})
dest=folder/'summary.json';assert not dest.exists();dest.write_text(json.dumps(out,indent=2),encoding='utf8')
print(json.dumps({'status':out['status'],'frameMs':out['frameMs'],'gpuDevices':out['gpu'].get('devices'),'gpuRenderer':out['gpu'].get('auxAttributes',{}).get('glRenderer'),'phases':[{k:x[k] for k in ['phase','samples','fpsMedian','trianglesMedian','callsMedian','cameraFitFalse','clearFalse']} for x in out['phases']]}))
