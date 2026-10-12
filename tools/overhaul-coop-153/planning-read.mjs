import {groundGeometry138,groundPointClear138,planGroundPath138,segmentClear138} from './exposure-planner.mjs';
import {createHash} from 'node:crypto';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const geometryReceipt=g=>({blocks:g.blocks.length,blocksSha256:createHash('sha256').update(JSON.stringify(g.blocks)).digest('hex'),propChunks:[...g.props].map(([chunk,props])=>({chunk,count:props.length,sha256:createHash('sha256').update(JSON.stringify(props)).digest('hex')}))});
export function createPlanningRead151(observed,name,guard=()=>{}){
 guard();const snapshot=structuredClone(observed.snapshot),actor=snapshot?.actors.find(a=>a.name===name),yaw=observed.camera?.movementYaw;
 const sent=observed.input?.lastSent;
 if(!actor||actor.hp<=0||actor.downed||!actor.grounded||!Number.isFinite(yaw)||!snapshot.publication||!sent||!Number.isSafeInteger(sent.generation)||sent.localId!==actor.id||sent.input?.jumpEpoch!==actor.jumpEpoch||observed.transport?.error||observed.transport?.connection==='Disconnected')throw Error('151 current admitted grounded pilot/publication/yaw/send identity missing');
 const g=groundGeometry138(snapshot);g.moverId=actor.id;g.parked=snapshot.actors;g.movementYaw=yaw;
 const read={tick:snapshot.tick,time:snapshot.time,seed:snapshot.seed,room:snapshot.room,publication:snapshot.publication,name,actor:structuredClone(actor),identity:{generation:sent.generation,localId:sent.localId,life:actor.jumpEpoch},movementYaw:yaw,occupancy:snapshot.actors.filter(a=>a.id!==actor.id).map(a=>({id:a.id,bot:a.bot,hp:a.hp,position:a.position,velocity:a.velocity,chassis:a.chassis,role:a.role})),structures:snapshot.structures,cover:snapshot.cover,ruins:snapshot.ruins??[]};
 const route=(target,margin=1.1)=>{guard();const path=planGroundPath138(g,actor.position,target,{margin}),rejection=structuredClone(g.rejection);
  // Diagnostic classification never authorizes a route without live actors.
  let staticTargetClear=null,staticBlocker=null;if(!path){const parked=g.parked;g.parked=[];staticTargetClear=groundPointClear138(g,target,margin);staticBlocker=structuredClone(g.lastBlock);g.parked=parked;}
  return {contract:'151_ONE_ADMITTED_READ_ALL_CURRENT_OCCUPANCY',read,target:{...target},arrival:margin,path,rejection,staticTargetClear,staticBlocker,geometry:geometryReceipt(g)};};
 const segment=(to,margin=1.1)=>{guard();const clear=segmentClear138(g,actor.position,to,margin);return {read,to,margin,clear,blocker:structuredClone(g.lastBlock),geometry:geometryReceipt(g)};};
 return {snapshot,actor,read,route,segment};
}
export function chooseStage151(current,objective,{reach=4,guard=()=>{},now=Date.now}={}){
 const began=now(),radius=Math.min(3,reach-1.1-.2),points=[{x:objective.x,z:objective.z}],assessed=[];
 for(const r of [radius,radius*.5])for(let i=0;i<16;i++)points.push({x:objective.x+r*Math.cos(i*Math.PI/8),z:objective.z+r*Math.sin(i*Math.PI/8)});
 points.sort((a,b)=>distance(a,current.actor.position)-distance(b,current.actor.position));
 for(const point of points){guard();if(now()-began>2000)return {point:null,path:null,read:current.read,objective,reach,assessed,rejection:{branch:'STAGE_CPU_BOUND'}};
  const plan=current.route(point);assessed.push({point,path:plan.path,rejection:plan.rejection,staticTargetClear:plan.staticTargetClear,staticBlocker:plan.staticBlocker});if(plan.path)return {...plan,point,objective,reach,worstArrivalDistance:distance(point,objective)+1.1,geometryTick:current.read.tick,assessed};
 }
 return {point:null,path:null,read:current.read,objective,reach,assessed,rejection:{branch:'NO_ADMITTED_STAGE'}};
}
