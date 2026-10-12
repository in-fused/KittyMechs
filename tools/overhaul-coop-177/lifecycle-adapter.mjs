/** Detached public reads only. One exact local identity binds each moveTo call. */
export function lifecyclePage177(page,name,guard,evidence){
 let binding=null,lastAt=-Infinity;
 const reset=()=>{binding=null;lastAt=-Infinity;};
 const identityEqual=(a,b)=>a.generation===b.generation&&a.localId===b.localId&&a.life===b.life;
 const evaluate=async()=>{
  guard();const r=await page.evaluate(async name=>{
   const d=window.kittyMechDebug,i=await d.input(),s=d.snapshot(),a=s.actors.find(a=>a.name===name),sent=i.lastSent,transport=d.transport?.();
   return {snapshot:s,at:i.at,seq:i.seq,tick:s.tick,time:s.time,room:s.room,publication:s.publication,
    actor:a?{id:a.id,position:a.position,velocity:a.velocity,grounded:a.grounded,hp:a.hp,maxHp:a.maxHp,hurtAt:a.hurtAt,lastInput:a.lastInput,nativeStepTick:a.nativePose?.nativeStepTick,nativeHullPosition:a.nativePose?.hull.position,downed:a.downed}:null,
    keys:i.keys,current:i.input,sent:i.sent,controlEvents:i.controlEvents,camera:d.camera(),browser:i.browser,
    identity:{generation:sent?.generation,localId:sent?.localId,life:a?.jumpEpoch,sendLife:sent?.input.jumpEpoch},ready:s.mode==='coop'&&s.coop?.status==='active'&&!!a&&a.hp>0&&!a.downed,transport};
  },name);
  const id=r.identity;
  if(!r.ready||r.transport?.connection==='Disconnected'||r.transport?.error||!r.actor||!Number.isSafeInteger(id.generation)||id.generation<0||id.localId!==r.actor.id||!Number.isSafeInteger(id.life)||id.life!==id.sendLife||!Number.isFinite(r.at)||r.at<lastAt){evidence.failureReceipt={kind:'116_LOCAL_READINESS_OR_IDENTITY_FAILURE',name,binding,receipt:r};throw Error(name+'116 local actor/generation/life/readiness changed or fresh successful-send identity unavailable');}
  if(binding&&!identityEqual(binding,id)){evidence.failureReceipt={kind:'116_LOCAL_LIFECYCLE_CHANGED_DURING_MOVE',name,binding,receipt:r};throw Error(name+'116 life/generation/local actor changed during movement/ACK/rest');}
  binding??={generation:id.generation,localId:id.localId,life:id.life};lastAt=r.at;
  // Historical ring rows cannot qualify this scope's movement or neutral proof.
  // Preserve them separately; no sequence, actor or native field is rewritten.
  r.excludedHistoricalSends=r.sent.filter(x=>x.generation!==binding.generation||x.localId!==binding.localId||x.input.jumpEpoch!==binding.life);
  r.sent=r.sent.filter(x=>x.generation===binding.generation&&x.localId===binding.localId&&x.input.jumpEpoch===binding.life);
  return r;
 };
 return {reset,page:new Proxy(page,{get(target,key){if(key==='evaluate')return evaluate;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}})};
}




