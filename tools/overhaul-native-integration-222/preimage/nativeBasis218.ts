import type {RenderActorFrame} from '../../src/game/entities/renderTimeline';
import {ACTOR_HEIGHT} from '../../shared/config';
/** RenderTimeline returns earlier confirmed state + interpolated carrier/time.
 * The source packet's LOCAL hull basis transports with that displayed carrier;
 * stale world hull coordinates are never subtracted from a newer body position.
 * This qualifies placement provenance only, never support/contact. */
export function nativeBasis218(p:RenderActorFrame,confirmedTime:number){
 const n=p.state.nativePose,unknown=(reason:string)=>({offset:-ACTOR_HEIGHT,basis:'UNKNOWN_BODY_CENTER_FALLBACK',reason,nativeTime:n?.time??null,displayTime:p.time,confirmedTime,contactQualified:false});
 if(!n)return unknown('MISSING_NATIVE_RECORD');
 if(n.actorId!==p.state.id||n.life!==p.state.jumpEpoch)return unknown('NATIVE_ACTOR_OR_LIFE');
 if(!n.enabled)return unknown(p.state.downed||p.state.hp<=0?'DISABLED_DOWN_DEATH_BODY_CENTER':'DISABLED_NATIVE_OWNER');
 if(n.phase!=='current-native-readback'||!Number.isSafeInteger(n.tick)||n.tick<0||n.nativeStepTick!==n.tick)return unknown('STALE_NATIVE_READBACK_TICK');
 if(!Number.isFinite(n.time)||!Number.isFinite(p.time)||!Number.isFinite(confirmedTime)||n.time>p.time||p.time>confirmedTime||confirmedTime-n.time>.35)return unknown('OUTSIDE_CONFIRMED_PRESENTATION_INTERVAL');
 const s=n.shape,l=n.localPosition,q=n.localRotation;
 if(s?.kind!=='RoundCylinder'||![s.halfHeight,s.radius,s.borderRadius,l?.x,l?.y,l?.z,q?.x,q?.y,q?.z,q?.w].every(Number.isFinite)||Math.min(s.halfHeight,s.radius,s.borderRadius)<=0||n.hull.shapeType!==14||n.hull.revision!==JSON.stringify(s))return unknown('INVALID_NATIVE_LOCAL_BASIS');
 // Native setHull declares a centered, unrotated collider local to body.
 // An undeclared lateral/rotated local mount is not silently transported as y.
 if(l.x!==0||l.z!==0||q.x!==0||q.y!==0||q.z!==0||q.w!==1)return unknown('NONCANONICAL_NATIVE_LOCAL_MOUNT');
 const offset=l.y-s.halfHeight-s.borderRadius;
 if(!Number.isFinite(offset))return unknown('NONFINITE_LOCAL_LOWER_BOUNDARY');
 return {offset,basis:'CONFIRMED_SOURCE_LOCAL_HULL_BASIS',reason:null,nativeTick:n.tick,nativeTime:n.time,displayTime:p.time,confirmedTime,displayNativeAge:p.time-n.time,contactQualified:false};
}
