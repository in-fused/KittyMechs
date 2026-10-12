import {geometry201,certify201} from './planner.mjs';
import {validateInteractionSeparation201} from './interaction-separation.mjs';
/** A current-pose certificate; no coordinate equality or drift epsilon. */
export function certifyCurrentOccupancy201(token,s,target){
 const a=s.actors.find(a=>a.name===token.active);
 if(!a||!target||![target.x,target.z].every(Number.isFinite))throw Error('201 actual active actor/finite target unavailable');
 let certificates;
 if(token.separation)certificates=validateInteractionSeparation201(token.separation,s,target);
 else{const g=geometry201(s,a.id);certificates={origin:certify201(g,a.position,a.position),corridor:certify201(g,a.position,target),endpoint:certify201(g,target,target,{endpoint:true})};}
 const invalid=Object.values(certificates).find(c=>c&&typeof c==='object'&&c.clear===false);
 const receipt={tick:s.tick,publication:s.publication,active:{id:a.id,life:a.jumpEpoch,position:{...a.position}},target:{...target},parked:s.actors.filter(q=>token.bindings.some(b=>b.id===q.id)&&q.id!==a.id).map(q=>({id:q.id,life:q.jumpEpoch,enabled:q.nativePose?.enabled,hp:q.hp,position:{...q.position},velocity:{...q.velocity}})),certificates};
 if(invalid){const error=Error('201 current actual occupied geometry lost corridor/complete arrival clearance');error.rebindRequired201=true;error.geometryReceipt201=receipt;throw error;}return receipt;
}
