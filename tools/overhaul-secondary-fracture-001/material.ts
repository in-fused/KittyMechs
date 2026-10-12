import {BONDED_SOURCE_ID,compileBondedMaterial,bondedComponents,type MaterialPose} from '../../shared/overhaulBondedMaterial';
import type {CityBlock} from '../../shared/cityDistrict';
import type {Vec3} from '../../shared/types';

export const SECONDARY_VERSION='spawn-west-intrinsic-cleavage-1' as const;
export const SECONDARY_PARENT=6;
export const SECONDARY_DENSITY=1800;
export const SECONDARY_WORK_PER_AREA=1500;
export const SECONDARY_CAPACITY=1612.5; //1.075m² through-thickness plane, authored gameJ.
export const SECONDARY_MATERIAL_COLLIDERS=17;
export const SECONDARY_COMBINED_ACTIVE=18; //17 material owners + one retained whole column.
export interface ChildDefinition {id:'6:a'|'6:b';parent:6;half:Vec3;offset:Vec3;volume:number;mass:number;}
export interface ChildPose {id:ChildDefinition['id'];position:Vec3;rotation:MaterialPose['rotation'];settled:boolean;revision:number;supportKey:string|null;}
export interface SecondaryState {version:typeof SECONDARY_VERSION;source:typeof BONDED_SOURCE_ID;revision:number;interleafStrengths:number[];primary:MaterialPose[];intrinsic:{parent:6;capacity:typeof SECONDARY_CAPACITY;remaining:number;split:boolean;children:ChildPose[]};}
const finite=(v:Vec3)=>Object.values(v).every(Number.isFinite);
export function compileSecondary(source:CityBlock){
 const primary=compileBondedMaterial(source),leaf=primary.leaves[SECONDARY_PARENT];
 const children:ChildDefinition[]=[{id:'6:a',parent:6,half:{x:.1,y:leaf.half.y,z:leaf.half.z},offset:{x:-.1,y:0,z:0},volume:.215,mass:387},{id:'6:b',parent:6,half:{x:.1,y:leaf.half.y,z:leaf.half.z},offset:{x:.1,y:0,z:0},volume:.215,mass:387}];
 return{version:SECONDARY_VERSION,primary,children,plane:{normal:{x:1,y:0,z:0},center:{x:0,y:0,z:0},half:{x:0,y:leaf.half.y,z:leaf.half.z},area:1.075},capacity:SECONDARY_CAPACITY,density:SECONDARY_DENSITY,maxDepth:1,materialColliderLimit:17,combinedActiveLimit:18};
}
/** One real local hit consumes irreversible intrinsic work. Direction and actual
 * contact normal determine incidence; distance to the finite internal rectangle
 * gives the same finite weapon footprint as the primary authored material. */
export function planSecondaryHit(remaining:number,point:Vec3,incoming:Vec3,normal:Vec3,weapon:'pulse'|'rocket',budget:number){
 if(!Number.isFinite(remaining)||remaining<0||remaining>SECONDARY_CAPACITY||!finite(point)||!finite(incoming)||!finite(normal)||!Number.isFinite(budget)||budget<=0)throw Error('Invalid intrinsic cleavage hit');
 const n=Math.hypot(incoming.x,incoming.y,incoming.z),nn=Math.hypot(normal.x,normal.y,normal.z);if(n<1e-8||nn<1e-8)throw Error('Missing actual hit direction/normal');
 const incidence=Math.max(0,-(incoming.x*normal.x+incoming.y*normal.y+incoming.z*normal.z)/(n*nn)),radius=weapon==='rocket'?2.5:.9;
 const distance=Math.hypot(Math.abs(point.x),Math.max(0,Math.abs(point.y)-.5375),Math.max(0,Math.abs(point.z)-.5)),locality=Math.max(0,1-distance/radius)**2;
 const available=budget*.6*incidence**2*locality,work=Math.min(remaining,available),next=remaining-work;
 return{remaining:next<1e-10?0:next,work,kineticBudget:budget-work,incidence,locality,distance,available};
}
/** New version resolves child solids from local source definitions, never from
 * sender dimensions. Presentation must clip BOTH halves of the original leaf. */
export function secondaryPresentationCatalog(source:CityBlock){const c=compileSecondary(source),parent=c.primary.leaves[6];return{version:SECONDARY_VERSION,source:source.id,originalLeafCount:16,physicalOwnerMaximum:17,children:c.children.map(d=>({...d,sourceClip:{center:{x:parent.offset.x+d.offset.x,y:parent.offset.y,z:parent.offset.z},half:d.half},originalModule:source.id,material:source.material,retireParentOnlyWhenBothChildrenEnabled:true})),rendered:false,guestIntegrated:false};}
export function parseSecondaryState(value:unknown,source:CityBlock,previous?:SecondaryState):SecondaryState|null {try{return parseSecondaryChecked(value,source,previous);}catch{return null;}}
function parseSecondaryChecked(value:unknown,source:CityBlock,previous?:SecondaryState):SecondaryState|null {
 if(!value||typeof value!=='object')return null;const v=value as SecondaryState,c=compileSecondary(source),capacities=c.primary.bonds.map(b=>b.capacity);
 if(v.version!==SECONDARY_VERSION||v.source!==BONDED_SOURCE_ID||!Number.isSafeInteger(v.revision)||v.revision<0||previous&&v.revision<previous.revision||!Array.isArray(v.interleafStrengths)||v.interleafStrengths.length!==28||v.interleafStrengths.some((s,i)=>!Number.isFinite(s)||s<0||s>capacities[i]+1e-8||previous&&s>previous.interleafStrengths[i]+1e-8)||!Array.isArray(v.primary)||!v.intrinsic||v.intrinsic.parent!==6||v.intrinsic.capacity!==SECONDARY_CAPACITY||!Number.isFinite(v.intrinsic.remaining)||v.intrinsic.remaining<0||v.intrinsic.remaining>SECONDARY_CAPACITY||previous&&v.intrinsic.remaining>previous.intrinsic.remaining||typeof v.intrinsic.split!=='boolean'||!Array.isArray(v.intrinsic.children))return null;
 if(v.intrinsic.split&&(v.intrinsic.remaining!==0||v.interleafStrengths.some(s=>s!==0))||v.intrinsic.remaining<SECONDARY_CAPACITY&&v.interleafStrengths.some(s=>s!==0)||previous?.intrinsic.split&&!v.intrinsic.split)return null;
 const seen=new Set<number>();for(const p of v.primary){if(!p||!Number.isInteger(p.id)||!Array.isArray(p.leaves)||!p.leaves.length||p.id!==Math.min(...p.leaves)||p.leaves.some(l=>!Number.isInteger(l)||l<0||l>15||seen.has(l))||!finite(p.position)||!Object.values(p.rotation).every(Number.isFinite)||Math.abs(Math.hypot(...Object.values(p.rotation))-1)>.0001||typeof p.attached!=='boolean'||typeof p.settled!=='boolean'||p.attached&&!p.settled||!Number.isSafeInteger(p.revision)||p.revision<0||p.revision>v.revision)return null;for(const l of p.leaves)seen.add(l);}
 if(v.intrinsic.split){if(seen.has(6)||v.intrinsic.children.length!==2)return null;seen.add(6);for(const d of c.children){const matches=v.intrinsic.children.filter(p=>p.id===d.id);if(matches.length!==1)return null;const p=matches[0],old=previous?.intrinsic.children.find(ch=>ch.id===d.id);if(!finite(p.position)||!Object.values(p.rotation).every(Number.isFinite)||Math.abs(Math.hypot(...Object.values(p.rotation))-1)>.0001||typeof p.settled!=='boolean'||!Number.isSafeInteger(p.revision)||p.revision<0||p.revision>v.revision||old&&p.revision<old.revision||(p.supportKey!==null&&typeof p.supportKey!=='string')||p.settled!==(p.supportKey!==null)||p.supportKey===`bonded:${BONDED_SOURCE_ID}:leaf:6`)return null;}}else if(v.intrinsic.children.length)return null;
 if(seen.size!==16||v.primary.reduce((n,p)=>n+p.leaves.length,0)+v.intrinsic.children.length>17)return null;
 const topology=bondedComponents(v.interleafStrengths,c.primary.bonds,true).filter(g=>!v.intrinsic.split||!g.leaves.includes(6));if(topology.length!==v.primary.length||topology.some(g=>!v.primary.some(p=>p.id===g.id&&p.attached===g.attached&&JSON.stringify(p.leaves)===JSON.stringify(g.leaves))))return null;
 if(previous?.revision===v.revision&&(JSON.stringify(previous.interleafStrengths)!==JSON.stringify(v.interleafStrengths)||previous.intrinsic.remaining!==v.intrinsic.remaining||previous.intrinsic.split!==v.intrinsic.split||JSON.stringify(previous.primary.map(p=>({id:p.id,leaves:p.leaves,attached:p.attached,settled:p.settled,revision:p.revision})))!==JSON.stringify(v.primary.map(p=>({id:p.id,leaves:p.leaves,attached:p.attached,settled:p.settled,revision:p.revision})))||JSON.stringify(previous.intrinsic.children.map(p=>({id:p.id,settled:p.settled,revision:p.revision,supportKey:p.supportKey})))!==JSON.stringify(v.intrinsic.children.map(p=>({id:p.id,settled:p.settled,revision:p.revision,supportKey:p.supportKey})))))return null;
 return structuredClone(v);
}
