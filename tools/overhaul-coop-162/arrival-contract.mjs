import {groundGeometry138,groundPointClear138,segmentClear138} from '../overhaul-coop-153/exposure-planner.mjs';
const radius=1.75,arrival=1.1,margin=1.1;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Planner-data reconstruction ONLY of the exact fields saved at the read.
 * This is never a native snapshot admission or actor/state write. */
export function geometryFromRead162(read){
 const s={seed:read.seed,structures:read.structures,cover:read.cover,ruins:read.ruins,actors:[read.actor,...read.occupancy]},g=groundGeometry138(s);
 g.moverId=read.actor.id;g.parked=s.actors;g.movementYaw=read.movementYaw;return g;
}
/** Exact horizontal disk vs original yawed expanded block rectangle.
 * A negative witness vetoes an endpoint; passing this one owner does NOT
 * certify terrain/other solids/props/NPCs or the complete arrival region. */
export function blockArrivalWitness162(block,point){
 const c=Math.cos(block.yaw),n=Math.sin(block.yaw),dx=point.x-block.position[0],dz=point.z-block.position[2],x=dx*c-dz*n,z=dx*n+dz*c,hx=block.halfExtents[0]+radius+margin,hz=block.halfExtents[2]+radius+margin;
 const qx=Math.max(-hx,Math.min(hx,x)),qz=Math.max(-hz,Math.min(hz,z)),near={x:block.position[0]+qx*c+qz*n,z:block.position[2]-qx*n+qz*c},edgeDistance=distance(point,near);
 return {owner:block.id,point,clearance:radius+margin,arrival,edgeDistance,entireDiskOutsideThisOwner:edgeDistance>=arrival,witness:edgeDistance<arrival?near:null};
}
export function assessContinuation162(read,nominal,next,guard=()=>{}){
 guard();if(!read.actor?.grounded||read.actor.hp<=0||read.actor.downed||Math.hypot(read.actor.velocity.x,read.actor.velocity.z)>.12)return {status:'CURRENT_ORIGIN_NOT_SETTLED',path:null,readTick:read.tick};
 const g=geometryFromRead162(read),actual=read.actor.position;
 const currentClear=groundPointClear138(g,actual,margin),currentBlocker=structuredClone(g.lastBlock);
 const nominalClear=groundPointClear138(g,nominal,margin),nominalBlocker=structuredClone(g.lastBlock);
 const nominalSegmentClear=segmentClear138(g,nominal,next,margin),nominalSegmentBlocker=structuredClone(g.lastBlock);
 const actualSegmentClear=segmentClear138(g,actual,next,margin),actualSegmentBlocker=structuredClone(g.lastBlock);
 const arrivalError=distance(actual,nominal),owner=currentBlocker?.owner??actualSegmentBlocker?.owner,block=g.blocks.find(b=>b.id===owner),endpoint=block?blockArrivalWitness162(block,nominal):null;
 return {status:!currentClear?'INFEASIBLE_AT_SAVED_READ':!actualSegmentClear?'CURRENT_SEGMENT_BLOCKED':'FULL_ARRIVAL_REGION_NOT_CERTIFIED',path:null,readTick:read.tick,publication:read.publication,currentOrigin:actual,nominal,next,arrival,margin,nativeHull:radius,arrivalError,arrivalAccepted:arrivalError<arrival,currentClear,currentBlocker,nominalClear,nominalBlocker,nominalSegmentClear,nominalSegmentBlocker,actualSegmentClear,actualSegmentBlocker,endpoint,contract:'No public keys unless current full2.85-clear origin AND complete1.1 arrival region/next corridor certified. Never use margin0 escape.'};
}
