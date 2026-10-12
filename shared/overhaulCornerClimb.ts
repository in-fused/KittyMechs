import {faceCoordinates,facePoint,type BuildingFace} from './buildingSurfaces';
import type {Vec3} from './types';

/** Only identities and bounded path distance cross the network. Geometry is
 * derived again from the current admitted faces; never accept a sender plane. */
export type OverhaulCornerChoices=readonly [0|1,0|1,0|1,0|1];
export interface OverhaulCornerState {from:string;to:string;side:-1|1;distance:number;radius:number;height:number;startedAt:number;pawFaces?:OverhaulCornerChoices;}
export interface OverhaulCornerPlan {from:BuildingFace;to:BuildingFace;side:-1|1;vertex:Vec3;radius:number;approach:number;arc:number;length:number;}
export interface OverhaulCornerSample {position:Vec3;normal:Vec3;contact:Vec3;stage:'approach'|'arc'|'exit';angle:number;distance:number;}
/** Existing authored Cling is the stationary support stance. Freeze-height
 * Climb can leave an airborne paw forever. Blend on the straight approach and
 * release at either straight endpoint; all intermediate poses require proof. */
export function overhaulCornerHoldBlend(state:OverhaulCornerState,time:number):number {
  const length=2*(state.radius-.01)+Math.PI*state.radius/2,t=Math.max(0,Math.min(1,(time-state.startedAt)/.16)),approach=Math.max(0,Math.min(1,state.distance/.224)),release=Math.max(0,Math.min(1,(length-state.distance)/.224));
  // A reversed approach must regain its unchanged ordinary source pose before
  // removing corner state. Time alone keeps Cling fully weighted at distance0.
  return t*t*(3-2*t)*approach*approach*(3-2*approach)*release*release*(3-2*release);
}
const eps=1e-5;
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.z*b.z;
const separation=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

/** Adjacent actual exterior rectangles, not arbitrary nearby walls. Excludes
 * ruins and portals with disjoint/non-rectangular ownership. Native callbacks
 * remain necessary to prove every paw and the full swept carrier. */
export function overhaulCornerPlan(from:BuildingFace,to:BuildingFace,side:-1|1,radius:number):OverhaulCornerPlan|null {
  if(from.id===to.id||from.buildingId!==to.buildingId||from.kind!==to.kind||from.id.startsWith('ruin-face:')||to.id.startsWith('ruin-face:')||!from.supportingBlockIds.length||!to.supportingBlockIds.length||!Number.isFinite(radius)||radius<=0||Math.abs(dot(from.normal,to.normal))>eps||dot(from.tangent,to.normal)*side<1-eps)return null;
  const vertex=facePoint(from,side*from.width/2,0),q=faceCoordinates(to,vertex);
  if(Math.abs(q.normal)>eps||Math.abs(Math.abs(q.tangent)-to.width/2)>eps||separation(vertex,facePoint(to,q.tangent,0))>eps||Math.min(from.topY,to.topY)<=Math.max(from.minY,to.minY)||from.width/2<radius+.08||to.width/2<radius+.08)return null;
  // Radius is the normal carrier standoff (native hull radius + .09).
  // Entry/exit tangent clearance is hull radius + .08, as in ordinary climb.
  const approach=radius-.01,arc=Math.PI*radius/2;
  return{from,to,side,vertex,radius,approach,arc,length:approach*2+arc};
}
export function overhaulCornerCandidates(from:BuildingFace,faces:readonly BuildingFace[],side:-1|1,radius:number):OverhaulCornerPlan[]{return faces.map(to=>overhaulCornerPlan(from,to,side,radius)).filter((p):p is OverhaulCornerPlan=>!!p).sort((a,b)=>a.to.id.localeCompare(b.to.id));}
export function overhaulCornerSample(plan:OverhaulCornerPlan,distance:number,height:number):OverhaulCornerSample {
  const d=clamp(distance,0,plan.length),angle=clamp((d-plan.approach)/plan.radius,0,Math.PI/2),ca=Math.cos(angle),sa=Math.sin(angle),normal={x:plan.from.normal.x*ca+plan.to.normal.x*sa,y:0,z:plan.from.normal.z*ca+plan.to.normal.z*sa};
  const position={x:plan.vertex.x+normal.x*plan.radius,y:height,z:plan.vertex.z+normal.z*plan.radius};
  if(d<plan.approach){position.x-=plan.from.tangent.x*plan.side*(plan.approach-d);position.z-=plan.from.tangent.z*plan.side*(plan.approach-d);}
  if(d>plan.approach+plan.arc){position.x-=plan.from.normal.x*(d-plan.approach-plan.arc);position.z-=plan.from.normal.z*(d-plan.approach-plan.arc);}
  return{position,normal,contact:{x:position.x-normal.x*plan.radius,y:height+.4,z:position.z-normal.z*plan.radius},stage:d<plan.approach?'approach':d<=plan.approach+plan.arc?'arc':'exit',angle,distance:d};
}
/** Closest finite plane target, inset by the actual transformed paw footprint.
 * The caller computes halfFootprint from decoded corners in this face frame,
 * retains fixed limb lengths, and queries all five resulting real points. */
export function overhaulCornerPawTarget(face:BuildingFace,paw:Vec3,pad:number,halfFootprint:number):Vec3|null {
  if(![paw.x,paw.y,paw.z,pad,halfFootprint].every(Number.isFinite)||pad<0||halfFootprint<0||halfFootprint+.004>face.width/2)return null;
  const q=faceCoordinates(face,paw),target=facePoint(face,clamp(q.tangent,-face.width/2+halfFootprint+.004,face.width/2-halfFootprint-.004),paw.y);
  target.x+=face.normal.x*pad;target.z+=face.normal.z*pad;return target;
}
export interface OverhaulCornerPawRequest {face:BuildingFace;index:0|1;target:Vec3;pad:number;travel:number;}
/** Native decoder and guest renderer call this with the same eight shipping
 * paw corners relative to the current authored paw pivot. Their actual smooth
 * world orientation is retained; these are bounds, never substitute geometry. */
export function overhaulCornerPawRequests(faces:readonly [BuildingFace,BuildingFace],paw:Vec3,offsets:readonly Vec3[]):OverhaulCornerPawRequest[] {
  if(offsets.length!==8||offsets.some(p=>![p.x,p.y,p.z].every(Number.isFinite)))return[];
  const results:OverhaulCornerPawRequest[]=[];
  for(const index of [0,1] as const){const face=faces[index];let pad=0,half=0;for(const offset of offsets){pad=Math.max(pad,-dot(offset,face.normal));half=Math.max(half,Math.abs(dot(offset,face.tangent)));}pad+=.004;
    const target=overhaulCornerPawTarget(face,paw,pad,half);if(target)results.push({face,index,target,pad,travel:Math.hypot(target.x-paw.x,target.y-paw.y,target.z-paw.z)});
  }return results.sort((a,b)=>a.travel-b.travel||a.index-b.index);
}
/** The distance increment is bounded by commanded speed. A blocked/unsupported
 * prospective pose must leave the previously accepted state untouched. Reverse
 * input retraces the same swept path; releasing strafe freezes distance. */
export function overhaulCornerAdvance(plan:OverhaulCornerPlan,state:OverhaulCornerState,strafe:number,dt:number,speed=1.4):number {
  if(!Number.isFinite(strafe)||!Number.isFinite(dt)||dt<=0||dt>.1||!Number.isFinite(speed)||speed<0)return state.distance;
  return clamp(state.distance+clamp(strafe,-1,1)*plan.side*speed*dt,0,plan.length);
}
/** Re-derive and validate finite guest state. Actual native contact admission
 * is separate: this function never turns a descriptor into a grip receipt. */
export function parseOverhaulCorner(value:unknown,faces:readonly BuildingFace[],time:number,anchor:string):{state:OverhaulCornerState;plan:OverhaulCornerPlan}|undefined {
  if(!value||typeof value!=='object')return undefined;const v=value as Record<string,unknown>;
  if(v.from!==anchor||typeof v.to!=='string'||v.side!==-1&&v.side!==1||!['distance','radius','height','startedAt'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))||Number(v.radius)<=0||Number(v.radius)>8||Number(v.startedAt)<0||Number(v.startedAt)>time+1e-6)return undefined;
  const from=faces.find(f=>f.id===v.from),to=faces.find(f=>f.id===v.to);if(!from||!to)return undefined;
  const plan=overhaulCornerPlan(from,to,v.side,Number(v.radius));if(!plan||Number(v.distance)<0||Number(v.distance)>plan.length||Number(v.height)<Math.max(from.minY,to.minY)||Number(v.height)>Math.min(from.topY,to.topY))return undefined;
  if(v.pawFaces!==undefined&&(!Array.isArray(v.pawFaces)||v.pawFaces.length!==4||v.pawFaces.some(p=>p!==0&&p!==1)))return undefined;
  return{plan,state:{from:from.id,to:to.id,side:v.side,distance:Number(v.distance),radius:Number(v.radius),height:Number(v.height),startedAt:Number(v.startedAt),...(v.pawFaces!==undefined?{pawFaces:[...v.pawFaces as number[]] as unknown as OverhaulCornerChoices}:{})}};
}

export interface OverhaulCornerReceipt {position:Vec3;gripMask:number;pawHandles:readonly (readonly number[])[];}
export interface OverhaulCornerProof {
  /** Full production collision shape, nearest-hit ordinary world filter. No
   * building exclusion or replacement hull. Return its realized endpoint. */
  sweep(from:Vec3,to:Vec3):Vec3;
  /** Same decoded pose, fixed-length IK, five owned native queries per planted
   * paw. A lost footprint or nonfinite target returns null immediately. */
  grip(sample:OverhaulCornerSample):OverhaulCornerReceipt|null;
}
/** One atomic accepted step. Intervening samples cover the convex arc; the
 * caller commits only the final proof. Nothing here writes a body transform. */
export function proveOverhaulCornerStep(plan:OverhaulCornerPlan,state:OverhaulCornerState,next:number,proof:OverhaulCornerProof):OverhaulCornerReceipt|null {
  if(!Number.isFinite(next)||next<0||next>plan.length||Math.abs(next-state.distance)>.14+eps)return null;
  const steps=Math.max(1,Math.ceil(Math.abs(next-state.distance)/.012)),start=overhaulCornerSample(plan,state.distance,state.height);let position=start.position,receipt:OverhaulCornerReceipt|null=null;
  for(let i=1;i<=steps;i++){
    const sample=overhaulCornerSample(plan,state.distance+(next-state.distance)*i/steps,state.height),realized=proof.sweep(position,sample.position);
    if(![realized.x,realized.y,realized.z].every(Number.isFinite)||Math.hypot(realized.x-sample.position.x,realized.y-sample.position.y,realized.z-sample.position.z)>.002)return null;
    receipt=proof.grip(sample);if(!receipt||![receipt.position.x,receipt.position.y,receipt.position.z].every(Number.isFinite)||Math.hypot(receipt.position.x-realized.x,receipt.position.y-realized.y,receipt.position.z-realized.z)>eps||!Number.isInteger(receipt.gripMask)||receipt.gripMask<0||receipt.gripMask>15||count(receipt.gripMask)<2||receipt.pawHandles.length!==4||receipt.pawHandles.some((h,p)=>!!(receipt!.gripMask&(1<<p))!==!!h.length||h.some(handle=>!Number.isFinite(handle)||handle<0)))return null;
    position=realized;
  }return receipt;
}
function count(mask:number){return(mask&1)+((mask>>1)&1)+((mask>>2)&1)+((mask>>3)&1);}
