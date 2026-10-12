from pathlib import Path
import json,statistics,math
r=Path(__file__).resolve().parents[2];out={}
for label in ['baseline','candidate']:
 e=json.loads((r/('.sites-runtime/overhaul-20261010/player090-'+label+'/evidence.json')).read_text());rows=[]
 for phase in e['phases']:
  samples=[x['sample'] for x in e['samples'] if x['phase']==phase['phase']];actors=[next(a for a in s['actors'] if a['name']=='View089') for s in samples]
  owners=[d for s in samples for d in s['feline']['diagnostics'] if d['actor']==next(a['id'] for a in s['actors'] if a['name']=='View089')];feet=[f for d in owners for f in d.get('feet',{}).get('feet',[])]
  p0,p1=actors[0]['position'],actors[-1]['position'];camera=[s['camera'] for s in samples]
  rows.append({'phase':phase['phase'],'samples':len(samples),'nativeTimeSpan':samples[-1]['time']-samples[0]['time'],'nativeStances':sorted(set(a['stance'] for a in actors)),'nativeStart':p0,'nativeEnd':p1,'sampledDisplacement':math.hypot(p1['x']-p0['x'],p1['z']-p0['z']),'sampledFPSMedian':statistics.median(s['performance']['fps'] for s in samples),'clearFalse':sum(not c['clear'] for c in camera),'projectedFalse':sum(not c.get('fitAvailable',False) for c in camera),'opticalLimited':sum(c.get('bodySight',{}).get('opticalLimited',False) for c in camera),'constrained':sum(c.get('bodySight',{}).get('constrained',False) for c in camera),'ownerClips':sorted(set(c['name'] for d in owners for c in d['activeClips'])),'ownerAssetSHA256':sorted(set(d['assetSHA256'] for d in owners)),'footModes':{m:sum(f['mode']==m for f in feet) for m in sorted(set(f['mode'] for f in feet))},'sourceSwingIKNonzero':sum(f.get('reason')=='AUTHORED_GAIT_RELEASE' and f.get('influence',0)!=0 for f in feet),'fallbacks':sum(len(s['feline']['fallbacks']) for s in samples)})
 out[label]={'receipt':e['receipt'],'status':e['status'],'elapsedMs':e['elapsedMs'],'renderer':e['renderer'],'phases':rows}
out['scope']='Read-only sampled diagnostics and native witness, not visual contact/gait or net FPS/IAB approval. Phases differ in exact native timing and position. Standard flag-off may retain stale inactive owner diagnostics; only selected prototype phases identify active source ownership.'
p=r/'tools/overhaul-player-integration-090/comparison.json';assert not p.exists();p.write_text(json.dumps(out,indent=2));print(json.dumps({n:[{'phase':x['phase'],'meters':round(x['sampledDisplacement'],2),'stances':x['nativeStances'],'clearFalse':x['clearFalse'],'projectedFalse':x['projectedFalse'],'fps':x['sampledFPSMedian']} for x in out[n]['phases']] for n in ['baseline','candidate']}))
