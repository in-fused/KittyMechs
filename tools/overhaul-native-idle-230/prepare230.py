import pathlib,json,hashlib,shutil,math
root=pathlib.Path(__file__).resolve().parents[2];folder=pathlib.Path(__file__).parent
source=root/'tools/overhaul-native-integration-222/nativeOwner218.ts';preimage=folder/'nativeOwner222-preimage.ts';shutil.copyfile(source,preimage)
text=source.read_text();old='const moving=p.distance>0;if(!complete&&moving)this.lastSpeed=speed;';new='const moving=speed>.08;if(!complete&&moving)this.lastSpeed=speed;'
assert text.count(old)==1
text=text.replace(old,new).replace("from './nativeBasis218'","from '../overhaul-native-integration-222/nativeBasis218'")
(folder/'nativeOwner230.ts').write_text(text)
raw=root/'.sites-runtime/overhaul-20261011/native228-public/evidence.json';e=json.loads(raw.read_text());rows=[];actors={}
for event in e['events']:
 actor=event.get('actor');pilot=event.get('pilot');inp=event.get('input') or {}
 if not actor:continue
 native=actor.get('nativePose') or {};movement=native.get('movement') or {};reg=(event.get('native') or {}).get('registry') or {};diag=next((r['diagnostic'] for r in reg.get('rows',[]) if r['actor']==actor['id']),None)
 sent=inp.get('sent') or [];edges=inp.get('controlEvents') or []
 row={'pilot':pilot,'wallMs':event['wallMs'],'label':event['label'],'time':event.get('time'),'position':actor['position'],'velocity':actor.get('velocity'),'requested':movement.get('requested'),'delta':movement.get('delta'),'inputAvailable':bool(event.get('input')),'sentCount':len(sent),'nonNeutralAxisPackets':len([s for s in sent if s['input']['forward']!=0 or s['input']['strafe']!=0]),'movementKeydowns':len([s for s in edges if s.get('kind')=='keydown' and s.get('code') in ['KeyW','KeyS','KeyA','KeyD']]),'phase':diag.get('phase') if diag else None,'activeClips':diag.get('activeClips') if diag else None}
 rows.append(row);actors.setdefault(pilot,[]).append(row)
summary={}
for pilot,values in actors.items():
 a=values[0];b=values[-1];dx=b['position']['x']-a['position']['x'];dz=b['position']['z']-a['position']['z'];summary[pilot]={'observations':len(values),'totalObservedHorizontalDisplacement':math.hypot(dx,dz),'nativeElapsed':b['time']-a['time'],'first':a,'last':b}
def inputrow(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(folder/'observed-idle230.json').write_text(json.dumps({'scope':'SAVED_ACTUAL228_READ_ONLY_NO_NEW_CAPTURE','status':e['status'],'cases':e['cases'],'summary':summary,'rows':rows,'provenance':[inputrow(raw),inputrow(root/'tools/overhaul-native-observer-229/actual-summary.json'),inputrow(source)]},indent=2))
print(json.dumps({'candidate':inputrow(folder/'nativeOwner230.ts'),'preimage':inputrow(preimage),'observedHostDrift':summary['Native228Host']['totalObservedHorizontalDisplacement']}))
