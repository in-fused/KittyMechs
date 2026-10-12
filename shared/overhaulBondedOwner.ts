import RAPIER from '@dimforge/rapier3d-compat';
import type {CityBlock} from './cityDistrict';
import type {Vec3} from './types';
import type {CityRubbleImpact} from './cityRubbleImpact';
import {validateCityRubbleImpact} from './cityRubbleImpact';
import {applyOverhaulRuinImpact,RUIN_IMPACT_JOULES_PER_DAMAGE} from './overhaulRuinImpact';
import {BONDED_ACTIVE_LIMIT,BONDED_SOURCE_ID,BONDED_VERSION,compileBondedMaterial,bondedComponents,planBondedHit,type MaterialPose,type BondedMaterialState} from './overhaulBondedMaterial';
interface Part {state:MaterialPose;body:RAPIER.RigidBody;colliders:Map<number,RAPIER.Collider>;support:number|null;}
const ZERO={x:0,y:0,z:0};
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const scale=(a:Vec3,n:number):Vec3=>({x:a.x*n,y:a.y*n,z:a.z*n});
const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
function rotate(v:Vec3,q:MaterialPose['rotation']):Vec3{const t=scale(cross(q,v),2);return add(v,add(scale(t,q.w),cross(q,t)));}
const inverse=(v:Vec3,q:MaterialPose['rotation'])=>rotate(v,{x:-q.x,y:-q.y,z:-q.z,w:q.w});
export interface BondedOwnerOptions {frame:()=>RAPIER.Collider|undefined;externalActive:()=>number;replaceCarrier:()=>void;onRetire:(handles:ReadonlySet<number>)=>void;onWear:(fraction:number)=>void;}
/** Exact finite source compounds. No native stepping, cap settlement,
 * teleportation, deletion of solids or artificial component welding. */
export class OverhaulBondedOwner {
 readonly recipe;private strengths:number[];private parts=new Map<number,Part>();private byHandle=new Map<number,{part:Part;leaf:number}>();private revision=0;private initialized=false;
 private receipts:unknown[]=[];
 constructor(private world:RAPIER.World,readonly source:CityBlock,private options:BondedOwnerOptions){this.recipe=compileBondedMaterial(source);this.strengths=this.recipe.bonds.map(b=>b.capacity);}
 get active(){return [...this.parts.values()].filter(p=>!p.state.settled).length;}
 get count(){return this.parts.size;}
 owns(handle:number){return this.byHandle.has(handle);}
 handles(){return new Set(this.byHandle.keys());}
 leafForHandle(handle:number){return this.byHandle.get(handle)?.leaf;}
 collider(id:number){for(const p of this.parts.values()){const c=p.colliders.get(id);if(c)return c;}}
 private frameAlive(){const f=this.options.frame();return!!f&&f.isValid()&&f.isEnabled()&&(!f.parent()||f.parent()!.isFixed());}
 private initialPose():MaterialPose{return{id:0,leaves:Array.from({length:16},(_,i)=>i),position:{x:this.source.position[0],y:this.source.position[1],z:this.source.position[2]},rotation:{x:0,y:Math.sin(this.source.yaw/2),z:0,w:Math.cos(this.source.yaw/2)},attached:true,settled:true,revision:0};}
 private momentum(parts:readonly Part[]){let linear={...ZERO},angular={...ZERO},mass=0;
  for(const p of parts){const m=p.state.leaves.length*774;mass+=m;if(p.body.isFixed())continue;
   const q=p.body.rotation(),omega=inverse(p.body.angvel(),q),center=scale(p.state.leaves.reduce((sum,id)=>add(sum,this.recipe.leaves[id].offset),{...ZERO}),1/p.state.leaves.length);let spin={...ZERO};
   for(const id of p.state.leaves){const l=this.recipe.leaves[id],h=l.half,r=sub(l.offset,center);spin=add(spin,add({x:774/3*(h.y*h.y+h.z*h.z)*omega.x,y:774/3*(h.x*h.x+h.z*h.z)*omega.y,z:774/3*(h.x*h.x+h.y*h.y)*omega.z},scale(cross(r,cross(omega,r)),774)));}
   const momentum=scale(p.body.linvel(),m);linear=add(linear,momentum);angular=add(angular,add(rotate(spin,q),cross(p.body.worldCom(),momentum)));
  }return{mass,linear,angular};
 }
 private make(state:MaterialPose,old?:Part):Part {
  const desc=state.settled?RAPIER.RigidBodyDesc.fixed():RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true).setLinearDamping(.6).setAngularDamping(.9);
  const body=this.world.createRigidBody(desc.setTranslation(state.position.x,state.position.y,state.position.z).setRotation(state.rotation)),colliders=new Map<number,RAPIER.Collider>();
  try{for(const id of state.leaves){const leaf=this.recipe.leaves[id];colliders.set(id,this.world.createCollider(RAPIER.ColliderDesc.cuboid(leaf.half.x,leaf.half.y,leaf.half.z).setTranslation(leaf.offset.x,leaf.offset.y,leaf.offset.z).setDensity(1800).setFriction(.85).setRestitution(0),body));}
   if(old&&!state.settled){const omega={...old.body.angvel()},velocity=add(old.body.linvel(),cross(omega,sub(body.worldCom(),old.body.worldCom())));body.setLinvel(velocity,true);body.setAngvel(omega,true);}
   const expected=state.leaves.length*774;if(!state.settled&&Math.abs(body.mass()-expected)>2e-5*expected)throw Error('Material native mass mismatch');
   return{state,body,colliders,support:state.settled&&!state.attached?old?.support??null:null};
  }catch(error){this.world.removeRigidBody(body);throw error;}
 }
 private install(strengths:number[],hitPart:Part|undefined,wakeHit:boolean,first=false){
  if(first){const frame=this.options.frame(),pose=this.initialPose();if(!frame||!this.frameAlive())throw Error('Material attachment lost actual frame before replacement');for(const id of [3,7,11,15]){const leaf=this.recipe.leaves[id],contact=frame.contactShape(new RAPIER.Cuboid(leaf.half.x,leaf.half.y,leaf.half.z),add(pose.position,rotate(leaf.offset,pose.rotation)),pose.rotation,0);if(!contact||contact.distance>0)throw Error('Material frame attachment has no actual native overlap');}}
  const wakeOwners=new Set<Part>();if(wakeHit&&hitPart){wakeOwners.add(hitPart);for(const parent of wakeOwners)for(const child of this.parts.values())if(!child.state.attached&&[...parent.colliders.values()].some(c=>c.handle===child.support))wakeOwners.add(child);}
  const topology=bondedComponents(strengths,this.recipe.bonds,this.frameAlive()),planned=topology.map(group=>{const old=[...this.parts.values()].find(p=>p.state.leaves.includes(group.id)),pose=old?.state??this.initialPose(),settled=group.attached||(!first&&old&&!wakeOwners.has(old)&&pose.settled&&!pose.attached);
   const state={...pose,...group,settled:!!settled,revision:this.revision+1,position:old?{...old.body.translation()}:{...pose.position},rotation:old?{...old.body.rotation()}:{...pose.rotation}};
   const reuse=old&&old.state.attached===state.attached&&old.state.settled===state.settled&&JSON.stringify(old.state.leaves)===JSON.stringify(state.leaves);return{state,old,reuse};});
  const active=planned.filter(p=>!p.state.settled).length;if(active+this.options.externalActive()>BONDED_ACTIVE_LIMIT)throw Error('Bonded material truthful active budget exceeded before replacement');
  const before=this.momentum([...this.parts.values()]),staged:Part[]=[];let after:ReturnType<OverhaulBondedOwner['momentum']>;
  try{for(const p of planned)staged.push(p.reuse?p.old!:this.make(p.state,p.old));after=this.momentum(staged);
   if(!first){if(before.mass!==after.mass)throw Error('Material replacement lost source mass');for(const kind of ['linear','angular'] as const)for(const axis of ['x','y','z'] as const){const a=before[kind][axis],b=after[kind][axis],bound=96*2**-23*Math.max(1,Math.abs(a),Math.abs(b));if(Math.abs(a-b)>bound)throw Error('Material current-pose split lost native momentum');}}
  }catch(error){for(const p of staged)if(![...this.parts.values()].includes(p))this.world.removeRigidBody(p.body);throw error;}
  // Staging is bounded to16 new compounds/16colliders. No step can observe
  // old and new carriers together. Parent poses are never recentered.
  const retained=new Set(staged.filter(p=>[...this.parts.values()].includes(p))),retired=new Set([...this.byHandle].filter(([,owner])=>!retained.has(owner.part)).map(([h])=>h));this.options.onRetire(retired);
  if(first)this.options.replaceCarrier();for(const p of this.parts.values())if(!retained.has(p))this.world.removeRigidBody(p.body);
  this.parts.clear();this.byHandle.clear();for(const p of staged){this.parts.set(p.state.id,p);for(const [leaf,c]of p.colliders)this.byHandle.set(c.handle,{part:p,leaf});}
  this.strengths=strengths;this.revision++;this.initialized=true;this.options.onWear(strengths.reduce((a,b)=>a+b,0)/this.recipe.totalWork);this.world.propagateModifiedBodyPositionsToColliders();
  this.receipts.push({kind:'atomic-split',revision:this.revision,before,after:after!,leafVolume:6.88,retiredHandles:[...retired],active});
 }
 hit(handle:number|undefined,impact:CityRubbleImpact){
  validateCityRubbleImpact(impact);const previous=handle===undefined?undefined:this.byHandle.get(handle)?.part;if(handle!==undefined&&!previous)throw Error('Material hit lost actual native owner');
  const pose=previous?{position:previous.body.translation(),rotation:previous.body.rotation()}:this.initialPose(),local=inverse(sub(impact.point,pose.position),pose.rotation),members=new Set(previous?.state.leaves??Array.from({length:16},(_,i)=>i)),budget=impact.strength*RUIN_IMPACT_JOULES_PER_DAMAGE.brick*(impact.weapon==='rocket'?1.5:1);
  const planned=planBondedHit(this.strengths,this.recipe.bonds,members,local,impact.weapon,budget),before=this.snapshot();this.install(planned.strengths,previous,true,!this.initialized);
  const candidates=[...this.parts.values()].filter(p=>!p.state.settled&&p.state.leaves.some(l=>members.has(l))).map(p=>{const candidates=[...p.colliders].map(([leaf,c])=>{const projected=c.projectPoint(impact.point,false);if(!projected)throw Error('Material native contact projection unavailable');return{leaf,c,point:projected.point};}).sort((a,b)=>Math.hypot(...Object.values(sub(a.point,impact.point)))-Math.hypot(...Object.values(sub(b.point,impact.point)))||a.leaf-b.leaf),nearest=candidates[0],leaf=this.recipe.leaves[nearest.leaf];return{id:p.state.id,block:{...this.source,halfExtents:[leaf.half.x,leaf.half.y,leaf.half.z] as [number,number,number]},body:p.body,collider:nearest.c};});
  // Only actually dynamic components receive kinetic work. Supported material
  // reports unused kinetic budget; no unmeasured frame reaction is claimed.
  const kinetic=candidates.length?applyOverhaulRuinImpact(candidates,impact,planned.kineticBudget):null;
  this.receipts.push({revision:this.revision,budget,fractureWork:planned.fractureWork,kinetic,unspentKinetic:kinetic?0:planned.kineticBudget,before,after:this.snapshot()});while(this.receipts.length>64)this.receipts.shift();
 }
 private supported(p:Part){if(p.support===null)return false;const c=this.world.getCollider(p.support);return!!c&&c.isValid()&&c.isEnabled()&&(!c.parent()||c.parent()!.isFixed());}
 private wake(p:Part){if(!p.state.settled||p.state.attached)return;const queue=[p],seen=new Set<Part>(queue);for(let i=0;i<queue.length;i++)for(const child of this.parts.values())if(child.state.settled&&!child.state.attached&&[...queue[i].colliders.values()].some(c=>c.handle===child.support)&&!seen.has(child)){seen.add(child);queue.push(child);}
  if(this.active+queue.length+this.options.externalActive()>16)throw Error('Bonded support wake exceeds truthful active budget');
  this.options.onRetire(new Set(queue.flatMap(p=>[...p.colliders.values()].map(c=>c.handle))));for(const part of queue){part.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);part.body.recomputeMassPropertiesFromColliders();part.body.wakeUp();part.state.settled=false;part.support=null;part.state.revision=++this.revision;}
 }
 advance(){if(!this.initialized)return;
  if(!this.frameAlive()&&this.strengths.slice(24).some(s=>s>0)){const strengths=[...this.strengths];strengths.fill(0,24);this.install(strengths,undefined,false);}
  for(const p of this.parts.values())if(p.state.settled&&!p.state.attached&&!this.supported(p))this.wake(p);
  for(const p of this.parts.values())if(!p.state.settled&&p.body.isSleeping()){
   let support:RAPIER.Collider|undefined;for(const c of p.colliders.values()){this.world.contactPairsWith(c,other=>{if(support||other.isSensor()||other.parent()&&!other.parent()!.isFixed())return;const contact=other.contactCollider(c,.04);if(contact&&contact.normal1.y>=.5&&contact.distance>=-.02&&contact.distance<=.008){support=other;return;}if(other.shape.type!==RAPIER.ShapeType.TriMesh)return;const hit=other.castShape(ZERO,c.shape,c.translation(),c.rotation(),{x:0,y:-1,z:0},.005,.035,true);if(hit&&rotate(hit.normal1,other.rotation()).y>=.5)support=other;});if(support)break;}
   if(support){p.support=support.handle;p.body.setBodyType(RAPIER.RigidBodyType.Fixed,false);p.state.settled=true;p.state.revision=++this.revision;}
  }
 }
 snapshot():BondedMaterialState|undefined{return this.initialized?{version:BONDED_VERSION,source:BONDED_SOURCE_ID,revision:this.revision,strengths:[...this.strengths],components:[...this.parts.values()].map(p=>({...p.state,leaves:[...p.state.leaves],position:{...p.body.translation()},rotation:{...p.body.rotation()}})).sort((a,b)=>a.id-b.id)}:undefined;}
 diagnostics(){return{active:this.active,components:this.count,colliders:this.byHandle.size,revision:this.revision,receipts:this.receipts};}
 leafColliderKey(id:number){return`bonded:${BONDED_SOURCE_ID}:leaf:${id}`;}
 colliderForKey(key:string){const leaf=this.recipe.leaves.find(l=>this.leafColliderKey(l.id)===key);if(!leaf)return;const c=this.collider(leaf.id);return c?.parent()?.isFixed()?c:undefined;}
 fixedKeys(){return this.recipe.leaves.filter(l=>this.collider(l.id)?.parent()?.isFixed()).map(l=>this.leafColliderKey(l.id));}
 dispose(){for(const p of this.parts.values())this.world.removeRigidBody(p.body);this.parts.clear();this.byHandle.clear();}
}
