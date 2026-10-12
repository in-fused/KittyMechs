from pathlib import Path
import json,math,time,hashlib
began=time.perf_counter();r=Path('.').resolve();e=r/'.sites-runtime/overhaul-20261010/observer063-play/evidence.json';data=json.loads(e.read_text());rows=[]
for s in data['samples']:
 local=s['input']['lastSent']['localId'];a=next(x for x in s['snapshot']['actors'] if x['id']==local);d=next(x for x in s['owner']['diagnostics'] if x['actor']==local)
 rows.append({'wallMs':s['wallMs'],'segment':s['phase'],'nativeTick':s['snapshot']['tick'],'nativeTime':s['snapshot']['time'],'nativePosition':a['position'],'nativeVelocity':a['velocity'],'nativeSpeed':math.hypot(a['velocity']['x'],a['velocity']['z']),'nativeYaw':a['yaw'],'nativeStance':a['stance'],'stanceChangedAt':a['stanceChangedAt'],'ownerRenderTime':d['renderTime'],'ownerMode':d['mode'],'ownerSpeed':d['speed'],'gaitPhase':d['phase'],'ownerStance':d['stance'],'active':d['activeClips'],'firstFailure':d['firstFailure']})
switches=[]
for i,b in enumerate(rows[1:],1):
 a=rows[i-1];old=tuple(x['name'] for x in a['active']);new=tuple(x['name'] for x in b['active'])
 if old!=new:switches.append({'beforeIndex':i-1,'afterIndex':i,'before':a,'after':b,'nativeDistanceBetweenSamples':math.hypot(b['nativePosition']['x']-a['nativePosition']['x'],b['nativePosition']['z']-a['nativePosition']['z'])})
result={'scope':'Saved063 read-only CPU diagnosis; sample intervals bound switches, not frame/pad contact clocks','inputSHA256':hashlib.sha256(e.read_bytes()).hexdigest(),'samples':len(rows),'rows':rows,'clipSwitches':switches,'transformRows':[x for x in rows if x['ownerMode']=='transform'],'elapsedSeconds':time.perf_counter()-began}
p=r/'tools/overhaul-gait-runtime-064/recorded-analysis.json';p.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'samples':len(rows),'sampleKeys':list(data['samples'][0].keys()),'switches':[{k:v for k,v in x.items() if k not in ['before','after']}|{'before':{k:x['before'][k] for k in ['segment','wallMs','nativeTick','nativeTime','nativeSpeed','ownerSpeed','gaitPhase','active','ownerMode']},'after':{k:x['after'][k] for k in ['segment','wallMs','nativeTick','nativeTime','nativeSpeed','ownerSpeed','gaitPhase','active','ownerMode']}} for x in switches],'transformRows':result['transformRows'],'elapsedSeconds':result['elapsedSeconds']},indent=2))
