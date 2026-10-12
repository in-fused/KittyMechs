const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const equal=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(wrap(a-b))<=Number.EPSILON*16*Math.max(1,Math.abs(a),Math.abs(b));
const LOOK=['KeyJ','KeyL','KeyI','KeyK'],LEASE=[...LOOK,'KeyW','KeyA','KeyS','KeyD','KeyF'];
export function acceptedAim156(r){
 const packet=r.sent.find(p=>p.input.seq===r.actor.lastInput&&p.generation===r.identity.generation&&p.localId===r.actor.id&&p.input.jumpEpoch===r.actor.jumpEpoch);
 const released=LEASE.every(k=>!r.keys.includes(k))&&r.input.forward===0&&r.input.strafe===0&&!r.input.fire;
 return {packet:packet??null,released,accepted:!!packet&&released&&packet.input.forward===0&&packet.input.strafe===0&&!packet.input.fire&&!packet.input.climb&&equal(packet.input.aimYaw??packet.input.yaw,r.actor.aimYaw)&&equal(packet.input.pitch,r.actor.aimPitch)&&equal(packet.aim?.lookYaw,r.look.yaw)&&equal(packet.aim?.lookPitch,r.look.pitch)&&!!packet.aim?.cameraRay&&Math.abs(wrap(packet.aim.cameraRay.yaw-r.look.cameraRay.yaw))<=.002&&Math.abs(packet.aim.cameraRay.pitch-r.look.cameraRay.pitch)<=.002};
}
export function chooseLook156(aim,previous){
 const axis=Math.abs(aim.dyaw)/.045>=Math.abs(aim.dpitch)/.035?'yaw':'pitch',error=axis==='yaw'?aim.dyaw:aim.dpitch,tolerance=axis==='yaw'?.045:.035;
 if(Math.abs(error)<=tolerance)return null;
 let gain=1;
 if(previous?.axis===axis){const delta=axis==='yaw'?wrap(previous.after.look.yaw-previous.before.look.yaw):previous.after.look.pitch-previous.before.look.pitch,change=(axis==='yaw'?previous.afterAim.dyaw-previous.beforeAim.dyaw:previous.afterAim.dpitch-previous.beforeAim.dpitch),observed=-change/delta;if(Number.isFinite(observed)&&observed>0)gain=observed;}
 const rate=axis==='yaw'?1.9:1.1;
 return {axis,error,gain,key:axis==='yaw'?(error>0?'KeyJ':'KeyL'):(error>0?'KeyI':'KeyK'),requestedMs:Math.min(70,Math.abs(error/gain)/rate*1000)};
}
export function createAimFeedback156({page,read,guard,record,deadline}){
 let binding=null;
 const checked=async()=>{guard();if(Date.now()>=deadline)throw Error('156 existing combat20s wall watchdog');const r=await read(),id=r.identity;
  if(!r.actor||r.actor.hp<=0||!Number.isSafeInteger(id?.generation)||id.localId!==r.actor.id||id.life!==id.sendLife||!r.look?.cameraRay||!Number.isFinite(r.at)||!Number.isSafeInteger(r.seq)||!r.publication?.roomEpoch||!Number.isSafeInteger(r.publication.sequence)||r.publication.sequence<=0||!Number.isFinite(r.camera.frameClock)||r.look.cameraRay.frameClock!==r.camera.frameClock||r.transport?.error||r.transport?.connection==='Disconnected')throw Error('156 current combat actor/optical/native identity missing or downed');
  if(binding&&(binding.generation!==id.generation||binding.localId!==id.localId||binding.life!==id.life||binding.roomEpoch!==r.publication.roomEpoch||r.publication.sequence<binding.sequence))throw Error('156 combat lifecycle/publication changed');binding={...id,roomEpoch:r.publication.roomEpoch,sequence:r.publication.sequence};return r;};
 const settled=async()=>{
  const until=Math.min(deadline,Date.now()+1500);let previous=null,last=null,mark=null;
  while(Date.now()<until){const r=await checked();last=r;
   if(!r.enemy||r.enemy.hp<=0||!r.enemy.visible||!r.enemy.fireClear)return r;
   mark??={at:r.at,seq:r.seq,publication:r.publication};const proof=acceptedAim156(r),ray=r.look.cameraRay,old=previous?.look.cameraRay;
   const fresh=proof.packet&&proof.packet.at>=mark.at&&proof.packet.input.seq>mark.seq&&r.publication.sequence>mark.publication.sequence;
   const stable=old&&ray.frameClock>old.frameClock&&Math.abs(wrap(ray.yaw-old.yaw))<=.002&&Math.abs(ray.pitch-old.pitch)<=.002;
   if(proof.accepted&&stable&&fresh){(record.aimSettlements??=[]).push({mark,tick:r.tick,publication:r.publication,frameClock:ray.frameClock,priorFrameClock:old.frameClock,packet:proof.packet,actorAim:{yaw:r.actor.aimYaw,pitch:r.actor.aimPitch,lastInput:r.actor.lastInput},look:r.look});return r;}
   previous=r;await page.waitForTimeout(40);
  }
  record.aimSettlementFailure={last,proof:last?acceptedAim156(last):null};throw Error('156 current released optical frame/successful-send/native gun ACK did not settle within original1.5s delivery bound');
 };
 const pulse=async(command,before)=>{
  // ONE finite ordinary key operation completes before expensive observation.
  try{await page.keyboard.press(command.key,{delay:command.requestedMs});}finally{await page.keyboard.up(command.key);}
  const after=await settled(),down=after.controlEvents.find(e=>e.at>=before.at&&e.code===command.key&&e.kind==='keydown'),up=down&&after.controlEvents.find(e=>e.at>=down.at&&e.code===command.key&&e.kind==='keyup');
  const moved=command.axis==='yaw'?wrap(after.look.yaw-before.look.yaw):after.look.pitch-before.look.pitch;
  if(!down||!up||Math.sign(moved)!==Math.sign(command.error)||after.look.cameraRay.frameClock<=before.look.cameraRay.frameClock){record.lookDeliveryFailure={command,before,after,down,up};throw Error('156 actual public look edge/released response missing; STOP');}
  (record.lookPulses??=[]).push({command,actualEdges:{down,up,heldMs:up.at-down.at},before:{tick:before.tick,frameClock:before.look.cameraRay.frameClock,look:before.look},after:{tick:after.tick,frameClock:after.look.cameraRay.frameClock,look:after.look},moved});return after;
 };
 return {settled,pulse};
}
