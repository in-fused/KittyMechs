import RAPIER from '@dimforge/rapier3d-compat';
import {cityBlockColliderDesc,isRainlineStreetBlock,trackStreetCollider} from './rainlineStreetAdmission';
import type {CityDistrict,CityBlock} from './cityDistrict';
import type {Vec3} from './types';
import {validateCityRubbleImpact,type CityRubbleImpact} from './cityRubbleImpact';
import {applyOverhaulRuinImpact,RUIN_IMPACT_JOULES_PER_DAMAGE,ruinImpactSurface,type RuinImpactReceipt} from './overhaulRuinImpact';
import {applyCharacterRubbleImpulses,type CharacterRubbleContact,type CharacterRubbleImpulseBudget,type CharacterRubbleImpulseReceipt} from './characterRubbleImpulse';
import {overhaulFragmentBlock,overhaulFragmentKey,overhaulFragmentRecipe,overhaulFractureBudget} from './overhaulFracture';

export interface OverhaulRuinState {block:number;piece?:number;born:number;position:Vec3;rotation:{x:number;y:number;z:number;w:number};settled:boolean;revision?:number;}
interface Support {handle:number;point:Vec3;normal:Vec3;}
interface NativeSupportContact {distance:number;point1:Vec3;normal1:Vec3;}
interface Ruin {state:OverhaulRuinState;source:CityBlock;body:RAPIER.RigidBody;collider:RAPIER.Collider;support:Support|null;activeSince:number;}
export const OVERHAUL_RUIN_ACTIVE_LIMIT=16;
export const OVERHAUL_RUIN_SETTLE_AFTER=4;
const SKIN=.005,CONTACT_RANGE=.04,MAX_SWEEP=256,MAX_SKIPPED_HITS=8;
const DOWN={x:0,y:-1,z:0},ZERO={x:0,y:0,z:0};
const STATIC_FLAGS=RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
export interface OverhaulRuinsOptions {fractureFacades?:boolean;strictExternalActive?:()=>number;canSupport?:(collider:RAPIER.Collider)=>boolean;onWake?:(handles:ReadonlySet<number>)=>void;}
export class OverhaulRuinSupportError extends Error {constructor(block:number){super(`Persistent ruin ${block} cannot settle onto existing native support; admission stopped`);this.name='OverhaulRuinSupportError';}}
function rotate(v:Vec3,q:OverhaulRuinState['rotation']):Vec3 {
  const tx=2*(q.y*v.z-q.z*v.y),ty=2*(q.z*v.x-q.x*v.z),tz=2*(q.x*v.y-q.y*v.x);
  return{x:v.x+q.w*tx+q.y*tz-q.z*ty,y:v.y+q.w*ty+q.z*tx-q.x*tz,z:v.z+q.w*tz+q.x*ty-q.y*tx};
}
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scaled=(v:Vec3,s:number):Vec3=>({x:v.x*s,y:v.y*s,z:v.z*s});
export function overhaulRuinVerticalRadius(block:CityBlock,q:OverhaulRuinState['rotation']):number {
  return Math.abs(rotate({x:block.halfExtents[0],y:0,z:0},q).y)+Math.abs(rotate({x:0,y:block.halfExtents[1],z:0},q).y)+Math.abs(rotate({x:0,y:0,z:block.halfExtents[2]},q).y);
}
function radii(block:CityBlock,q:OverhaulRuinState['rotation']):Vec3 {
  const axes=[rotate({x:block.halfExtents[0],y:0,z:0},q),rotate({x:0,y:block.halfExtents[1],z:0},q),rotate({x:0,y:0,z:block.halfExtents[2]},q)];
  return{x:axes.reduce((sum,a)=>sum+Math.abs(a.x),0),y:axes.reduce((sum,a)=>sum+Math.abs(a.y),0),z:axes.reduce((sum,a)=>sum+Math.abs(a.z),0)};
}
export interface OverhaulRuinPatch {
  id:string;block:number;piece?:number;born:number;revision:number;surface:'roof'|'wall'|'slope'|'underside';
  center:Vec3;normal:Vec3;axisU:Vec3;axisV:Vec3;halfWidth:number;halfHeight:number;corners:Vec3[];colliderHandle?:number;
}
/** Actual six oriented source-box faces, never AABB-derived fake walls. */
export function overhaulRuinPatches(block:CityBlock,state:OverhaulRuinState):OverhaulRuinPatch[] {
  // A convex envelope has no authority to expose its broad AABB as grip faces.
  if(isRainlineStreetBlock(block))return [];
  const axes:Vec3[]=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}],result:OverhaulRuinPatch[]=[];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3,normal=rotate(scaled(axes[axis],sign),state.rotation),axisU=rotate(axes[u],state.rotation),axisV=rotate(scaled(axes[v],sign),state.rotation);
    const center=add(state.position,rotate(scaled(axes[axis],block.halfExtents[axis]*sign),state.rotation)),halfWidth=block.halfExtents[u],halfHeight=block.halfExtents[v];
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,sv])=>add(add(center,scaled(axisU,su*halfWidth)),scaled(axisV,sv*halfHeight)));
    const surface=normal.y>=.65?'roof':normal.y<=-.65?'underside':Math.abs(normal.y)<=.35?'wall':'slope';
    result.push({id:`ruin:${state.block}${state.piece===undefined?'':`:piece:${state.piece}`}:face:${axis}:${sign}`,block:state.block,...(state.piece!==undefined?{piece:state.piece}:{}),born:state.born,revision:state.revision??0,surface,center,normal,axisU,axisV,halfWidth,halfHeight,corners});
  }return result;
}
/** Persistent exact source geometry; no world stepping or age removal.
 * Fracture mode has a finite catalog bound and never settles for capacity. */
export class OverhaulRuinsOwner {
  private ruins=new Map<number,Ruin>();private byHandle=new Map<number,Ruin>();private disposed=false;
  private stats={sweeps:0,directSweeps:0,capacitySettlements:0,reactivations:0,supportFailures:0,peakActive:0,weaponReactions:0,characterReactions:0};
  private lastImpact:RuinImpactReceipt|null=null;
  constructor(private world:RAPIER.World,private district:CityDistrict|null,private floor:(x:number,z:number)=>number,private options:OverhaulRuinsOptions={}){}
  detach(block:CityBlock,time:number,incoming:Vec3):void {
    if(this.disposed)throw new Error('Persistent ruin owner is disposed');
    const index=this.district?.blocks.indexOf(block)??-1;if(index<0||this.ruins.has(overhaulFragmentKey(index)))return;
    if(!Number.isFinite(time)||time<0||![incoming.x,incoming.y,incoming.z].every(Number.isFinite))throw new Error('Invalid persistent ruin admission');
    const recipe=this.options.fractureFacades?overhaulFragmentRecipe(block):[{piece:0}];
    if(this.options.fractureFacades&&this.ruins.size+recipe.length>overhaulFractureBudget(this.district))throw Error('Source fracture catalog capacity exceeded');
    const staged:Ruin[]=[];
    try{for(const fragment of recipe){
    const source=this.options.fractureFacades?overhaulFragmentBlock(block,fragment.piece):block;
    if(!this.options.fractureFacades)this.makeDynamicCapacity();
    const [x,y,z]=source.position,rotation={x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)};
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setRotation(rotation).setCcdEnabled(true).setLinearDamping(.6).setAngularDamping(.9));
    let collider:RAPIER.Collider;
    try{const desc=cityBlockColliderDesc(source);if(!isRainlineStreetBlock(source))desc.setDensity(block.material==='steel'?7800:block.material==='concrete'?2400:1800);collider=trackStreetCollider(this.world,source,this.world.createCollider(desc.setFriction(.85).setRestitution(0),body));}catch(error){this.world.removeRigidBody(body);throw error;}
    // Unsupported descendants acquire gravity, not a duplicate whole-hit
    // launch budget. A weapon dispatch applies the actual local point impulse
    // to admitted direct/blast owners once after original carriers retire.
    const ruin:Ruin={state:{block:index,...(this.options.fractureFacades?{piece:fragment.piece}:{}),born:time,position:{x,y,z},rotation,settled:false,revision:0},source,body,collider,support:null,activeSince:time};
    staged.push(ruin);
    }}catch(error){for(const ruin of staged)if(ruin.body.isValid())this.world.removeRigidBody(ruin.body);throw error;}
    for(const ruin of staged){this.ruins.set(overhaulFragmentKey(index,ruin.state.piece),ruin);this.byHandle.set(ruin.collider.handle,ruin);}
    this.stats.peakActive=Math.max(this.stats.peakActive,this.active().length);
  }
  private active():Ruin[]{return [...this.ruins.values()].filter(r=>!r.state.settled);}
  private eligible(c:RAPIER.Collider):boolean{return c.isValid()&&c.isEnabled()&&!c.isSensor()&&(!c.parent()||c.parent()!.isFixed())&&(this.options.canSupport?.(c)??true);}
  private castNormal(collider:RAPIER.Collider,hit:RAPIER.ShapeCastHit):Vec3{return rotate(hit.normal1,collider.rotation());}
  /** Rapier returns no contactShape receipt for some terrain TriMeshes even
   * when its exact shape sweep proves contact. Query the same native mesh with
   * the whole current source shape, within the original contact range. Cast
   * witnesses/normals are collider-local and must be transformed to world. */
  private supportContact(collider:RAPIER.Collider,shape:RAPIER.Shape,position:Vec3,rotation:OverhaulRuinState['rotation']):NativeSupportContact|null {
    const contact=collider.contactShape(shape,position,rotation,CONTACT_RANGE);if(contact)return contact;
    if(collider.shape.type!==RAPIER.ShapeType.TriMesh)return null;
    this.stats.directSweeps++;
    // Zero target distance degenerates to a triangle-edge normal at exact
    // contact in Rapier's mesh/cuboid query. The existing5mm skin retains a
    // finite face normal; skin+TOI stays within the same40mm support bound.
    const hit=collider.castShape(ZERO,shape,position,rotation,DOWN,SKIN,CONTACT_RANGE-SKIN,true);
    if(!hit||!Number.isFinite(hit.time_of_impact)||hit.time_of_impact<0||hit.time_of_impact+SKIN>CONTACT_RANGE)return null;
    const normal=this.castNormal(collider,hit);if(normal.y<.5)return null;
    return {distance:hit.time_of_impact+SKIN,point1:add(collider.translation(),rotate(hit.witness1,collider.rotation())),normal1:normal};
  }
  private supported(ruin:Ruin,visited=new Set<number>()):boolean {
    const key=overhaulFragmentKey(ruin.state.block,ruin.state.piece);
    if(!ruin.state.settled||!ruin.support||visited.has(key))return false;visited.add(key);
    const support=this.world.getCollider(ruin.support.handle);if(!support||!this.eligible(support))return false;
    const owner=this.byHandle.get(support.handle);if(owner&&!this.supported(owner,visited))return false;
    const contact=support.contactCollider(ruin.collider,CONTACT_RANGE)??this.supportContact(support,ruin.collider.shape,ruin.collider.translation(),ruin.collider.rotation());return !!contact&&contact.normal1.y>=.5&&contact.distance>=-.02&&contact.distance<=CONTACT_RANGE;
  }
  private makeDynamicCapacity(exclude?:Ruin,protectedRuins:ReadonlySet<Ruin>=new Set()):void {
    if(this.options.fractureFacades)return;
    if(this.options.strictExternalActive){if(this.active().filter(r=>r!==exclude).length+this.options.strictExternalActive()>=16)throw new OverhaulRuinSupportError(-1);return;}
    const active=this.active().filter(r=>r!==exclude);if(active.length<OVERHAUL_RUIN_ACTIVE_LIMIT)return;
    const bottom=(r:Ruin)=>r.body.translation().y-overhaulRuinVerticalRadius(r.source,r.body.rotation());
    active.sort((a,b)=>bottom(a)-bottom(b)||a.state.born-b.state.born||a.state.block-b.state.block);
    for(const ruin of active)if(!protectedRuins.has(ruin)&&this.settle(ruin)){this.stats.capacitySettlements++;return;}
    this.stats.supportFailures++;throw new OverhaulRuinSupportError(active[0].state.block);
  }
  /** World sweep plus direct owned fixed-shape casts admits a newly settled
   * stack immediately, without secretly advancing Rapier's broadphase/world. */
  private settle(ruin:Ruin):boolean {
    if(ruin.state.settled)return this.supported(ruin);
    const block=ruin.source,rotation=ruin.body.rotation(),start={...ruin.body.translation()},floor=this.floor(start.x,start.z);
    if(!Number.isFinite(floor))return false;
    // A genuinely sleeping tilted piece may wedge against another column. Its
    // existing native ground contact is stronger evidence than lifting it over
    // that column and pretending it fell again. Confirm the native pair with
    // a short full-shape cast, then retain the solver's actual supported pose.
    let existing:{collider:RAPIER.Collider;contact:NativeSupportContact}|null=null;
    this.world.contactPairsWith(ruin.collider,c=>{
      if(existing||!this.eligible(c))return;const owner=this.byHandle.get(c.handle);if(owner&&!this.supported(owner))return;
      const contact=c.contactCollider(ruin.collider,CONTACT_RANGE)??this.supportContact(c,ruin.collider.shape,start,rotation);
      if(contact&&contact.normal1.y>=.5&&contact.distance>=-.02&&contact.distance<=SKIN+.003){
        this.stats.directSweeps++;const hit=c.castShape(ZERO,ruin.collider.shape,start,rotation,DOWN,SKIN,.05,true);
        if(hit&&this.castNormal(c,hit).y>=.5)existing={collider:c,contact};
      }
    });
    if(existing){const support=existing as {collider:RAPIER.Collider;contact:NativeSupportContact};this.freeze(ruin,start,support.collider,support.contact);return true;}
    // Candidate never projects a sleeping component onto another pose. Missing
    // current contact remains unadmitted support, with the native body retained.
    if(this.options.fractureFacades)return false;
    const extent=radii(block,rotation),radius=extent.y;if(start.y-radius<floor)start.y=floor+radius+SKIN;
    const nearbyFixed:Ruin[]=[];
    for(const support of this.ruins.values())if(support!==ruin&&support.state.settled){
      const p=support.body.translation(),r=radii(support.source,support.body.rotation());
      if(Math.abs(p.x-start.x)>extent.x+r.x+SKIN||Math.abs(p.z-start.z)>extent.z+r.z+SKIN||!this.supported(support))continue;
      nearbyFixed.push(support);
      // A burst may reach capacity before native dynamics can separate source
      // pieces. Cast from clear space above the existing pile; the final pose
      // still comes from an exact native sweep/contact, never this broad bound.
      start.y=Math.max(start.y,p.y+r.y+radius+SKIN);
    }
    const maxToi=Math.min(MAX_SWEEP,Math.max(0,start.y-floor+radius+8)),skipped=new Set<number>();
    let best:{hit:RAPIER.ShapeCastHit;collider:RAPIER.Collider}|null=null;
    for(let attempt=0;attempt<MAX_SKIPPED_HITS;attempt++){
      this.stats.sweeps++;
      const hit=this.world.castShape(start,rotation,DOWN,ruin.collider.shape,SKIN,maxToi,true,STATIC_FLAGS,undefined,ruin.collider,ruin.body,c=>!this.byHandle.has(c.handle)&&!skipped.has(c.handle)&&this.eligible(c));
      if(!hit)break;const contact=hit.time_of_impact<.001?this.supportContact(hit.collider,ruin.collider.shape,start,rotation):null;
      if(this.castNormal(hit.collider,hit).y>=.5||contact&&contact.normal1.y>=.5&&contact.distance>=-.02){best={hit,collider:hit.collider};break;}skipped.add(hit.collider.handle);
    }
    for(const support of nearbyFixed){
      this.stats.directSweeps++;
      const hit=support.collider.castShape(ZERO,ruin.collider.shape,start,rotation,DOWN,SKIN,maxToi,true);
      const contact=hit&&hit.time_of_impact<.001?support.collider.contactShape(ruin.collider.shape,start,rotation,CONTACT_RANGE):null;
      if(hit&&(this.castNormal(support.collider,hit).y>=.5||contact&&contact.normal1.y>=.5&&contact.distance>=-.02)&&(!best||hit.time_of_impact<best.hit.time_of_impact))best={hit,collider:support.collider};
    }
    if(!best||!Number.isFinite(best.hit.time_of_impact))return false;
    const position={x:start.x,y:start.y-best.hit.time_of_impact,z:start.z},contact=this.supportContact(best.collider,ruin.collider.shape,position,rotation);
    if(!contact||contact.normal1.y<.5||contact.distance<-.02||contact.distance>CONTACT_RANGE)return false;
    let penetrated=false;
    this.world.intersectionsWithShape(position,rotation,ruin.collider.shape,c=>{if(c.handle!==best!.collider.handle&&this.eligible(c)&&!this.byHandle.has(c.handle)){const collision=c.contactShape(ruin.collider.shape,position,rotation,0);if(collision&&collision.distance<-.02)penetrated=true;}return !penetrated;},STATIC_FLAGS,undefined,ruin.collider,ruin.body);
    for(const support of nearbyFixed)if(support.collider.handle!==best.collider.handle){const collision=support.collider.contactShape(ruin.collider.shape,position,rotation,0);if(collision&&collision.distance<-.02)penetrated=true;}
    if(penetrated)return false;
    this.freeze(ruin,position,best.collider,contact);return true;
  }
  private freeze(ruin:Ruin,position:Vec3,support:RAPIER.Collider,contact:NativeSupportContact):void {
    ruin.body.setTranslation(position,true);ruin.body.setLinvel(ZERO,false);ruin.body.setAngvel(ZERO,false);ruin.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);this.world.propagateModifiedBodyPositionsToColliders();
    ruin.support={handle:support.handle,point:{...contact.point1},normal:{...contact.normal1}};ruin.state.settled=true;ruin.state.revision=(ruin.state.revision??0)+1;this.readPose(ruin);
  }
  private readPose(ruin:Ruin){Object.assign(ruin.state.position,ruin.body.translation());Object.assign(ruin.state.rotation,ruin.body.rotation());}
  private wake(ruin:Ruin,time:number,protectedRuins:ReadonlySet<Ruin>=new Set()):void {
    if(!ruin.state.settled){ruin.activeSince=time;return;}
    this.makeDynamicCapacity(ruin,protectedRuins);
    ruin.state.settled=false;ruin.state.revision=(ruin.state.revision??0)+1;ruin.support=null;ruin.activeSince=time;
    // Body type changes at the accepted pose: no translation/rotation rewrite.
    ruin.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);ruin.body.recomputeMassPropertiesFromColliders();ruin.body.wakeUp();this.stats.reactivations++;
    this.options.onWake?.(new Set([ruin.collider.handle]));
    // A fixed upper piece cannot retain a lease on a now dynamic support.
    for(const child of this.ruins.values())if(child.state.settled&&child.support?.handle===ruin.collider.handle)this.wake(child,time,protectedRuins);
  }
  get count():number{return this.ruins.size;}
  preflightDetach(blocks:readonly CityBlock[]):void {if(this.options.strictExternalActive){const incoming=blocks.filter(b=>{const index=this.district?.blocks.indexOf(b)??-1;return index>=0&&!this.ruins.has(overhaulFragmentKey(index));}).length;if(this.active().length+this.options.strictExternalActive()+incoming>16)throw new OverhaulRuinSupportError(-1);}}
  get fragmentVersion():'facade-quad-1'|undefined{return this.options.fractureFacades?'facade-quad-1':undefined;}
  owns(handle:number):boolean{return this.byHandle.has(handle);}
  blockForHandle(handle:number):CityBlock|undefined {const r=this.byHandle.get(handle);return r?this.district!.blocks[r.state.block]:undefined;}
  sourceCollider(block:CityBlock):RAPIER.Collider|undefined {return this.sourceColliders(block)[0];}
  sourceColliders(block:CityBlock):RAPIER.Collider[] {const index=this.district?.blocks.indexOf(block)??-1;return[...this.ruins.values()].filter(r=>r.state.block===index).map(r=>r.collider);}
  /** Snapshot current nearest native surfaces before an explosion mutates
   * original geometry. Caller must prove pre-impact world occlusion. */
  impactCandidates(point:Vec3,radius:number):{handle:number;block:number;point:Vec3;distance:number}[] {
    if(![point.x,point.y,point.z,radius].every(Number.isFinite)||radius<0)throw Error('Invalid wreck blast query');
    return[...this.ruins.values()].map(r=>{const p=ruinImpactSurface(r.collider,point);return{handle:r.collider.handle,block:r.state.block,point:p,distance:Math.hypot(p.x-point.x,p.y-point.y,p.z-point.z)};}).filter(p=>p.distance<=radius).sort((a,b)=>a.block-b.block);
  }
  applyWeaponImpact(handles:readonly number[],impact:CityRubbleImpact,time:number,material?:CityBlock['material']):RuinImpactReceipt|null {
    if(this.disposed||!Number.isFinite(time)||time<0)throw Error('Invalid persistent wreck reaction time');
    validateCityRubbleImpact(impact);
    // Legacy whole-piece mode retains its historical bound; the candidate's
    // complete finite source catalog can move without capacity intervention.
    const targets=[...new Set(handles)].map(h=>this.byHandle.get(h)).filter((r):r is Ruin=>!!r).slice(0,this.options.fractureFacades?overhaulFractureBudget(this.district):OVERHAUL_RUIN_ACTIVE_LIMIT);
    if(!targets.length)return null;const protectedRuins=new Set(targets);
    for(const target of targets)this.wake(target,time,protectedRuins);
    const source=this.district!.blocks[targets[0].state.block],budget=impact.strength*RUIN_IMPACT_JOULES_PER_DAMAGE[material??source.material]*(impact.weapon==='rocket'?1.5:1);
    this.lastImpact=applyOverhaulRuinImpact(targets.map(r=>({id:overhaulFragmentKey(r.state.block,r.state.piece),block:r.source,body:r.body,collider:r.collider})),impact,budget);
    this.stats.weaponReactions++;this.stats.peakActive=Math.max(this.stats.peakActive,this.active().length);return this.lastImpact;
  }
  applyCharacterContacts(contacts:readonly CharacterRubbleContact[],budget:CharacterRubbleImpulseBudget,time:number):CharacterRubbleImpulseReceipt|null {
    if(this.disposed||!Number.isFinite(time)||time<0)throw Error('Invalid persistent wreck reaction time');
    const targets=new Set<Ruin>();
    for(const c of contacts){const r=this.byHandle.get(c.colliderHandle);if(!r)continue;
      if(![...Object.values(c.point),...Object.values(c.normal),...Object.values(c.remainingVelocity)].every(Number.isFinite)||Math.hypot(c.normal.x,c.normal.y,c.normal.z)<1e-6)throw Error('Invalid persistent wreck character witness');
      if(-(c.remainingVelocity.x*c.normal.x+c.remainingVelocity.y*c.normal.y+c.remainingVelocity.z*c.normal.z)>0)targets.add(r);
    }
    if(!targets.size)return null;
    const selected=[...targets].sort((a,b)=>a.state.block-b.state.block).slice(0,OVERHAUL_RUIN_ACTIVE_LIMIT),protectedRuins=new Set(selected);
    for(const r of selected)this.wake(r,time,protectedRuins);
    const receipt=applyCharacterRubbleImpulses(contacts,selected.map(r=>({id:`persistent:${overhaulFragmentKey(r.state.block,r.state.piece).toString().padStart(5,'0')}`,body:r.body,collider:r.collider})),budget);
    if(receipt.rows.length)this.stats.characterReactions++;this.stats.peakActive=Math.max(this.stats.peakActive,this.active().length);return receipt;
  }
  advance(time:number):void {
    if(this.disposed)return;if(!Number.isFinite(time))throw new Error('Invalid persistent ruin authority time');
    for(const ruin of this.ruins.values())if(ruin.state.settled&&!this.supported(ruin)){
      this.wake(ruin,time);
    }
    for(const ruin of this.ruins.values()){
      // Only native sleep permits ordinary freezing; age cannot cancel motion.
      if(!ruin.state.settled&&ruin.body.isSleeping())this.settle(ruin);
      this.readPose(ruin);const floor=this.floor(ruin.state.position.x,ruin.state.position.z);
      if(!ruin.state.settled&&Number.isFinite(floor)&&ruin.state.position.y<floor-32){this.stats.supportFailures++;throw new OverhaulRuinSupportError(ruin.state.block);}
    }
    this.stats.peakActive=Math.max(this.stats.peakActive,this.active().length);
  }
  snapshot():OverhaulRuinState[]{return [...this.ruins.values()].sort((a,b)=>overhaulFragmentKey(a.state.block,a.state.piece)-overhaulFragmentKey(b.state.block,b.state.piece)).map(r=>({...r.state,position:{...r.body.translation()},rotation:{...r.body.rotation()}}));}
  handles():Set<number>{return new Set(this.byHandle.keys());}
  collider(block:number,piece?:number):RAPIER.Collider|undefined{return this.ruins.get(overhaulFragmentKey(block,piece))?.collider;}
  patches(settledOnly=true):OverhaulRuinPatch[]{return [...this.ruins.values()].filter(r=>!settledOnly||r.state.settled).flatMap(r=>{this.readPose(r);return overhaulRuinPatches(r.source,r.state).map(p=>({...p,colliderHandle:r.collider.handle}));});}
  diagnostics(){const active=this.active().length;return{...this.stats,active,settled:this.ruins.size-active,total:this.ruins.size,activeLimit:this.options.fractureFacades?overhaulFractureBudget(this.district):OVERHAUL_RUIN_ACTIVE_LIMIT,lastImpact:this.lastImpact};}
  dispose():void {if(this.disposed)return;for(const r of this.ruins.values())if(r.body.isValid())this.world.removeRigidBody(r.body);this.ruins.clear();this.byHandle.clear();this.disposed=true;}
}
export function parseOverhaulRuins(value:unknown,district:CityDistrict|null,time:number,requireFragments=false):OverhaulRuinState[]|null {
  if(value===undefined)return [];if(!Array.isArray(value)||value.length>overhaulFractureBudget(district)||!Number.isFinite(time))return null;
  const fractured=requireFragments||value.some(r=>r&&r.piece!==undefined),parents=new Map<number,Set<number>>(),births=new Map<number,number>();
  const seen=new Set<number>(),result:OverhaulRuinState[]=[];let active=0;
  for(const r of value as OverhaulRuinState[]){
    if(!r||!district||!Number.isInteger(r.block)||r.block<0||r.block>=district.blocks.length||!r.position||!r.rotation||typeof r.settled!=='boolean'||
      fractured&&(!Number.isInteger(r.piece)||r.piece!<0||r.piece!>=overhaulFragmentRecipe(district.blocks[r.block]).length)||
      seen.has(overhaulFragmentKey(r.block,r.piece))||
      ![r.born,r.position.x,r.position.y,r.position.z,r.rotation.x,r.rotation.y,r.rotation.z,r.rotation.w].every(v=>typeof v==='number'&&Number.isFinite(v))||r.born<0||r.born>time||Math.max(Math.abs(r.position.x),Math.abs(r.position.y),Math.abs(r.position.z))>10000||
      Math.abs(Math.hypot(r.rotation.x,r.rotation.y,r.rotation.z,r.rotation.w)-1)>.01||r.revision!==undefined&&(!Number.isSafeInteger(r.revision)||r.revision<0))return null;
    if(!r.settled&&++active>(fractured?overhaulFractureBudget(district):OVERHAUL_RUIN_ACTIVE_LIMIT))return null;
    const length=Math.hypot(r.rotation.x,r.rotation.y,r.rotation.z,r.rotation.w);
    if(births.has(r.block)&&births.get(r.block)!==r.born)return null;births.set(r.block,r.born);
    seen.add(overhaulFragmentKey(r.block,r.piece));const group=parents.get(r.block)??new Set<number>();group.add(r.piece??0);parents.set(r.block,group);
    result.push({block:r.block,...(r.piece!==undefined?{piece:r.piece}:{}),born:r.born,position:{...r.position},rotation:{x:r.rotation.x/length,y:r.rotation.y/length,z:r.rotation.z/length,w:r.rotation.w/length},settled:r.settled,...(r.revision!==undefined?{revision:r.revision}:{})});
  }if(fractured&&[...parents].some(([block,pieces])=>pieces.size!==overhaulFragmentRecipe(district!.blocks[block]).length))return null;
  return result;
}
