const keys=['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft'];
const speed=a=>Math.hypot(a.velocity.x,a.velocity.z);
const positionEqual=(a,b)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
const life=a=>({id:a.id,life:a.jumpEpoch});
export function proveNeutral173(observed,name,settled){
 const s=observed.snapshot,a=s.actors.find(a=>a.name===name),i=observed.input,p=settled?.neutral,id=i?.lastSent;
 if(!a||a.hp<=0||a.downed||!a.grounded||speed(a)>.12||!p||!id||p.generation!==id.generation||p.localId!==a.id||p.input.jumpEpoch!==a.jumpEpoch||id.localId!==a.id||id.input.jumpEpoch!==a.jumpEpoch||a.lastInput<p.input.seq||i.input.forward!==0||i.input.strafe!==0||i.input.fire||i.input.interact||i.input.climb||i.keys.some(k=>keys.includes(k))||!settled.rest||settled.rest.tick> s.tick||!s.publication||observed.transport?.error||observed.transport?.connection==='Disconnected')throw Error('173 parked public neutral/current life/native ACK/rest proof missing');
 return {name,...life(a),generation:id.generation,position:{...a.position},hp:a.hp,room:s.room,epoch:s.publication.roomEpoch,tick:s.tick,sequence:s.publication.sequence,packet:p,rest:settled.rest};
}
export function validateToken173(token,s){
 if(!token||token.state!=='COMMITTED'||s.room!==token.room||s.publication?.roomEpoch!==token.epoch||s.tick<token.tick||s.publication.sequence<token.sequence)throw Error('173 active motion token/fresh room publication required');
 for(const r of token.bindings){const a=s.actors.find(a=>a.id===r.id);if(!a||a.jumpEpoch!==r.life||a.hp<=0||a.downed||!a.grounded)throw Error('173 roster/life/living state invalidates motion commitment');if(a.hp!==r.hp)throw Error('173 damage invalidates motion commitment; release and STOP');if(r.name!==token.active&&(speed(a)>.12||!positionEqual(a.position,r.position)))throw Error('173 parked mate displacement invalidates motion commitment');}
 return token;
}
/** One public movement owner. No next goal is committed or reserved here. */
export function createMotionScheduler173({pilots,controller,read,release,guard,evidence}){
 let token=null,serial=0;
 const page=(raw,name)=>new Proxy(raw,{get(target,key){if(key==='keyboard')return new Proxy(target.keyboard,{get(k,method){const value=Reflect.get(k,method);if(typeof value!=='function')return value;return (...args)=>{if(['down','press'].includes(method)&&token&&token.active!==name)throw Error('173 parked pilot public input ownership violation');return value.apply(k,args);};}});const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 const run=async(name,goal,action)=>{
  guard();if(token)throw Error('173 concurrent squad movement forbidden');const ps=pilots(),active=ps.find(p=>p.name===name);if(!active||ps.length!==2)throw Error('173 exact two-pilot roster required');token={serial:++serial,active:name,state:'PARKING',goal:structuredClone(goal),nextGoal:'UNCOMMITTED',peerFutureArrival:0};
  const receipt=token;(evidence.motion173??=[]).push(receipt);
  try{for(const p of ps)await release(p.page);const settled=new Map();for(const p of ps)settled.set(p.name,await controller(p.page,p.name).settle());const proofs=[];for(const p of ps)proofs.push(proveNeutral173(await read(p.page),p.name,settled.get(p.name)));
   const fresh=await read(active.page),s=fresh.snapshot;receipt.bindings=proofs.map(p=>{const a=s.actors.find(a=>a.id===p.id);if(!a||a.jumpEpoch!==p.life||a.hp!==p.hp||!positionEqual(a.position,p.position)||speed(a)>.12||s.room!==p.room||s.publication.roomEpoch!==p.epoch||s.tick<p.tick)throw Error('173 one fresh admitted handoff changed parked proof');return {...p,position:{...a.position}};});Object.assign(receipt,{state:'COMMITTED',room:s.room,epoch:s.publication.roomEpoch,tick:s.tick,sequence:s.publication.sequence,activeArrival:1.1,actualHandoff:s.actors.filter(a=>!a.bot)});
   await action(fresh);await release(active.page);receipt.arrival=await controller(active.page,name).settle();validateToken173(receipt,(await read(active.page)).snapshot);receipt.state='RETIRED_ACTUAL_NEUTRAL_ACK_REST';return receipt.arrival;
  }catch(error){receipt.failure=String(error);receipt.state='FIRST_FAILURE_STOP';throw error;}
  finally{for(const p of ps)await release(p.page);token=null;}
 };
 return {page,run,commit:plan=>{if(!token||!plan.path||!plan.endpoint?.clear)throw Error('173 actual-current certified active leg required');token.goal=structuredClone(plan.point??plan.target);token.certificate=plan.endpoint;token.planPublication=plan.read?.publication??plan.publication;},validate:s=>validateToken173(token,s),active:()=>token,reset:()=>{if(token)throw Error('173 cannot reset live motion ownership');}};
}
