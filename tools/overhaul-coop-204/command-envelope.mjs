import {ARRIVAL201,CLEAR201,geometry201,certify201,certifyRadius204} from './geometry204.mjs';
import {MECHS,UPRIGHT} from '../../shared/config.ts';
import {validateInteractionSeparation201} from '../overhaul-coop-201/interaction-separation.mjs';
const hypot=Math.hypot;
export const wrap204=x=>Math.atan2(Math.sin(x),Math.cos(x));
export function turnProof204(before,fresh,code){
 const r=fresh.receipt,events=r.controlEvents??[],down=events.find(e=>e.kind==='keydown'&&e.code===code&&e.at>=before.at),up=down&&events.find(e=>e.kind==='keyup'&&e.code===code&&e.at>=down.at),n=fresh.neutral;
 if(!down||!up||r.keys.includes(code)||!n||n.input.seq<=before.seq||n.at<up.at||n.input.forward!==0||n.input.strafe!==0||n.input.yaw!==r.current.yaw||r.current.yaw!==r.camera.movementYaw||r.actor.lastInput<n.input.seq||fresh.rest.lastInput<n.input.seq)throw Error('204 released turn/current native matching-yaw ACK/rest proof unavailable');
 if((code==='KeyJ'?1:-1)*Math.sin(r.camera.movementYaw-before.camera.movementYaw)<=0)throw Error('204 public turn feedback moved in wrong direction or did not move');
 return {down,up,successfulNeutral:n,nativeAck:{tick:fresh.rest.tick,lastInput:fresh.rest.lastInput},actualMovementYaw:r.camera.movementYaw};
}
export function command204(a,target,yaw){
 const dx=target.x-a.position.x,dz=target.z-a.position.z,d=hypot(dx,dz),u={x:-Math.sin(yaw),z:-Math.cos(yaw)},along=dx*u.x+dz*u.z,miss=Math.abs(dx*u.z-dz*u.x);
 const initialSpeed=hypot(a.velocity.x,a.velocity.z),transientRadius=initialSpeed/11;
 return {yaw,desiredYaw:Math.atan2(-dx,-dz),turnError:wrap204(Math.atan2(-dx,-dz)-yaw),direction:u,distance:d,along,miss,initialSpeed,transientRadius,
  aligned:along>0&&miss+transientRadius<ARRIVAL201,
  from:{...a.position},end:{x:a.position.x+u.x*(Math.max(0,along)+ARRIVAL201),z:a.position.z+u.z*(Math.max(0,along)+ARRIVAL201)},
  target:{...target},arrival:ARRIVAL201,baseClearance:CLEAR201};
}
/** Full commanded ray segment, not the ideal planner diagonal or 250ms travel.
 * The normal motor approaches the fixed command at rate11 and neutral at14.
 * Integral of arbitrary initial velocity deviation is bounded by |v0|/11.
 * This spatial region is finite. Actual delivery/realized travel must remain
 * within it; browser delay is never substituted for native held duration. */
export function certifyCommand204(s,name,target,yaw,token=null){
 const a=s.actors.find(a=>a.name===name);if(!a||a.hp<=0||a.downed||!a.grounded||a.climb||a.pair||a.strike||a.boostUntil>s.time||hypot(a.velocity.x,a.velocity.z)>.12)throw Error('204 normal grounded/rested command owner unavailable');
 const c=command204(a,target,yaw),g=geometry201(s,a.id);
 let origin=certify201(g,a.position,a.position),baseRadius=CLEAR201;
 if(token?.separation){
  const plan=token.separation;validateInteractionSeparation201(plan,s,target);const peer=s.actors.find(p=>p.id===plan.ids[1]);
  if((a.position.x-peer.position.x)*c.direction.x+(a.position.z-peer.position.z)*c.direction.z<0)throw Error('204 actual separation command is not radially outward');
  baseRadius=1.75+.05;origin=certifyRadius204(g,a.position,a.position,baseRadius,false,'EXISTING_INTERACTION_SEPARATION_201');
  const v={x:a.position.x-plan.source.x,z:a.position.z-plan.source.z},dot=v.x*c.direction.x+v.z*c.direction.z,r=plan.maxTravel-c.transientRadius,
   cap=-dot+Math.sqrt(dot*dot+r*r-v.x*v.x-v.z*v.z),length=Math.min(hypot(c.end.x-c.from.x,c.end.z-c.from.z),cap);
  if(!Number.isFinite(length)||length<=0)throw Error('204 original3m separation command volume unavailable');
  c.end={x:c.from.x+c.direction.x*length,z:c.from.z+c.direction.z*length};c.separation={maxTravel:plan.maxTravel,source:plan.source,peer:peer.position};
 }
 const endpoint=certify201(g,target,target,{endpoint:true}),command=certifyRadius204(g,c.from,c.end,baseRadius+c.transientRadius,false,'ACTUAL_PUBLIC_FORWARD_COMMAND_REGION_204');
 const receipt={tick:s.tick,publication:s.publication,actor:{id:a.id,life:a.jumpEpoch,hp:a.hp,position:a.position,velocity:a.velocity},command:c,certificates:{origin,endpoint,command},speedCeiling:MECHS[a.chassis].speed*(a.stance==='upright'?UPRIGHT[a.chassis].speed:1),duration:'REQUESTED_DELAY_IS_NOT_A_DELIVERED_DURATION_BOUND',scope:'SAVED_CURRENT_WORLD_COMMAND_REGION_NOT_FUTURE_NPC_PREDICTION'};
 if(!origin.clear||!endpoint.clear||!command.clear||!c.aligned){const e=Error('204 actual public command ray/full arrival/transient region unqualified');e.commandReceipt204=receipt;throw e;}return receipt;
}
export function verifyRealized204(c,observations,name){
 const receipts=[];
 for(const {position:p,snapshot:s} of observations){const a=s.actors.find(a=>a.name===name),g=geometry201(s,a.id),dx=p.x-c.from.x,dz=p.z-c.from.z,t=dx*c.direction.x+dz*c.direction.z,side=Math.abs(dx*c.direction.z-dz*c.direction.x),length=hypot(c.end.x-c.from.x,c.end.z-c.from.z),clearance=c.separation?1.75+.05:CLEAR201,
  origin=certifyRadius204(g,p,p,clearance,false,'ACTUAL_OBSERVED_NATIVE_ORIGIN_204'),traversed=certifyRadius204(g,c.from,p,clearance,false,'ACTUAL_OBSERVED_NATIVE_TRAVERSED_SEGMENT_204');
  const receipt={tick:s.tick,publication:s.publication,actual:p,projection:t,lateral:side,length,origin,traversed};receipts.push(receipt);
  // Exact native coordinates are re-certified, never equated with the ideal
  // algebraic line. The unchanged arrival width bounds convergence; all actual
  // origins/segments separately retain full original physical/planning margins.
  if(t< -c.transientRadius||t>length+c.transientRadius||side>ARRIVAL201||!origin.clear||!traversed.clear){const e=Error('204 realized native command lost finite convergence/current geometric clearance');e.commandReceipt204={command:c,receipts};throw e;}}
 return {status:'ACTUAL_OBSERVED_SEGMENTS_RECERTIFIED',receipts,continuousModel:'Fixed-yaw normal motor source model; observations do not prove unseen NPC occupancy or exact zero-width centerline'};
}
