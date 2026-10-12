import {beforeAll,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import type {CityBlock,CityDistrict} from '../shared/cityDistrict';
import {OverhaulRuinsOwner} from '../shared/overhaulRuins';
import {applyOverhaulRuinImpact,ruinImpactSurface} from '../shared/overhaulRuinImpact';
import {CharacterRubbleImpulseBudget} from '../shared/characterRubbleImpulse';
import {OverhaulRuinSurfaces} from '../shared/overhaulRuinSurfaces';
import {OverhaulRuinCollisionOwner} from '../src/game/world/overhaulRuinCollision';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {parseInput} from '../shared/protocol';

vi.mock('../src/game/runtime',()=>({runtime:{authority:false,generation:0}}));
beforeAll(async()=>{await RAPIER.init();});
const sourceDistrict=buildOverhaulDistrict(7734)!;
const source=(id:number,p:[number,number,number],h:[number,number,number]=[2,.2,2]):CityBlock=>({...sourceDistrict.blocks[0],id:`impact-fixture:${id}`,position:p,halfExtents:h,yaw:0,material:'brick',cellId:id});
const catalog=(blocks:CityBlock[]):CityDistrict=>({...sourceDistrict,blocks});
const ground=(w:RAPIER.World)=>w.createCollider(RAPIER.ColliderDesc.cuboid(150,.5,80).setTranslation(50,-.5,0).setFriction(.85));
const step=(w:RAPIER.World,o:OverhaulRuinsOwner,t:number,n:number)=>{for(let i=1;i<=n;i++){w.timestep=1/60;w.step();o.advance(t+i/60);}};
const pulse=(point:{x:number;y:number;z:number})=>({point,incoming:{x:0,y:0,z:-1},normal:{x:0,y:0,z:1},weapon:'pulse' as const,strength:22});
// Guest admission normalizes before native float32 storage. Check the derived
// geometry within its representable precision; identifiers/ownership exact.
function sameGeometry(actual:unknown,expected:unknown):void {
  if(typeof expected==='number'){expect(Math.abs((actual as number)-expected)).toBeLessThanOrEqual(2**-22*Math.max(1,Math.abs(expected)));return;}
  if(expected!==null&&typeof expected==='object'){expect(Object.keys(actual as object)).toEqual(Object.keys(expected));for(const key of Object.keys(expected))sameGeometry((actual as Record<string,unknown>)[key],(expected as Record<string,unknown>)[key]);return;}
  expect(actual).toEqual(expected);
}

it('applies one native point-work budget including current oriented body motion, with real torque and no pose write',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0}),b=source(0,[0,3,0],[2,1,.2]);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...b.position).setRotation({x:0,y:Math.sin(.23),z:0,w:Math.cos(.23)}));
  const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(...b.halfExtents).setDensity(1800),body);
  try{
    body.setLinvel({x:.4,y:.2,z:-.7},true);body.setAngvel({x:.1,y:.2,z:-.05},true);world.propagateModifiedBodyPositionsToColliders();
    const pose={p:{...body.translation()},q:{...body.rotation()}},point=ruinImpactSurface(collider,{x:1,y:3.8,z:2});
    const result=applyOverhaulRuinImpact([{id:0,block:b,body,collider}],pulse(point),5280);
    expect(result.work).toBeCloseTo(5280,1);expect(result.pieces[0].mass).toBeCloseTo(5760,1);
    expect({p:{...body.translation()},q:{...body.rotation()}}).toEqual(pose);
    expect(body.linvel().x).toBeCloseTo(.4);expect(body.angvel().x).not.toBeCloseTo(.1);
    const again=applyOverhaulRuinImpact([{id:0,block:b,body,collider}],pulse(point),5280);
    expect(again.work).toBeCloseTo(5280,1);expect(again.impulseScale).toBeLessThan(result.impulseScale);
  }finally{world.free();}
});

it('wakes a fixed full panel before impulse, retires exact guest faces and later re-settles without age removal',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),b=source(0,[0,4,0],[2,2.15,.2]),d=catalog([b]);ground(world);
  const wakes:number[]=[];const owner=new OverhaulRuinsOwner(world,d,()=>0,{onWake:h=>wakes.push(...h)}),surfaces=new OverhaulRuinSurfaces(owner);
  const gw=new RAPIER.World({x:0,y:-22,z:0}),guest=new OverhaulRuinCollisionOwner(gw,d),gs=new OverhaulRuinSurfaces(guest);
  try{
    world.step();owner.detach(b,0,{x:0,y:-1,z:0});step(world,owner,0,480);const before=owner.snapshot()[0];expect(before.settled).toBe(true);
    surfaces.sync();guest.sync([before],1,8);gs.sync();sameGeometry(gs.read(),surfaces.read());const ids=surfaces.read().map(f=>f.id);
    expect(()=>owner.applyWeaponImpact([owner.collider(0)!.handle],{...pulse(before.position),strength:NaN},8)).toThrow();expect(owner.snapshot()[0]).toEqual(before);
    const contact=ruinImpactSurface(owner.collider(0)!,{x:1.6,y:3.8,z:1});owner.applyWeaponImpact([owner.collider(0)!.handle],pulse(contact),8);
    const moving=owner.snapshot()[0];expect(moving.position).toEqual(before.position);expect(moving.rotation).toEqual(before.rotation);expect(moving.revision).toBe(before.revision!+1);expect(moving.settled).toBe(false);expect(wakes).toEqual([owner.collider(0)!.handle]);
    expect(owner.collider(0)!.parent()!.isDynamic()).toBe(true);surfaces.sync();guest.sync([moving],2,8);gs.sync();expect(ids.every(id=>!surfaces.live(id)&&!gs.live(id))).toBe(true);
    expect(Math.hypot(...Object.values(owner.collider(0)!.parent()!.linvel()))).toBeGreaterThan(0);
    expect(guest.collider(0)!.translation()).toEqual(owner.collider(0)!.translation());expect(guest.collider(0)!.halfExtents()).toEqual(owner.collider(0)!.halfExtents());
    // Native friction/contact may return an intact upright panel close to its
    // initial pose. Re-impulse admission does not promise an automatic breach.
    step(world,owner,8,900);const final=owner.snapshot()[0];expect(final.settled).toBe(true);expect(final.revision).toBe(moving.revision!+1);expect(owner.snapshot()).toHaveLength(1);
    guest.sync([final],3,23);surfaces.sync();gs.sync();sameGeometry(gs.read(),surfaces.read());
  }finally{guest.dispose();gw.free();owner.dispose();world.free();}
});

it('recursively releases a real stacked child while protecting the struck parent at the16-active bound',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0});ground(world);
  const blocks=[source(0,[0,8,0]),source(1,[0,9,0]),...Array.from({length:16},(_,i)=>source(i+2,[15+i*5,20+i,0],[1,.2,1]))];
  const owner=new OverhaulRuinsOwner(world,catalog(blocks),()=>0),surfaces=new OverhaulRuinSurfaces(owner);
  try{
    world.step();blocks.forEach(b=>owner.detach(b,0,{x:0,y:-1,z:0}));const before=owner.snapshot();expect(before.slice(0,2).every(r=>r.settled)).toBe(true);expect(owner.diagnostics().active).toBe(16);
    const parent=owner.collider(0)!,child=owner.collider(1)!;expect(parent.contactCollider(child,.04)).not.toBeNull();surfaces.sync();
    const points=before.slice(0,2).map(r=>r.position);owner.applyWeaponImpact([parent.handle],pulse({x:1,y:.2,z:2}),0);
    expect(owner.snapshot().slice(0,2).every(r=>!r.settled)).toBe(true);expect(owner.snapshot().slice(0,2).map(r=>r.position)).toEqual(points);
    expect(parent.parent()!.isDynamic()&&child.parent()!.isDynamic()).toBe(true);expect(owner.diagnostics().active).toBe(16);expect(owner.diagnostics().peakActive).toBe(16);
    surfaces.sync();expect(surfaces.read().some(f=>f.supportingBlockIds.some(id=>id.startsWith('ruin:0:')||id.startsWith('ruin:1:')))).toBe(false);
  }finally{owner.dispose();world.free();}
});

it('shares one rocket work budget across multiple current full pieces rather than one budget per owner',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0}),blocks=[source(0,[-2,2,0],[1,1,.2]),source(1,[2,2,0],[1,1,.2])],owner=new OverhaulRuinsOwner(world,catalog(blocks),()=>-20);
  try{
    blocks.forEach(b=>owner.detach(b,0,{x:0,y:-1,z:0}));const receipt=owner.applyWeaponImpact([...owner.handles()],{...pulse({x:0,y:2,z:.2}),weapon:'rocket',strength:64},0)!;
    expect(receipt.budget).toBe(64*240*1.5);expect(receipt.pieces).toHaveLength(2);expect(receipt.work).toBeCloseTo(receipt.budget,0);
    expect(receipt.pieces.every(p=>p.work>0)).toBe(true);expect(owner.snapshot().map(s=>s.position)).toEqual(blocks.map(b=>({x:b.position[0],y:b.position[1],z:b.position[2]})));
  }finally{owner.dispose();world.free();}
});

it('uses actual committed KCC witnesses to wake cover and spends a single actor reaction budget',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),b=source(0,[0,3,0],[2,2,.2]),owner=new OverhaulRuinsOwner(world,catalog([b]),()=>0);ground(world);
  try{
    world.step();owner.detach(b,0,{x:0,y:-1,z:0});step(world,owner,0,480);expect(owner.snapshot()[0].settled).toBe(true);
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,1)),collider=world.createCollider(RAPIER.ColliderDesc.capsule(.6,.3),body),controller=world.createCharacterController(.005);controller.setApplyImpulsesToDynamicBodies(false);world.step();
    controller.computeColliderMovement(collider,{x:0,y:0,z:-1});const contacts=[];
    for(let i=0;i<controller.numComputedCollisions();i++){const h=controller.computedCollision(i)!;if(h.collider?.handle===owner.collider(0)!.handle)contacts.push({colliderHandle:h.collider.handle,point:{...h.witness1},normal:{...h.normal1},remainingVelocity:{x:h.translationDeltaRemaining.x*60,y:h.translationDeltaRemaining.y*60,z:h.translationDeltaRemaining.z*60}});}
    expect(contacts.length).toBeGreaterThan(0);body.setNextKinematicTranslation({x:0,y:1,z:1+controller.computedMovement().z});
    const budget=new CharacterRubbleImpulseBudget(1800,{x:0,y:0,z:-60}),receipt=owner.applyCharacterContacts(contacts,budget,8)!;
    expect(receipt.rows).toHaveLength(1);expect(receipt.bodyWork).toBeGreaterThan(0);expect(receipt.actorWork-receipt.bodyWork-receipt.dissipated).toBeCloseTo(0,0);expect(owner.snapshot()[0].settled).toBe(false);
    expect(budget.velocity.z).toBeGreaterThan(-60);expect(controller.applyImpulsesToDynamicBodies()).toBe(false);world.removeCharacterController(controller);
  }finally{owner.dispose();world.free();}
});

it('ordinary production pulses break a facade and subsequently react against its persistent actual cover',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
  try{
    const actor=sim.addActor('demolisher','Pilot','pounce',false,{x:-36,y:.92,z:39});
    for(let i=0;i<240;i++){sim.setInput(actor.id,parseInput({...emptyInput(),stance:actor.stance,seq:sim.tick+1,jumpEpoch:actor.jumpEpoch,fire:i>=60,yaw:0})!);sim.step(1/60);}
    const owner=(sim as unknown as {ruinsOwner:OverhaulRuinsOwner}).ruinsOwner as OverhaulRuinsOwner,states=sim.snapshot().ruins!;
    expect(states.length).toBeGreaterThan(0);expect(owner.diagnostics().weaponReactions).toBeGreaterThan(1);expect(owner.diagnostics().lastImpact?.work).toBeGreaterThan(0);
    const panel=sourceDistrict.blocks[states[0].block];expect(sim.structures.find(s=>s.id===panel.structureId)!.hp[panel.cellId!]).toBe(0);expect(owner.collider(states[0].block)!.halfExtents()).toEqual(expect.objectContaining({x:expect.closeTo(panel.halfExtents[0]),y:expect.closeTo(panel.halfExtents[1]),z:expect.closeTo(panel.halfExtents[2])}));
    expect(owner.diagnostics().peakActive).toBeLessThanOrEqual(16);
  }finally{sim.dispose();world.free();}
});
