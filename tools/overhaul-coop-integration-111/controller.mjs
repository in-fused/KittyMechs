import {MECHS} from '../../shared/config.ts';
const MOVE=['KeyW','KeyA','KeyS','KeyD'];
const speedOf=a=>Math.hypot(a.velocity.x,a.velocity.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Public keyboard owner only. Every evaluate is a detached read, never input
 * delivery, physics, actor movement or game-state mutation. */
export function createMissionController111({page,name,guard,evidence,onEvent=async()=>{}}){
 let maxSpeed=MECHS.pounce.speed,readMs=0,releaseMs=0,neutralAckMs=0,recentTravel=[],lastRead=null;
 const read=async()=>{guard();const began=Date.now();const r=await page.evaluate(async name=>{
  const d=window.kittyMechDebug,i=await d.input(),s=d.snapshot(),a=s.actors.find(a=>a.name===name);
  return {at:i.at,seq:i.seq,tick:s.tick,time:s.time,room:s.room,publication:s.publication,
   actor:a?{id:a.id,position:a.position,velocity:a.velocity,grounded:a.grounded,hp:a.hp,maxHp:a.maxHp,hurtAt:a.hurtAt,lastInput:a.lastInput,
    nativeStepTick:a.nativePose?.nativeStepTick,nativeHullPosition:a.nativePose?.hull.position,downed:a.downed}:null,
   keys:i.keys,current:i.input,sent:i.sent.slice(-20),controlEvents:i.controlEvents?.slice(-8),camera:d.camera(),browser:i.browser};
 },name);lastRead=r;readMs=Math.max(readMs*.8,Date.now()-began);if(!r.actor)throw Error(name+' missing public pilot');if(r.actor.hp<=0)throw Error(name+' downed on route');maxSpeed=Math.max(maxSpeed,speedOf(r.actor));return r;};
 const release=async keys=>{const began=Date.now();await Promise.all(keys.map(k=>page.keyboard.up(k)));releaseMs=Math.max(releaseMs*.8,Date.now()-began);return {wall:Date.now(),durationMs:Date.now()-began,keys};};
 const stopPrediction=(a,d)=>{
  const speed=speedOf(a),motorDecayDistance=speed/14;
  // Neutral ACK observation includes transport and observation delay: use it
  // as a conservative continuation allowance, not a claimed one-way latency.
  const continuationDistance=speed*(readMs+releaseMs+neutralAckMs)/1000;
  const minimumPulseTravel=Math.max(maxSpeed*(readMs+releaseMs+35)/1000,...recentTravel,0);
  return {distance:d,speed,maxSpeed,readMs,releaseMs,neutralAckMs,motorDecayDistance,continuationDistance,
   predictedStopTravel:motorDecayDistance+continuationDistance,minimumPulseTravel};
 };
 const settle=async({packet=null,releaseReceipt=null}={})=>{
  await release(MOVE);const mark=await read();let neutral=null,ack=null,restTicks=[],last=null;const until=Date.now()+4000;
  while(Date.now()<until){const r=await read();last=r;
   if(packet&&r.actor.lastInput>=packet.input.seq&&!ack)ack={sentSeq:packet.input.seq,cumulative:true,tick:r.tick,time:r.time,lastInput:r.actor.lastInput,wall:Date.now(),position:r.actor.position};
   neutral??=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&x.input.forward===0&&x.input.strafe===0&&!x.input.fire&&!x.input.climb);
   if(neutral&&r.actor.lastInput>=neutral.input.seq&&(!packet||ack)&&r.current.forward===0&&r.current.strafe===0&&r.actor.grounded&&speedOf(r.actor)<=.12){
    if(!restTicks.includes(r.tick))restTicks.push(r.tick);
    if(restTicks.length>=2){const rest={tick:r.tick,time:r.time,wall:Date.now(),position:r.actor.position,velocity:r.actor.velocity,lastInput:r.actor.lastInput,nativeStepTick:r.actor.nativeStepTick};
     if(releaseReceipt)neutralAckMs=Math.max(neutralAckMs*.8,rest.wall-releaseReceipt.wall);
     return {ack,neutral,rest,receipt:r};}
   }else restTicks=[];
   await page.waitForTimeout(35);
  }
  evidence.failureReceipt={kind:'ACK_OR_NEUTRAL_REST_MISSING',packet,neutral,ack,last};throw Error('Post-release exact-sequence ACK/fresh neutral rest missing within4s');
 };
 const moveTo=async(target,{phase,tolerance=1.1}={})=>{
  if(evidence.waypoints.length>=100)throw Error('Explicit111 waypoint record cap');const result={name,phase,target,tolerance,pulses:[],status:'RUNNING'};evidence.waypoints.push(result);
  let state=(await settle()).receipt;
  for(let iteration=0;iteration<35;iteration++){
   guard();await onEvent(state);const a=state.actor,d=distance(a.position,target),prediction=stopPrediction(a,d);
   if(d<tolerance){result.status='ACTUAL_SETTLED_WITHIN_UNCHANGED_ARRIVAL';result.rest={tick:state.tick,time:state.time,position:a.position,velocity:a.velocity,distance:d,lastInput:a.lastInput};return result;}
   // Never deliberately send a pulse whose measured minimum travel would carry
   // the resting pilot beyond the opposite edge of the unchanged arrival circle.
   if(recentTravel.length&&Math.max(prediction.predictedStopTravel,prediction.minimumPulseTravel)>d+tolerance){evidence.failureReceipt={kind:'OBSERVED_CONTROL_LATENCY_CANNOT_FIT_MINIMUM_PULSE',phase,target,prediction,receipt:state};throw Error('Measured minimum delivered pulse cannot fit unchanged arrival circle');}
   const yaw=state.camera.movementYaw,dx=target.x-a.position.x,dz=target.z-a.position.z;if(!Number.isFinite(yaw))throw Error('Current public movement yaw unavailable');
   const f=-(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d,s=(dx*Math.cos(yaw)-dz*Math.sin(yaw))/d,
    intended={forward:Number(f>.25)-Number(f<-.25),strafe:Number(s>.25)-Number(s<-.25)},
    keys=[...(intended.forward>0?['KeyW']:intended.forward<0?['KeyS']:[]),...(intended.strafe>0?['KeyD']:intended.strafe<0?['KeyA']:[])];
   const pulse={iteration,phase,target,start:{wall:Date.now(),at:state.at,seq:state.seq,tick:state.tick,time:state.time,position:a.position,velocity:a.velocity},prediction,intended,keys};result.pulses.push(pulse);
   let packet=null,observed=null,releaseReceipt=null;
   try{
    await Promise.all(keys.map(k=>page.keyboard.down(k)));
    // Only distant travel receives a short, finite pre-observation lease.
    // The first successful-send observation still releases immediately, before ACK.
    // 250ms * observed/configured peak plus measured delay must fit remaining road.
    const leaseMs=d>6?Math.min(250,Math.max(0,((d-tolerance-prediction.predictedStopTravel)/maxSpeed)*1000-readMs-releaseMs)):0;
    pulse.preObservationLeaseMs=leaseMs;
    if(leaseMs>0)await page.waitForTimeout(leaseMs);
    guard();const until=Date.now()+1500;
    while(Date.now()<until){const r=await read();observed=r;
     packet=r.sent.find(x=>x.at>=state.at&&x.input.seq>state.seq&&x.input.forward===intended.forward&&x.input.strafe===intended.strafe);
     pulse.stopObservation=stopPrediction(r.actor,distance(r.actor.position,target));
     if(packet)break;await page.waitForTimeout(15);
    }
    // Release after successful-send observation, before any ACK polling or
    // extra travel sleep. Only the active movement keys need release here.
   }finally{releaseReceipt=await release(keys);pulse.release=releaseReceipt;}
   pulse.packet=packet;pulse.observed=observed?{tick:observed.tick,time:observed.time,position:observed.actor.position,velocity:observed.actor.velocity,lastInput:observed.actor.lastInput,sent:observed.sent.filter(x=>x.at>=state.at).slice(-20)}:null;
   if(!packet){evidence.failureReceipt={kind:'NO_SUCCESSFUL_INTENDED_SEND',pulse};throw Error('Successful intended movement send missing within1.5s');}
   const settled=await settle({packet,releaseReceipt});pulse.ack=settled.ack;pulse.neutral=settled.neutral;pulse.rest=settled.rest;pulse.keyReleaseEvents=settled.receipt.controlEvents?.filter(x=>x.at>=packet.at&&keys.includes(x.code)&&x.kind==='keyup');
   pulse.actualTravel=distance(pulse.start.position,settled.rest.position);pulse.restDistance=distance(settled.rest.position,target);
   if(!pulse.preObservationLeaseMs)recentTravel=[...recentTravel,pulse.actualTravel].slice(-3);state=settled.receipt;
  }
  evidence.failureReceipt={kind:'FINITE_WAYPOINT_ITERATIONS',phase,target,receipt:state};throw Error('Waypoint35-iteration convergence bound');
 };
 return {read,lastObservation:()=>lastRead,release:()=>release(MOVE),moveTo,settle};
}
