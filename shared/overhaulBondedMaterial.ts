import type {CityBlock} from './cityDistrict';
import type {Vec3} from './types';
export const BONDED_SOURCE_ID='7734:overhaul:spawn-west:facade-west-0-3';
export const BONDED_VERSION='spawn-west-mortar-1' as const;
export const BONDED_FRAME_ID='7734:overhaul:spawn-west:column-2-0';
export const BONDED_ACTIVE_LIMIT=16;
export interface MaterialLeaf {id:number;sourceId:string;offset:Vec3;half:Vec3;canonicalOffset:[number,number,number];}
export interface MaterialBond {id:number;a:number;b:number|null;center:Vec3;normalAxis:0|1|2;half:Vec3;capacity:number;}
export interface MaterialPose {id:number;leaves:number[];position:Vec3;rotation:{x:number;y:number;z:number;w:number};attached:boolean;settled:boolean;revision:number;}
export interface BondedMaterialState {version:typeof BONDED_VERSION;source:string;revision:number;strengths:number[];components:MaterialPose[];}
export function compileBondedMaterial(source:CityBlock){
 if(source.id!==BONDED_SOURCE_ID||source.material!=='brick'||source.halfExtents[0]!==.2||source.halfExtents[1]!==2.15||source.halfExtents[2]!==2)throw Error('Bonded material source contract changed');
 const leaves:MaterialLeaf[]=[],bonds:MaterialBond[]=[];
 for(let row=0;row<4;row++)for(let column=0;column<4;column++){const id=row*4+column;leaves.push({id,sourceId:`${source.id}:masonry:${id}`,offset:{x:0,y:(row-1.5)*1.075,z:column-1.5},half:{x:.2,y:.5375,z:.5},canonicalOffset:[(column-1.5)/4,(row-1.5)/4,0]});}
 const bond=(a:number,b:number|null,center:Vec3,axis:0|1|2,half:Vec3,area:number)=>bonds.push({id:bonds.length,a,b,center,normalAxis:axis,half,capacity:area*1200});
 for(let row=0;row<4;row++)for(let column=0;column<3;column++)bond(row*4+column,row*4+column+1,{x:0,y:(row-1.5)*1.075,z:column-1},2,{x:.2,y:.5375,z:0},.43);
 for(let row=0;row<3;row++)for(let column=0;column<4;column++)bond(row*4+column,(row+1)*4+column,{x:0,y:(row-1)*1.075,z:column-1.5},1,{x:.2,y:0,z:.5},.4);
 // Retained column-2-0 is centered at worldZ32.35, source center31:
 // its actual .6m frontage is [32.05,32.65], not [32.35,32.95].
 for(let row=0;row<4;row++)bond(row*4+3,null,{x:.175,y:(row-1.5)*1.075,z:1.35},0,{x:0,y:.5375,z:.3},.645);
 return{leaves,bonds,totalWork:bonds.reduce((s,b)=>s+b.capacity,0)};
}
export function bondedComponents(strengths:readonly number[],bonds:readonly MaterialBond[],frameAlive:boolean):{id:number;leaves:number[];attached:boolean}[]{
 const parent=Array.from({length:16},(_,i)=>i),find=(i:number):number=>parent[i]===i?i:parent[i]=find(parent[i]);
 for(const b of bonds)if(b.b!==null&&strengths[b.id]>0){const a=find(b.a),c=find(b.b);parent[Math.max(a,c)]=Math.min(a,c);}
 const groups=new Map<number,number[]>();for(let i=0;i<16;i++){const root=find(i),group=groups.get(root)??[];group.push(i);groups.set(root,group);}
 return [...groups].map(([id,leaves])=>({id,leaves,attached:frameAlive&&bonds.some(b=>b.b===null&&strengths[b.id]>0&&leaves.includes(b.a))}));
}
/** Damage is local to actual current hit-owner interfaces. Unspent separation
 * allocation remains kinetic work, including capacity-clamped interfaces. */
export function planBondedHit(strengths:readonly number[],bonds:readonly MaterialBond[],members:ReadonlySet<number>,point:Vec3,weapon:'pulse'|'rocket',budget:number){
 if(!Number.isFinite(budget)||budget<=0)throw Error('Invalid material work');const radius=weapon==='rocket'?2.5:.9;
 const affected=bonds.filter(b=>strengths[b.id]>0&&members.has(b.a)&&(b.b===null||members.has(b.b))).map(b=>{const d=Math.hypot(Math.max(0,Math.abs(point.x-b.center.x)-b.half.x),Math.max(0,Math.abs(point.y-b.center.y)-b.half.y),Math.max(0,Math.abs(point.z-b.center.z)-b.half.z));return{bond:b,weight:Math.max(0,1-d/radius)**2};}).filter(r=>r.weight>0);
 const total=affected.reduce((s,r)=>s+r.weight,0),next=[...strengths];let fractureWork=0;
 for(const r of affected){const used=Math.min(next[r.bond.id],budget*.6*r.weight/total);next[r.bond.id]-=used;if(next[r.bond.id]<1e-10)next[r.bond.id]=0;fractureWork+=used;}
 return{strengths:next,fractureWork,kineticBudget:budget-fractureWork};
}
export function parseBondedMaterial(value:unknown,previous?:BondedMaterialState):BondedMaterialState|null {
 if(!value||typeof value!=='object')return null;const v=value as BondedMaterialState;
 if(v.version!==BONDED_VERSION||v.source!==BONDED_SOURCE_ID||!Number.isSafeInteger(v.revision)||v.revision<0||!Array.isArray(v.strengths)||v.strengths.length!==28||!Array.isArray(v.components)||v.components.length<1||v.components.length>16)return null;
 const capacities=[...Array(12).fill(516),...Array(12).fill(480),...Array(4).fill(774)] as number[];
 if(v.strengths.some((s,i)=>!Number.isFinite(s)||s<0||s>capacities[i]+1e-8||previous&&s>previous.strengths[i]+1e-8)||previous&&v.revision<previous.revision)return null;
 const seen=new Set<number>();for(const p of v.components){if(!p||!Number.isInteger(p.id)||!Array.isArray(p.leaves)||!p.leaves.length||p.id!==Math.min(...p.leaves)||typeof p.attached!=='boolean'||typeof p.settled!=='boolean'||p.attached&&!p.settled||!Number.isSafeInteger(p.revision)||p.revision<0||!p.position||!p.rotation||![...Object.values(p.position),...Object.values(p.rotation)].every(Number.isFinite)||Math.abs(Math.hypot(...Object.values(p.rotation))-1)>.01||p.leaves.some(i=>!Number.isInteger(i)||i<0||i>=16||seen.has(i)))return null;for(const i of p.leaves)seen.add(i);}
 if(seen.size!==16)return null;const topology=bondedComponents(v.strengths,compileBondedMaterial({id:BONDED_SOURCE_ID,material:'brick',halfExtents:[.2,2.15,2]} as CityBlock).bonds,true);
 if(topology.length!==v.components.length||topology.some(t=>{const c=v.components.find(c=>c.id===t.id);return!c||c.attached!==t.attached||c.leaves.length!==t.leaves.length||t.leaves.some((l,i)=>c.leaves[i]!==l);}))return null;
 if(previous?.revision===v.revision&&(JSON.stringify(previous.strengths)!==JSON.stringify(v.strengths)||previous.components.some(p=>!v.components.some(c=>c.id===p.id&&c.attached===p.attached&&JSON.stringify(c.leaves)===JSON.stringify(p.leaves)))))return null;
 return{version:v.version,source:v.source,revision:v.revision,strengths:[...v.strengths],components:v.components.map(p=>({...p,leaves:[...p.leaves],position:{...p.position},rotation:{...p.rotation}}))};
}
