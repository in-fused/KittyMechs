import {MECHS} from '../../shared/config.ts';
const MOVE=['KeyW','KeyA','KeyS','KeyD'];
const speedOf=a=>Math.hypot(a.velocity.x,a.velocity.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Public keyboard owner. Diagnostics run only after all pulse keys release. */
export function createMissionController170({page,name,guard,evidence,onEvent=async()=>{},beforePulse=async()=>{}}){
 let maxSpeed=MECHS.pounce.speed,readMs=0,releaseMs=0,neutralAckMs=0,lastRead=null,holding=false;
 const read=async()=>{guard();if(holding)throw Error('115 forbids diagnostic observation inside a public key lease');const began=Date.now();const r=await page.evaluate(async name=>{
  const d=window.kittyMechDebug,i=await d.input(),s=d.snapshot(),a=s.actors.find(a=>a.name===name);
  return {at:i.at,seq:i.seq,tick:s.tick,time:s.time,room:s.room,publication:s.publication,
   actor:a?{id:a.id,position:a.position,velocity:a.velocity,grounded:a.grounded,hp:a.hp,maxHp:a.maxHp,hurtAt:a.hurtAt,lastInput:a.lastInput,
    nativeStepTick:a.nativePose?.nativeStepTick,nativeHullPosition:a.nativePose?.hull.position,downed:a.downed}:null,
   keys:i.keys,current:i.input,sent:i.sent,controlEvents:i.controlEvents,camera:d.camera(),browser:i.browser};
 },name);lastRead=r;readMs=Math.max(readMs*.8,Date.now()-began);if(!r.actor)throw Error(name+' missing public pilot');if(r.actor.hp<=0)throw Error(name+' downed on route');maxSpeed=Math.max(maxSpeed,speedOf(r.actor));return r;};
 const release=async keys=>{const began=Date.now();try{await Promise.all(keys.map(k=>page.keyboard.up(k)));}finally{holding=false;}releaseMs=Math.max(releaseMs*.8,Date.now()-began);return {wall:Date.now(),durationMs:Date.now()-began,keys};};
 const stopPrediction=(a,d)=>{
  const speed=speedOf(a),motorDecayDistance=speed/14;
  // These API/rest observation durations describe the observer only. They are
  // neither transport latency nor a lower bound on an achievable key pulse.
  return {distance:d,speed,maxSpeed,readMs,releaseMs,neutralAckMs,motorDecayDistance};
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
  if(evidence.waypoints.length>=100)throw Error('Explicit115 waypoint record cap');const result={name,phase,target,tolerance,pulses:[],status:'RUNNING'};evidence.waypoints.push(result);
  let state=(await settle()).receipt;
  for(let iteration=0;iteration<35;iteration++){
   guard();await onEvent(state);state=await read();await beforePulse(state,target);const a=state.actor,d=distance(a.position,target),prediction=stopPrediction(a,d);
   if(d<tolerance){result.status='ACTUAL_SETTLED_WITHIN_UNCHANGED_ARRIVAL';result.rest={tick:state.tick,time:state.time,position:a.position,velocity:a.velocity,distance:d,lastInput:a.lastInput};return result;}
   const yaw=state.camera.movementYaw,dx=target.x-a.position.x,dz=target.z-a.position.z;if(!Number.isFinite(yaw))throw Error('Current public movement yaw unavailable');
   const f=-(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d,s=(dx*Math.cos(yaw)-dz*Math.sin(yaw))/d,
    intended={forward:Number(f>.25)-Number(f<-.25),strafe:Number(s>.25)-Number(s<-.25)},
    keys=[...(intended.forward>0?['KeyW']:intended.forward<0?['KeyS']:[]),...(intended.strafe>0?['KeyD']:intended.strafe<0?['KeyA']:[])];
   // Aim the requested finite lease toward the target center using observed/
   // configured peak speed and existing motor decay estimate. The existing
   // 250ms lease cap remains. This is a request, not a claimed movement bound.
   const leaseMs=Math.min(250,Math.max(0,(d-prediction.motorDecayDistance)/maxSpeed*1000));
   if(!keys.length||!Number.isFinite(leaseMs)||leaseMs<=0)throw Error('115 finite public pulse unavailable');
   const pulse={iteration,phase,target,start:{wall:Date.now(),at:state.at,seq:state.seq,tick:state.tick,time:state.time,position:a.position,velocity:a.velocity},prediction,intended,keys,requestedLeaseMs:leaseMs,controlKind:keys.length===1?'PUBLIC_KEYBOARD_PRESS':'PUBLIC_MULTI_KEY_FINALLY_RELEASE'};result.pulses.push(pulse);
   let packet=null,observed=null,releaseReceipt=null,edges=null;
   try{
    holding=true;
    if(keys.length===1)await page.keyboard.press(keys[0],{delay:leaseMs});
    else{await Promise.all(keys.map(k=>page.keyboard.down(k)));await new Promise(resolve=>setTimeout(resolve,leaseMs));}
   }finally{releaseReceipt=await release(keys);pulse.release=releaseReceipt;}
   // Both ordinary key edges complete before the first read. Preserve the full
   // existing bounded32-send/64-control rings: missing/evicted proof fails.
   guard();const until=Date.now()+1500;
   while(Date.now()<until){const r=await read();observed=r;
    const events=r.controlEvents??[],pairs=keys.map(code=>{const down=events.find(e=>e.kind==='keydown'&&e.code===code&&e.at>=state.at),up=down&&events.find(e=>e.kind==='keyup'&&e.code===code&&e.at>=down.at);return {code,down,up};});
    if(pairs.every(p=>p.down&&p.up)){
     const heldStart=Math.max(...pairs.map(p=>p.down.at)),heldEnd=Math.min(...pairs.map(p=>p.up.at));
     if(heldEnd<heldStart){evidence.failureReceipt={kind:'PUBLIC_KEYS_NEVER_OVERLAPPED',pulse,pairs};throw Error('Public movement keys had no common held interval');}
     edges={clock:'BROWSER_PERFORMANCE_NOW',pairs,heldStart,heldEnd,actualCommonHeldMs:heldEnd-heldStart};
     packet=r.sent.find(x=>x.at>=heldStart&&x.at<=heldEnd&&x.input.seq>state.seq&&x.input.forward===intended.forward&&x.input.strafe===intended.strafe);
    }
    if(packet&&edges&&keys.every(k=>!r.keys.includes(k))&&r.current.forward===0&&r.current.strafe===0)break;
    await page.waitForTimeout(15);
   }
   pulse.packet=packet;pulse.keyEdges=edges;pulse.observed=observed?{tick:observed.tick,time:observed.time,position:observed.actor.position,velocity:observed.actor.velocity,lastInput:observed.actor.lastInput,sent:observed.sent.filter(x=>x.at>=state.at)}:null;
   if(!packet||!edges||!observed||keys.some(k=>observed.keys.includes(k))||observed.current.forward!==0||observed.current.strafe!==0){evidence.failureReceipt={kind:'MISSING_OR_EVICTED_PUBLIC_PULSE_PROOF',pulse};throw Error('Actual intended successful send/key edges/released movement missing within1.5s');}
   const settled=await settle({packet,releaseReceipt});pulse.ack=settled.ack;pulse.neutral=settled.neutral;pulse.rest=settled.rest;pulse.keyReleaseEvents=edges.pairs.map(p=>p.up);
   pulse.actualTravel=distance(pulse.start.position,settled.rest.position);pulse.restDistance=distance(settled.rest.position,target);state=settled.receipt;
  }
  evidence.failureReceipt={kind:'FINITE_WAYPOINT_ITERATIONS',phase,target,receipt:state};throw Error('Waypoint35-iteration convergence bound');
 };
 return {read,lastObservation:()=>lastRead,release:()=>release(MOVE),moveTo,settle};
}


