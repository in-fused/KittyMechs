import {geometry173,certify173,certifyInteractionSeparation173} from './planner.mjs';
import {actorHullRadius} from '../../shared/config.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const staticGeometry=s=>JSON.stringify([s.seed,s.structures,s.cover,s.ruins]);
/** Explicit game interaction departure, never used by ordinary route searches.
 * Native0.05 guard is Simulation.advanceCoop.restore's actual peer spacing.
 * One actual hull-radius centre leg plus full1.1 endpoint disk fits3m phase bound. */
export function planInteractionSeparation173(s,activeName,peerName){
 const a=s.actors.find(a=>a.name===activeName),p=s.actors.find(a=>a.name===peerName);
 if(!a||!p||a.hp<=0||p.hp<=0||a.downed||p.downed||!a.grounded||!p.grounded||actorHullRadius(a)!==1.75||actorHullRadius(p)!==1.75||Math.hypot(a.velocity.x,a.velocity.z)>.12||Math.hypot(p.velocity.x,p.velocity.z)>.12||a.nativePose?.enabled!==true||p.nativePose?.enabled!==true)throw Error('173 separation requires actual two living enabled neutral-rest Pounce pilots');
 const g=geometry173(s,a.id),origin=certifyInteractionSeparation173(g,a.position,a.position),normalOrigin=certify173(g,a.position,a.position);if(!origin.clear)throw Error('173 physical separation origin unsafe');
 if(normalOrigin.clear)return {needed:false,normalOrigin};
 const d=distance(a.position,p.position),step=actorHullRadius(a),target={x:a.position.x+(a.position.x-p.position.x)/d*step,z:a.position.z+(a.position.z-p.position.z)/d*step},physical=certifyInteractionSeparation173(g,a.position,target),endpoint=certify173(g,target,target,{endpoint:true});
 if(!Number.isFinite(d)||d===0||!physical.clear||!endpoint.clear)throw Error('173 bounded physical separation/normal endpoint infeasible');
 return {needed:true,kind:'INTERACTION_SEPARATION',active:activeName,peer:peerName,source:{...a.position},peerPosition:{...p.position},lives:[a.jumpEpoch,p.jumpEpoch],ids:[a.id,p.id],hp:[a.hp,p.hp],normalOrigin,physical,endpoint,target,path:[target],activeArrival:1.1,peerFutureArrival:0,maxTravel:3,oneLeg:true,waypointBudget:{limit:12,used:1,remaining:11},lastRadius:d,staticGeometry:staticGeometry(s),normalTravel:'UNCOMMITTED_UNTIL_ACTUAL_SETTLED_NORMAL_ORIGIN'};
}
export function validateInteractionSeparation173(plan,s,target=plan.target){
 const a=s.actors.find(a=>a.id===plan.ids[0]),p=s.actors.find(a=>a.id===plan.ids[1]);if(!a||!p||a.hp<=0||p.hp<=0||a.downed||p.downed||a.jumpEpoch!==plan.lives[0]||p.jumpEpoch!==plan.lives[1]||a.nativePose?.enabled!==true||p.nativePose?.enabled!==true||!a.grounded||!p.grounded||Math.hypot(p.velocity.x,p.velocity.z)>.12||p.position.x!==plan.peerPosition.x||p.position.y!==plan.peerPosition.y||p.position.z!==plan.peerPosition.z||staticGeometry(s)!==plan.staticGeometry)throw Error('173 separation peer/life/enabled/static geometry changed');
 const radius=distance(a.position,p.position),travel=distance(a.position,plan.source),dx=target.x-a.position.x,dz=target.z-a.position.z;if(radius<plan.lastRadius||travel>plan.maxTravel||distance(a.position,target)>=1.1&&(dx*(a.position.x-p.position.x)+dz*(a.position.z-p.position.z))<0)throw Error('173 nonmonotonic or over3m separation');
 const g=geometry173(s,a.id),physical=certifyInteractionSeparation173(g,a.position,target),endpoint=certify173(g,target,target,{endpoint:true});if(!physical.clear||!endpoint.clear)throw Error('173 current all-occupancy physical sweep/normal endpoint unsafe');plan.lastRadius=radius;return {physical,endpoint,actualRadius:radius,travel};
}
