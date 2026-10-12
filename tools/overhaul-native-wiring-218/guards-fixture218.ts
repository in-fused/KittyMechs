/** UNRUN pure protocol cases. No native trajectory, rendered lifecycle or61 rig proof. */
import {createRegistry218} from './wiring218';
import {nativeBasis218} from './nativeBasis218';
import type {RenderActorFrame} from '../../src/game/entities/renderTimeline';
const check=(v:boolean,r:string)=>{if(!v)throw Error(r);};
export function registryCases218(){
 const r=createRegistry218(),asset='a'.repeat(64),scope={actor:'peer',generation:2,assetSHA256:asset,token:Symbol('peer')};
 r.observe([{id:'peer',jumpEpoch:3}],2,asset);
 const d={actor:'peer',actorPresent:true,generation:2,life:3,assetSHA256:asset,browserClipContract:{expected:45,loaded:45,passed:true},status:'temporary-standard',fatal:null};
 r.publish(scope,d);check(r.compatible('peer'),'TEMPORARY_PAIR_CAPABILITY_DEADLOCK');
 d.status='source';check(r.compatible('peer'),'SOURCE_CAPABILITY');d.actorPresent=false;check(!r.compatible('peer'),'MISSING_ACTOR_CAPABILITY');d.actorPresent=true;
 const replacement={...scope,token:Symbol('replacement')};r.publish(replacement,d);r.forget(scope);check(r.compatible('peer'),'STALE_OWNER_CLEANUP');
 r.observe([{id:'peer',jumpEpoch:4}],2,asset);check(!r.compatible('peer'),'LIFE_CAPABILITY');r.observe([{id:'peer',jumpEpoch:3}],3,asset);check(!r.compatible('peer'),'GENERATION_CAPABILITY');
 return {scope:'CONSTRUCTED_PROTOCOL_ONLY',status:'PASS'};
}
export function basisCases218(actualBaseline:RenderActorFrame){
 check(!!actualBaseline.state.nativePose,'REQUIRES_REAL_NATIVE_RECORD');const p=structuredClone(actualBaseline),n=p.state.nativePose!;
 p.time=n.time+.025;const good=nativeBasis218(p,n.time+.05);check(good.basis==='CONFIRMED_SOURCE_LOCAL_HULL_BASIS','INTERPOLATED_BASIS');
 const worldY=n.hull.position.y;n.hull.position.y+=100;check(nativeBasis218(p,n.time+.05).offset===good.offset,'STALE_WORLD_POSITION_USED');n.hull.position.y=worldY;
 n.enabled=false;check(nativeBasis218(p,n.time+.05).basis==='UNKNOWN_BODY_CENTER_FALLBACK','DISABLED_BASIS');n.enabled=true;
 n.nativeStepTick--;check(nativeBasis218(p,n.time+.05).basis==='UNKNOWN_BODY_CENTER_FALLBACK','STALE_TICK_BASIS');
 return {scope:'REAL_RECORD_PLUS_CONSTRUCTED_PROTOCOL_MUTATIONS_ONLY',status:'PASS'};
}
