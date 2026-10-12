import RAPIER from '@dimforge/rapier3d-compat';
import type {CityBlock} from '../../shared/cityDistrict';
import type {Vec3} from '../../shared/types';
import type {CityRubbleImpact} from '../../shared/cityRubbleImpact';
import {validateCityRubbleImpact} from '../../shared/cityRubbleImpact';
import {applyOverhaulRuinImpact,RUIN_IMPACT_JOULES_PER_DAMAGE} from '../../shared/overhaulRuinImpact';
import {BONDED_SOURCE_ID,BONDED_VERSION,compileBondedMaterial,bondedComponents,planBondedHit,type MaterialPose,type BondedMaterialState} from '../../shared/overhaulBondedMaterial';
import {compileSecondary,planSecondaryHit,SECONDARY_VERSION,SECONDARY_CAPACITY,SECONDARY_COMBINED_ACTIVE,type ChildDefinition,type ChildPose,type SecondaryState} from './material';
interface Part {state:MaterialPose;body:RAPIER.RigidBody;colliders:Map<number,RAPIER.Collider>;support:number|null;}
const ZERO={x:0,y:0,z:0};
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const scale=(a:Vec3,n:number):Vec3=>({x:a.x*n,y:a.y*n,z:a.z*n});
const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
function rotate(v:Vec3,q:MaterialPose['rotation']):Vec3{const t=scale(cross(q,v),2);return add(v,add(scale(t,q.w),cross(q,t)));}
const inverse=(v:Vec3,q:MaterialPose['rotation'])=>rotate(v,{x:-q.x,y:-q.y,z:-q.z,w:q.w});
export interface SecondaryOwnerOptions {frame:()=>RAPIER.Collider|undefined;externalActive:()=>number;replaceCarrier:()=>void;onRetire:(handles:ReadonlySet<number>)=>void;onWear:(fraction:number)=>void;externalSupportKey:(collider:RAPIER.Collider)=>string;}
interface NativeChild {definition:ChildDefinition;state:ChildPose;body:RAPIER.RigidBody;collider:RAPIER.Collider;support:number|null;}
/** Exact finite source compounds. No native stepping, cap settlement,
 * teleportation, deletion of solids or artificial component welding. */
export class SecondaryFractureOwner {
 readonly recipe;private strengths:number[];private parts=new Map<number,Part>();private byHandle=new Map<number,{part:Part;leaf:number}>();private revision=0;private initialized=false;
 private receipts:unknown[]=[];
 readonly secondary;private intrinsicRemaining:number=SECONDARY_CAPACITY;private children=new Map<string,NativeChild>();private childByHandle=new Map<number,NativeChild>();
 constructor(private world:RAPIER.World,readonly source:CityBlock,private options:SecondaryOwnerOptions){this.recipe=compileBondedMaterial(source);this.secondary=compileSecondary(source);this.strengths=this.recipe.bonds.map(b=>b.capacity);}
 get active(){return [...this.parts.values()].filter(p=>!p.state.settled).length+[...this.children.values()].filter(p=>!p.state.settled).length;}
 get count(){return this.parts.size+this.children.size;}
 owns(handle:number){return this.byHandle.has(handle)||this.childByHandle.has(handle);}
 handles(){return new Set([...this.byHandle.keys(),...this.childByHandle.keys()]);}
 leafForHandle(handle:number){return this.byHandle.get(handle)?.leaf??(this.childByHandle.has(handle)?6:undefined);}
 fragmentForHandle(handle:number){return this.childByHandle.get(handle)?.definition.id??(this.byHandle.has(handle)?`leaf:${this.byHandle.get(handle)!.leaf}`:undefined);}
 allColliders(){return [...this.parts.values()].flatMap(p=>[...p.colliders.values()]).concat([...this.children.values()].map(p=>p.collider));}
 get secondarySplit(){return this.children.size===2;}
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
  const topology=bondedComponents(strengths,this.recipe.bonds,this.frameAlive()).filter(g=>!this.secondarySplit||!g.leaves.includes(6)),planned=topology.map(group=>{const old=[...this.parts.values()].find(p=>p.state.leaves.includes(group.id)),pose=old?.state??this.initialPose(),settled=group.attached||(!first&&old&&!wakeOwners.has(old)&&pose.settled&&!pose.attached);
   const state={...pose,...group,settled:!!settled,revision:this.revision+1,position:old?{...old.body.translation()}:{...pose.position},rotation:old?{...old.body.rotation()}:{...pose.rotation}};
   const reuse=old&&old.state.attached===state.attached&&old.state.settled===state.settled&&JSON.stringify(old.state.leaves)===JSON.stringify(state.leaves);return{state,old,reuse};});
  const active=planned.filter(p=>!p.state.settled).length+[...this.children.values()].filter(p=>!p.state.settled).length;if(active+this.options.externalActive()>SECONDARY_COMBINED_ACTIVE)throw Error('Secondary version truthful active budget exceeded before replacement');
  const before=this.momentum([...this.parts.values()]),staged:Part[]=[];let after:ReturnType<SecondaryFractureOwner['momentum']>;
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
  validateCityRubbleImpact(impact);const child=handle===undefined?undefined:this.childByHandle.get(handle);if(child){this.wakeChild(child);const budget=impact.strength*RUIN_IMPACT_JOULES_PER_DAMAGE.brick*(impact.weapon==='rocket'?1.5:1),kinetic=applyOverhaulRuinImpact([{id:child.definition.id==='6:a'?16:17,block:{...this.source,halfExtents:[.1,.5375,.5]},body:child.body,collider:child.collider}],impact,budget);this.receipts.push({kind:'terminal-child-hit',version:SECONDARY_VERSION,id:child.definition.id,fractureWork:0,kinetic});return;}
  const previous=handle===undefined?undefined:this.byHandle.get(handle)?.part;if(handle!==undefined&&!previous)throw Error('Material hit lost actual native owner');
  if(previous&&previous.state.leaves.length===1&&previous.state.leaves[0]===6&&!this.secondarySplit&&this.strengths.every(s=>s===0)){
   const parent=previous.colliders.get(6)!,local=inverse(sub(impact.point,parent.translation()),parent.rotation()),budget=impact.strength*RUIN_IMPACT_JOULES_PER_DAMAGE.brick*(impact.weapon==='rocket'?1.5:1),plan=planSecondaryHit(this.intrinsicRemaining,local,inverse(impact.incoming,parent.rotation()),inverse(impact.normal,parent.rotation()),impact.weapon,budget);
   if(plan.remaining===0){this.splitParent(previous,impact,plan);return;}
   this.install([...this.strengths],previous,true);this.intrinsicRemaining=plan.remaining;const current=this.parts.get(6)!,collider=current.colliders.get(6)!,kinetic=plan.kineticBudget>0?applyOverhaulRuinImpact([{id:6,block:{...this.source,halfExtents:[.2,.5375,.5]},body:current.body,collider}],impact,plan.kineticBudget):null;this.receipts.push({kind:'intrinsic-partial-damage',version:SECONDARY_VERSION,budget,plan,kinetic});return;
  }
  const pose=previous?{position:previous.body.translation(),rotation:previous.body.rotation()}:this.initialPose(),local=inverse(sub(impact.point,pose.position),pose.rotation),members=new Set(previous?.state.leaves??Array.from({length:16},(_,i)=>i)),budget=impact.strength*RUIN_IMPACT_JOULES_PER_DAMAGE.brick*(impact.weapon==='rocket'?1.5:1);
  const planned=planBondedHit(this.strengths,this.recipe.bonds,members,local,impact.weapon,budget),before=this.primaryState();this.install(planned.strengths,previous,true,!this.initialized);
  const candidates=[...this.parts.values()].filter(p=>!p.state.settled&&p.state.leaves.some(l=>members.has(l))).map(p=>{const candidates=[...p.colliders].map(([leaf,c])=>{const projected=c.projectPoint(impact.point,false);if(!projected)throw Error('Material native contact projection unavailable');return{leaf,c,point:projected.point};}).sort((a,b)=>Math.hypot(...Object.values(sub(a.point,impact.point)))-Math.hypot(...Object.values(sub(b.point,impact.point)))||a.leaf-b.leaf),nearest=candidates[0],leaf=this.recipe.leaves[nearest.leaf];return{id:p.state.id,block:{...this.source,halfExtents:[leaf.half.x,leaf.half.y,leaf.half.z] as [number,number,number]},body:p.body,collider:nearest.c};});
  // Only actually dynamic components receive kinetic work. Supported material
  // reports unused kinetic budget; no unmeasured frame reaction is claimed.
  const kinetic=candidates.length?applyOverhaulRuinImpact(candidates,impact,planned.kineticBudget):null;
  this.receipts.push({revision:this.revision,budget,fractureWork:planned.fractureWork,kinetic,unspentKinetic:kinetic?0:planned.kineticBudget,before,after:this.primaryState()});
 }
 private supported(p:Part){if(p.support===null)return false;const c=this.world.getCollider(p.support);return!!c&&c.isValid()&&c.isEnabled()&&(!c.parent()||c.parent()!.isFixed());}
 private wake(p:Part){if(!p.state.settled||p.state.attached)return;const queue=[p],seen=new Set<Part>(queue);for(let i=0;i<queue.length;i++)for(const child of this.parts.values())if(child.state.settled&&!child.state.attached&&[...queue[i].colliders.values()].some(c=>c.handle===child.support)&&!seen.has(child)){seen.add(child);queue.push(child);}
  if(this.active+queue.length+this.options.externalActive()>SECONDARY_COMBINED_ACTIVE)throw Error('Secondary support wake exceeds truthful active budget');
  this.options.onRetire(new Set(queue.flatMap(p=>[...p.colliders.values()].map(c=>c.handle))));for(const part of queue){part.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);part.body.recomputeMassPropertiesFromColliders();part.body.wakeUp();part.state.settled=false;part.support=null;part.state.revision=++this.revision;}
 }
 advance(){if(!this.initialized)return;
  if(!this.frameAlive()&&this.strengths.slice(24).some(s=>s>0)){const strengths=[...this.strengths];strengths.fill(0,24);this.install(strengths,undefined,false);}
  for(const p of this.parts.values())if(p.state.settled&&!p.state.attached&&!this.supported(p))this.wake(p);
  for(const p of this.parts.values())if(!p.state.settled&&p.body.isSleeping()){
   let support:RAPIER.Collider|undefined;for(const c of p.colliders.values()){this.world.contactPairsWith(c,other=>{if(support||other.isSensor()||other.parent()&&!other.parent()!.isFixed())return;const contact=other.contactCollider(c,.04);if(contact&&contact.normal1.y>=.5&&contact.distance>=-.02&&contact.distance<=.008){support=other;return;}if(other.shape.type!==RAPIER.ShapeType.TriMesh)return;const hit=other.castShape(ZERO,c.shape,c.translation(),c.rotation(),{x:0,y:-1,z:0},.005,.035,true);if(hit&&rotate(hit.normal1,other.rotation()).y>=.5)support=other;});if(support)break;}
   if(support){p.support=support.handle;p.body.setBodyType(RAPIER.RigidBodyType.Fixed,false);p.state.settled=true;p.state.revision=++this.revision;}
  }
  for(const child of this.children.values()){if(child.state.settled&&!this.childSupported(child,new Set()))this.wakeChild(child);if(!child.state.settled&&child.body.isSleeping()){const support=this.findSupport(child);if(support){child.support=support.handle;child.state.supportKey=this.supportKey(support);child.body.setBodyType(RAPIER.RigidBodyType.Fixed,false);child.state.settled=true;child.state.revision=++this.revision;}}}
 }
 private primaryState(){return this.initialized?{strengths:[...this.strengths],components:[...this.parts.values()].map(p=>({...p.state,leaves:[...p.state.leaves],position:{...p.body.translation()},rotation:{...p.body.rotation()}})).sort((a,b)=>a.id-b.id)}:undefined;}
 legacyReplayView():BondedMaterialState|undefined {if(this.secondarySplit)throw Error('New children must never serialize as frozen16 material');const s=this.primaryState();return s?{version:BONDED_VERSION,source:BONDED_SOURCE_ID,revision:this.revision,...s}:undefined;}
 snapshot():SecondaryState|undefined {const base=this.primaryState();return base?{version:SECONDARY_VERSION,source:BONDED_SOURCE_ID,revision:this.revision,interleafStrengths:base.strengths,primary:base.components,intrinsic:{parent:6,capacity:SECONDARY_CAPACITY,remaining:this.intrinsicRemaining,split:this.secondarySplit,children:[...this.children.values()].map(c=>({...c.state,position:{...c.body.translation()},rotation:{...c.body.rotation()}})).sort((a,b)=>a.id.localeCompare(b.id))}}:undefined;}
 diagnostics(){return{version:SECONDARY_VERSION,active:this.active,components:this.count,colliders:this.byHandle.size+this.childByHandle.size,revision:this.revision,intrinsicRemaining:this.intrinsicRemaining,secondarySplit:this.secondarySplit,receipts:this.receipts};}
 leafColliderKey(id:number){return`bonded:${BONDED_SOURCE_ID}:leaf:${id}`;}
 colliderForKey(key:string){const child=[...this.children.values()].find(c=>this.childKey(c.definition.id)===key);if(child)return child.body.isFixed()?child.collider:undefined;const leaf=this.recipe.leaves.find(l=>this.leafColliderKey(l.id)===key);if(!leaf)return;const c=this.collider(leaf.id);return c?.parent()?.isFixed()?c:undefined;}
 fixedKeys(){return this.recipe.leaves.filter(l=>this.collider(l.id)?.parent()?.isFixed()).map(l=>this.leafColliderKey(l.id)).concat([...this.children.values()].filter(c=>c.body.isFixed()).map(c=>this.childKey(c.definition.id)));}
 dispose(){for(const p of this.parts.values())this.world.removeRigidBody(p.body);for(const c of this.children.values())this.world.removeRigidBody(c.body);this.parts.clear();this.byHandle.clear();this.children.clear();this.childByHandle.clear();}
 private childKey(id:string){return`secondary:${BONDED_SOURCE_ID}:child:${id}`;}
 private supportKey(c:RAPIER.Collider){return this.childByHandle.has(c.handle)?this.childKey(this.childByHandle.get(c.handle)!.definition.id):this.byHandle.has(c.handle)?this.leafColliderKey(this.byHandle.get(c.handle)!.leaf):this.options.externalSupportKey(c);}
 private contact(support:RAPIER.Collider,child:NativeChild){const h=support.contactCollider(child.collider,.04);if(h)return{normal:h.normal1,distance:h.distance};if(support.shape.type!==RAPIER.ShapeType.TriMesh)return null;const hit=support.castShape(ZERO,child.collider.shape,child.collider.translation(),child.collider.rotation(),{x:0,y:-1,z:0},.005,.035,true);return hit?{normal:rotate(hit.normal1,support.rotation()),distance:hit.time_of_impact+.005}:null;}
 private childSupported(child:NativeChild,seen:Set<string>):boolean {if(child.support===null||seen.has(child.definition.id))return false;seen.add(child.definition.id);const support=this.world.getCollider(child.support);if(!support?.isValid()||!support.isEnabled()||support.isSensor()||support.parent()&&!support.parent()!.isFixed())return false;const other=this.childByHandle.get(support.handle);if(other&&!this.childSupported(other,seen))return false;const h=this.contact(support,child);return!!h&&h.normal.y>=.5&&h.distance>=-.02&&h.distance<=.008;}
 private findSupport(child:NativeChild){let support:RAPIER.Collider|undefined;this.world.contactPairsWith(child.collider,c=>{if(support||c.isSensor()||!c.isEnabled()||c.parent()&&!c.parent()!.isFixed())return;const other=this.childByHandle.get(c.handle);if(other&&!this.childSupported(other,new Set()))return;const h=this.contact(c,child);if(h&&h.normal.y>=.5&&h.distance>=-.02&&h.distance<=.008)support=c;});return support;}
 private wakeChild(child:NativeChild){if(!child.state.settled)return;const queue=[child],seen=new Set<string>([child.definition.id]);for(let i=0;i<queue.length;i++)for(const c of this.children.values())if(c.state.settled&&c.support===queue[i].collider.handle&&!seen.has(c.definition.id)){queue.push(c);seen.add(c.definition.id);}if(this.active+queue.length+this.options.externalActive()>18)throw Error('Secondary child wake exceeds18 actual active owners');this.options.onRetire(new Set(queue.map(c=>c.collider.handle)));for(const c of queue){c.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);c.body.recomputeMassPropertiesFromColliders();c.body.wakeUp();c.support=null;c.state.supportKey=null;c.state.settled=false;c.state.revision=++this.revision;}}
 private modelMassMotion(half:Vec3,mass:number,center:Vec3,q:MaterialPose['rotation'],velocity:Vec3,omega:Vec3){const w=inverse(omega,q),spin=rotate({x:mass/3*(half.y**2+half.z**2)*w.x,y:mass/3*(half.x**2+half.z**2)*w.y,z:mass/3*(half.x**2+half.y**2)*w.z},q),linear=scale(velocity,mass);return{mass,linear,angular:add(spin,cross(center,linear)),energy:.5*mass*(velocity.x**2+velocity.y**2+velocity.z**2)+.5*(w.x*mass/3*(half.y**2+half.z**2)*w.x+w.y*mass/3*(half.x**2+half.z**2)*w.y+w.z*mass/3*(half.x**2+half.y**2)*w.z)};}
 private splitParent(parent:Part,impact:CityRubbleImpact,plan:ReturnType<typeof planSecondaryHit>){
  if(parent.state.leaves.length!==1||parent.state.leaves[0]!==6||parent.state.attached||this.secondarySplit||plan.remaining!==0)throw Error('Invalid atomic intrinsic replacement');
  const collider=parent.colliders.get(6)!,center={...collider.translation()},q={...collider.rotation()},omega=parent.body.isFixed()?{...ZERO}:{...parent.body.angvel()},velocity=parent.body.isFixed()?{...ZERO}:add(parent.body.linvel(),cross(omega,sub(center,parent.body.worldCom()))),before=this.modelMassMotion({x:.2,y:.5375,z:.5},774,center,q,velocity,omega),wakeQueue:Part[]=[];
  const retired=new Set<number>([collider.handle]);for(const p of this.parts.values())if(p!==parent&&p.state.settled&&p.support!==null&&retired.has(p.support)){wakeQueue.push(p);for(const h of p.colliders.values())retired.add(h.handle);} //transitive source order is supplemented below.
  let added=true;while(added){added=false;for(const p of this.parts.values())if(p!==parent&&p.state.settled&&!wakeQueue.includes(p)&&p.support!==null&&retired.has(p.support)){wakeQueue.push(p);for(const h of p.colliders.values())retired.add(h.handle);added=true;}}
  const nextActive=this.active-(parent.state.settled?0:1)+2+wakeQueue.length+this.options.externalActive();if(nextActive>18||this.allColliders().length-1+2>17)throw Error('Secondary replacement exceeds truthful new catalog/budget before mutation');
  const staged:NativeChild[]=[];try{for(const d of this.secondary.children){const position=add(center,rotate(d.offset,q)),body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setRotation(q).setCcdEnabled(true).setLinearDamping(.6).setAngularDamping(.9));try{const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(d.half.x,d.half.y,d.half.z).setDensity(1800).setFriction(.85).setRestitution(0),body);body.recomputeMassPropertiesFromColliders();if(Math.abs(body.mass()-d.mass)>d.mass*2e-5)throw Error('Secondary native child mass mismatch');body.setLinvel(add(velocity,cross(omega,sub(body.worldCom(),center))),true);body.setAngvel(omega,true);staged.push({definition:d,body,collider:c,support:null,state:{id:d.id,position,rotation:q,settled:false,revision:this.revision+1,supportKey:null}});}catch(e){this.world.removeRigidBody(body);throw e;}}
   const after=staged.reduce((sum,c)=>{const p=this.modelMassMotion(c.definition.half,c.definition.mass,c.body.worldCom(),c.body.rotation(),c.body.linvel(),c.body.angvel());return{mass:sum.mass+p.mass,linear:add(sum.linear,p.linear),angular:add(sum.angular,p.angular),energy:sum.energy+p.energy};},{mass:0,linear:{...ZERO},angular:{...ZERO},energy:0});if(after.mass!==before.mass||Math.abs(after.energy-before.energy)>1e-4*Math.max(1,before.energy))throw Error('Secondary replacement lost model mass/energy');for(const kind of ['linear','angular'] as const)for(const axis of ['x','y','z'] as const)if(Math.abs(after[kind][axis]-before[kind][axis])>1e-4*Math.max(1,Math.abs(before[kind][axis])))throw Error('Secondary replacement lost model momentum');
   this.options.onRetire(retired);this.world.removeRigidBody(parent.body);this.parts.delete(6);this.byHandle.delete(collider.handle);for(const c of staged){this.children.set(c.definition.id,c);this.childByHandle.set(c.collider.handle,c);}for(const p of wakeQueue){p.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);p.body.recomputeMassPropertiesFromColliders();p.body.wakeUp();p.support=null;p.state.settled=false;p.state.revision=++this.revision;}this.intrinsicRemaining=0;this.revision++;this.world.propagateModifiedBodyPositionsToColliders();
   const kinetic=plan.kineticBudget>0?applyOverhaulRuinImpact(staged.map((c,i)=>({id:16+i,block:{...this.source,halfExtents:[c.definition.half.x,c.definition.half.y,c.definition.half.z] as [number,number,number]},body:c.body,collider:c.collider})),impact,plan.kineticBudget):null;this.receipts.push({kind:'intrinsic-atomic-replacement',version:SECONDARY_VERSION,parent:'leaf:6',retiredParentHandle:collider.handle,retiredLeaseHandles:[...retired],childIds:staged.map(c=>c.definition.id),sourceVolume:.43,sourceMass:774,childNativeMass:staged.reduce((n,c)=>n+c.body.mass(),0),before,after,plan,kinetic,wokenDependentIds:wakeQueue.map(p=>p.state.id),actualCombinedActive:this.active+this.options.externalActive()});
  }catch(error){for(const c of staged)if(!this.children.has(c.definition.id)&&c.body.isValid())this.world.removeRigidBody(c.body);throw error;}
 }
}
