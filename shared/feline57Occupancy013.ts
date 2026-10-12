import type {Feline57Packet013,Geometry013,M4_013,Pose013,V3_013} from './feline57Contract013';
import {point013,multiply013,nativeMount013} from './feline57Evaluator013';
export type Region013='body'|'tail'|'fore-claw-reach';
interface Influence013 {joint:number;min:V3_013;max:V3_013;}
export interface OccupancyContributor013 {meshNode:number;region:Region013;weightSumMin:number;weightSumMax:number;influences:Influence013[];sourceOwners:string[];}
export interface OccupancyCatalog013 {schema:'feline57-influence-bounds013';assetSha256:string;contributors:OccupancyContributor013[];numericScope:'double-precision algebra; GPU rounding and native admission not certified';}
function corner(min:V3_013,max:V3_013,i:number):V3_013{return [i&1?max[0]:min[0],i&2?max[1]:min[1],i&4?max[2]:min[2]];}
function box(){return {min:[Infinity,Infinity,Infinity] as V3_013,max:[-Infinity,-Infinity,-Infinity] as V3_013};}
function extend(b:{min:V3_013;max:V3_013},p:V3_013){for(let j=0;j<3;j++){b.min[j]=Math.min(b.min[j],p[j]);b.max[j]=Math.max(b.max[j],p[j]);}}
/** Tool-only preparation from every actual triangle vertex, not four sampled poses.
 * Body excludes explicitly source-owned tail; claw attack has its own articulated region.
 * This catalog bounds a current evaluated pose, not every possible trajectory. */
export function prepareFeline57Occupancy013(packet:Feline57Packet013,geometry:Geometry013):OccupancyCatalog013 {
  if(geometry.assetSha256!==packet.identity.assetSha256)throw Error('OCCUPANCY_ASSET_MISMATCH');const contributors:OccupancyContributor013[]=[];
  for(const p of geometry.primitives){const regions=new Map<Region013,{ids:Set<number>;owners:Set<string>}>();for(let i=0;i<p.indices.length;i+=3){const owner=p.triangleOwners[i/3],keys:Region013[]=owner.startsWith('tail_')?['tail']:['body'];if(/^(FL|FR)_claw/.test(owner))keys.push('fore-claw-reach');for(const region of keys){let r=regions.get(region);if(!r){r={ids:new Set(),owners:new Set()};regions.set(region,r);}r.owners.add(owner);p.indices.slice(i,i+3).forEach(v=>r.ids.add(v));}}
    for(const [region,r]of regions){const influences=new Map<number,Influence013>();let min=Infinity,max=-Infinity;for(const id of r.ids){const v=p.vertices[id];if(p.skin===null){let b=influences.get(-1);if(!b){b={joint:-1,...box()};influences.set(-1,b);}extend(b,v.position);min=1;max=1;continue;}if(!v.weights||!v.joints)throw Error('MISSING_WEIGHTS');const sum=v.weights.reduce((a,b)=>a+b,0);if(!(sum>0))throw Error('ZERO_SKIN_SUM');min=Math.min(min,sum);max=Math.max(max,sum);const s=packet.skins[p.skin];for(let k=0;k<4;k++)if(v.weights[k]>0){const index=v.joints[k],joint=s.joints[index];let b=influences.get(joint);if(!b){b={joint,...box()};influences.set(joint,b);}extend(b,point013(s.inverseBinds[index],v.position));}}
      contributors.push({meshNode:p.meshNode,region,weightSumMin:min,weightSumMax:max,influences:[...influences.values()],sourceOwners:[...r.owners]});
    }
  }return {schema:'feline57-influence-bounds013',assetSha256:geometry.assetSha256,contributors,numericScope:'double-precision algebra; GPU rounding and native admission not certified'};
}
/** Bounded influence boxes, no dense vertices in native/render frame loop.
 * Positive weighted average lies in convex union of current influence boxes;
 * raw sum interval and (1-sum)*meshOrigin preserve homogeneous affine semantics. */
export function evaluateFeline57Occupancy013(packet:Feline57Packet013,catalog:OccupancyCatalog013,pose:Pose013){
  if(catalog.assetSha256!==packet.identity.assetSha256)throw Error('OCCUPANCY_IDENTITY');const bounds:Partial<Record<Region013,{min:V3_013;max:V3_013}>>={};let transformedCorners=0;
  for(const c of catalog.contributors){const q=box();for(const i of c.influences){const m:M4_013=pose.world[i.joint<0?c.meshNode:i.joint];for(let k=0;k<8;k++){extend(q,point013(m,corner(i.min,i.max,k)));transformedCorners++;}}const b=bounds[c.region]??(bounds[c.region]=box()),m=pose.world[c.meshNode],origin:V3_013=[m[12],m[13],m[14]];for(const sum of [c.weightSumMin,c.weightSumMax])for(let k=0;k<8;k++){const p=corner(q.min,q.max,k);extend(b,nativeMount013(p.map((x,j)=>origin[j]+sum*(x-origin[j])) as V3_013));}}
  return {status:'CURRENT_POSE_CONSERVATIVE_DOUBLE_BOUNDS_NOT_NATIVE_ADMITTED' as const,frame:'native-actor-local-metres-Yup-RyPi-mounted' as const,bounds,transformedCorners};
}
export interface PhysicalProfile013 {profileId:string;assetSha256:string;packetSha256:string;floorDatum:{carrierYOffset:-1;mountYawRadians:number;scale:0.8};body:{kind:'yaw-cuboid';min:V3_013;max:V3_013;clipFamily:string[];coverage:'sampled-only'|'externally-qualified-family';qualificationId:string|null};attack:{kind:'articulated-source-claw-facets';sourceBoneNames:string[]};}
/** Explicit future consumer seam; sampled evidence cannot become a body collider.
 * A supplied qualification ID is an external registry assertion, not a certificate created here. */
export function physicalShapeDescriptor013(p:PhysicalProfile013){if(p.body.coverage!=='externally-qualified-family'||!p.body.qualificationId)throw Error('UNQUALIFIED_BODY_ENVELOPE');if(p.body.min.some((x,i)=>!Number.isFinite(x)||!Number.isFinite(p.body.max[i])||p.body.max[i]<=x))throw Error('INVALID_BODY_ENVELOPE');return {kind:'cuboid' as const,center:p.body.min.map((x,i)=>(x+p.body.max[i])/2) as V3_013,halfExtents:p.body.min.map((x,i)=>(p.body.max[i]-x)/2) as V3_013,yawOwnership:'same accepted actor yaw; path clearance separately required' as const};}
/** Imported for offline unit checks of affine composition; no native shape creation. */
export const composeOccupancyMatrices013=multiply013;
