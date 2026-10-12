import {beforeAll,expect,it,vi} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {OverhaulRuinsOwner,type OverhaulRuinState} from '../shared/overhaulRuins';
import {OverhaulRuinSurfaces,overhaulRuinSnapshotFaces,registerOverhaulRuinSurfaces} from '../shared/overhaulRuinSurfaces';
import {OverhaulRuinCollisionOwner} from '../src/game/world/overhaulRuinCollision';
import {faceLanding} from '../shared/buildingSurfaces';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState,type InputState} from '../shared/types';
import {parseInput} from '../shared/protocol';
import type {CityDistrict} from '../shared/cityDistrict';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

vi.mock('../src/game/runtime',()=>({runtime:{authority:false,generation:0}}));
beforeAll(async()=>{await RAPIER.init();});
const geometry=(value:unknown)=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'?Number(v.toFixed(10)):v));
const sourceDistrict=buildOverhaulDistrict(7734)!;
const targets=sourceDistrict.blocks.map((b,i)=>({b,i})).filter(({b})=>b.part==='deck'&&['7734:overhaul:spawn-west','7734:overhaul:spawn-east'].includes(b.buildingId)).map(({i})=>i);
const fillers=sourceDistrict.blocks.map((b,i)=>({b,i})).filter(({b,i})=>b.part==='deck'&&!targets.includes(i)).slice(0,16).map(({i})=>i);
const detached=[...targets,...fillers],topIndex=targets[7];
/** Exact eight authored quarter-slab dimensions/material/IDs, arranged as a
 * controlled collapse burst; remote parts exercise the real16-body capacity.
 * The owner performs every support cast and pose settlement. */
function catalog():CityDistrict {
  const blocks=sourceDistrict.blocks.map((b,index)=>{
    const target=targets.indexOf(index),remote=fillers.indexOf(index);
    return target>=0?{...b,position:[-8,8+target*.6,22] as [number,number,number]}:remote>=0?{...b,position:[80+remote*10,100+remote,0] as [number,number,number]}:b;
  });
  return {...sourceDistrict,id:'controlled-native-collapse',blocks};
}
function detachStack(world:RAPIER.World,d:CityDistrict,time=0){
  const owner=new OverhaulRuinsOwner(world,d,()=>-.08);detached.forEach(i=>owner.detach(d.blocks[i],time,{x:0,y:-1,z:0}));return owner;
}
function fixture(){
  const world=new RAPIER.World({x:0,y:-22,z:0}),d=catalog();
  const ground=world.createCollider(RAPIER.ColliderDesc.cuboid(20,.5,50).setTranslation(0,-.58,0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(100,.5,40).setTranslation(150,-.58,0));world.step();
  const owner=detachStack(world,d),surfaces=new OverhaulRuinSurfaces(owner);surfaces.sync();world.step();
  return {world,d,ground,owner,surfaces};
}
it('compiles real settled coplanar stack patches with exact native wall and full-hull roof ownership',()=>{
  const f=fixture();try{
    expect(f.owner.snapshot().filter(s=>s.settled)).toHaveLength(8);
    const face=f.surfaces.read().find(face=>face.id.startsWith(`ruin-face:${topIndex}:`)&&face.normal.x<-.99)!;
    expect(face).toBeDefined();expect(face.supportingBlockIds).toHaveLength(8);expect(Math.abs(face.normal.y)).toBe(0);
    const landing=faceLanding(face,0,1.75)!;expect(landing).not.toBeNull();
    for(const [x,z] of [[0,0],[-1.75,-1.75],[-1.75,1.75],[1.75,-1.75],[1.75,1.75]]){
      const hit=f.world.castRayAndGetNormal(new RAPIER.Ray({x:landing.x+x,y:landing.y+.4,z:landing.z+z},{x:0,y:-1,z:0}),.8,false,RAPIER.QueryFilterFlags.ONLY_FIXED)!;
      expect(hit).not.toBeNull();expect(hit.normal.y).toBeGreaterThan(.95);expect(face.roofBlockIds.some(key=>f.surfaces.collider(key)?.handle===hit.collider.handle)).toBe(true);
    }
    // One true side-strip hit per source, never an enclosing phantom cuboid.
    for(const block of targets){
      const state=f.owner.snapshot().find(s=>s.block===block)!,hit=f.world.castRayAndGetNormal(new RAPIER.Ray({x:-12.4,y:state.position.y,z:22},{x:1,y:0,z:0}),.8,false,RAPIER.QueryFilterFlags.ONLY_FIXED)!;
      expect(hit.collider.handle).toBe(f.owner.collider(block)!.handle);
    }
  }finally{f.owner.dispose();f.world.free();}
});
it('guest native patches, revision-bound descriptors and support retirement match the authority',()=>{
  const f=fixture(),guestWorld=new RAPIER.World({x:0,y:-22,z:0}),guest=new OverhaulRuinCollisionOwner(guestWorld,f.d),guestSurfaces=new OverhaulRuinSurfaces(guest);
  try{
    // The remote fillers start100m up. Authority time alone must not cancel
    // their motion: actually fall/contact/sleep before asserting fixed poses.
    for(let i=1;i<=600;i++){f.world.timestep=1/60;f.world.step();f.owner.advance(i/60);}f.surfaces.sync();const states=f.owner.snapshot();expect(states.every(s=>s.settled)).toBe(true);
    expect(guest.sync(states,1,10)).toBe(true);guestSurfaces.sync();guestWorld.step();
    expect(geometry(guestSurfaces.read())).toEqual(geometry(f.surfaces.read()));expect(geometry(overhaulRuinSnapshotFaces(f.d,states))).toEqual(geometry(f.surfaces.read()));
    const face=f.surfaces.read().find(face=>face.id.startsWith(`ruin-face:${topIndex}:`))!,key=face.roofBlockIds[0];
    expect(guestSurfaces.collider(key)!.translation()).toEqual(f.surfaces.collider(key)!.translation());
    f.world.removeCollider(f.ground,true);
    f.owner.advance(10.1);f.surfaces.sync();const released=f.owner.snapshot();
    expect(released.filter(s=>targets.includes(s.block)).every(s=>!s.settled)).toBe(true);
    expect(guest.sync(released,2,10.1)).toBe(true);const retired=guestSurfaces.sync();
    expect(retired.has(face.id)).toBe(true);expect(guestSurfaces.live(face)).toBe(false);expect(guestSurfaces.collider(key)).toBeUndefined();
    expect(guestSurfaces.read().some(f=>f.id.startsWith(`ruin-face:${topIndex}:`))).toBe(false);
  }finally{guest.dispose();guestWorld.free();f.owner.dispose();f.world.free();}
});
it('rejects inclined roofs honestly and never turns a narrow real top into a full-hull landing',()=>{
  const d=catalog(),state:OverhaulRuinState={block:targets[0],born:0,revision:1,settled:true,position:{x:0,y:4,z:0},rotation:{x:Math.sin(.2/2),y:0,z:0,w:Math.cos(.2/2)}};
  expect(overhaulRuinSnapshotFaces(d,[state])).toEqual([]);
  const narrow={...d,blocks:d.blocks.map((b,i)=>i===state.block?{...b,halfExtents:[.3,3,.3] as [number,number,number]}:b)};
  state.rotation={x:0,y:0,z:0,w:1};
  const faces=overhaulRuinSnapshotFaces(narrow,[state]);expect(faces.length).toBeGreaterThan(0);expect(faces.every(f=>faceLanding(f,0,1.75)===null)).toBe(true);
});

const command=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>sim.setInput(a.id,parseInput({...emptyInput(),stance:a.stance,seq:sim.tick+1,jumpEpoch:a.jumpEpoch,...patch})!);
it('accepts a17-component collapse burst on actual Simulation TriMesh terrain without a hidden physics step',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),d=catalog();let owner:OverhaulRuinsOwner|undefined;
  try{
    const actor=sim.addActor('pilot','Pilot','pounce',false,{x:-14.05,y:.92,z:22});
    for(let i=0;i<2;i++){command(sim,actor,{});sim.step(1/60);}
    owner=new OverhaulRuinsOwner(world,d,()=>-.08);const nativeSteps=vi.spyOn(world,'step');
    detached.slice(0,17).forEach(i=>owner!.detach(d.blocks[i],sim.time,{x:0,y:-1,z:0}));
    expect(nativeSteps).not.toHaveBeenCalled();expect(owner.diagnostics().active).toBe(16);expect(owner.diagnostics().settled).toBe(1);
    const settled=owner.snapshot().find(s=>s.settled)!,collider=owner.collider(settled.block)!;
    const hit=world.castRay(new RAPIER.Ray({x:-8,y:-.079,z:22},{x:0,y:-1,z:0}),.1,false,RAPIER.QueryFilterFlags.ONLY_FIXED)!;
    expect(hit.collider.shape.type).toBe(RAPIER.ShapeType.TriMesh);
    expect(hit.collider.contactShape(collider.shape,collider.translation(),collider.rotation(),.04)).toBeNull();
    owner.advance(sim.time+.01);expect(owner.snapshot().find(s=>s.block===settled.block)!.settled).toBe(true);
  }finally{owner?.dispose();sim.dispose();world.free();}
});
it('production Pounce climbs a native settled source stack and immediately detaches when its actual support wakes',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),d=catalog(),internal=sim as unknown as {ruinSurfaces:Simulation['ruinSurfaces'];ruinsOwner:Simulation['ruinsOwner']};
  let release=()=>{};
  try{
    // Clear tangent approach avoids intact crawler(-16,.57,20). Its collider
    // remains; unchanged full hull and native paw/roof owners decide admission.
    const actor=sim.addActor('pilot','Pilot','pounce',false,{x:-14.05,y:.92,z:24.1});
    for(let i=0;i<60;i++){command(sim,actor,{});sim.step(1/60);}expect(actor.grounded).toBe(true);
    // Install a controlled source catalog through the actual owner boundary;
    // no Simulation movement/contact method or actor state is mocked/warped.
    internal.ruinsOwner.dispose();
    const owner=detachStack(world,d,sim.time),surfaces=new OverhaulRuinSurfaces(owner);
    internal.ruinsOwner=owner;internal.ruinSurfaces=surfaces;release=registerOverhaulRuinSurfaces(world,surfaces);
    world.createCollider(RAPIER.ColliderDesc.cuboid(100,.5,40).setTranslation(150,-.58,0));
    // Include native fall from100m and sleep instead of the former4s forced cast.
    for(let i=0;i<600;i++){command(sim,actor,{});sim.step(1/60);}surfaces.sync();
    expect(owner.snapshot().every(s=>s.settled)).toBe(true);
    let grabbed=false,mantled=false,finished=false;const trace:unknown[]=[];
    for(let i=0;i<960;i++){
      command(sim,actor,{climb:true,forward:1,yaw:-Math.PI/2});sim.step(1/60);
      if(i%30===0)trace.push({i,position:{...actor.position},climb:actor.climb&&{...actor.climb},energy:actor.energy});
      if(actor.climb){
        if(!grabbed){
          const packet=sim.snapshot(),states=packet.structures.map(s=>({...s,hp:[...s.hp]}));
          for(const ruin of packet.ruins!){const source=sourceDistrict.blocks[ruin.block],bank=states.find(s=>s.id===source.structureId)!;bank.hp[source.cellId!]=0;bank.brokenMask=(bank.brokenMask|(1<<source.cellId!))>>>0;bank.revision++;}
          const accepted={...packet,structures:states};expect(admitStructuralSnapshot(accepted,null)).not.toBeNull();
          const forged={...accepted,actors:accepted.actors.map(a=>a.id===actor.id?{...a,climb:{...a.climb!,anchor:a.climb!.anchor+':forged'}}:a)};
          expect(admitStructuralSnapshot(forged,null)).toBeNull();
          const wakes={...accepted,ruins:accepted.ruins!.map(r=>targets.includes(r.block)?{...r,settled:false,revision:r.revision!+1}:r)};
          expect(admitStructuralSnapshot(wakes,null)).toBeNull();
        }
        grabbed=true;mantled ||= actor.climb.phase==='mantle';
        expect(actor.climb.anchor.startsWith('ruin-face:')).toBe(true);
        if(actor.climb.phase==='mantle'&&['out','lift'].includes(actor.climb.mantleStage!))expect(actor.climb.gripMask|actor.climb.roofMask).toBe(0);
        if(actor.climb.phase==='mantle'&&['transfer','settle'].includes(actor.climb.mantleStage!))expect(actor.position.y-1).toBeGreaterThanOrEqual(actor.climb.top+.1);
      }else if(grabbed){finished=true;break;}
    }
    if(!grabbed){const out='.sites-runtime/overhaul-20261009/wreck-candidate-001';mkdirSync(out,{recursive:true});writeFileSync(out+'/weapon-only-grip-failure.json',JSON.stringify({scope:'Deterministic unchanged-hull regression fixture with persistent character dispatch REMOVED; query/snapshot receipts only.',actor,ruins:owner.snapshot(),diagnostics:owner.diagnostics(),faces:surfaces.read(),actors:sim.snapshot().actors,trace},null,2));}
    expect(grabbed,JSON.stringify(trace)).toBe(true);expect(mantled,JSON.stringify(trace)).toBe(true);expect(finished,JSON.stringify(trace)).toBe(true);
    const top=owner.snapshot().find(s=>s.block===topIndex)!.position.y+.2;
    for(let i=0;i<24;i++){command(sim,actor,{});sim.step(1/60);}expect(actor.grounded).toBe(true);expect(actor.position.y-1).toBeGreaterThanOrEqual(top-.02);
    // Vacate the second pilot's full-hull landing using actual roof walking;
    // occupied landings must continue to reject attachment, including ruins.
    for(let i=0;i<120&&actor.position.x<-6;i++){command(sim,actor,{forward:1,yaw:-Math.PI/2});sim.step(1/60);}
    expect(actor.grounded).toBe(true);expect(actor.position.y-1).toBeGreaterThanOrEqual(top-.02);
    const second=sim.addActor('second','Pilot','pounce',false,{x:-14.05,y:.92,z:24.1});
    for(let i=0;i<60;i++){command(sim,actor,{});command(sim,second,{});sim.step(1/60);}
    for(let i=0;i<120&&!second.climb;i++){command(sim,second,{climb:true,forward:1,yaw:-Math.PI/2});sim.step(1/60);}
    expect(second.climb).not.toBeNull();const anchor=second.climb!.anchor;
    const floor=world.castRay(new RAPIER.Ray({x:-8,y:-.079,z:22},{x:0,y:-1,z:0}),.1,false,RAPIER.QueryFilterFlags.ONLY_FIXED)!;
    expect(floor).not.toBeNull();world.removeCollider(floor.collider,true);owner.advance(sim.time);
    command(sim,second,{climb:true,forward:1,yaw:-Math.PI/2});sim.step(1/60);
    expect(surfaces.live(anchor)).toBe(false);expect(second.climb).toBeNull();expect(owner.snapshot().filter(s=>targets.includes(s.block)).some(s=>!s.settled)).toBe(true);
  }finally{release();sim.dispose();world.free();}
});
