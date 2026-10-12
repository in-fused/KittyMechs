import {beforeAll,expect,it,vi} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute} from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {overhaulFragmentBlock,overhaulFragmentRecipe,overhaulFractureBudget} from '../shared/overhaulFracture';
import {OverhaulRuinsOwner,parseOverhaulRuins} from '../shared/overhaulRuins';
import {OverhaulRuinCollisionOwner} from '../src/game/world/overhaulRuinCollision';
import {OverhaulRuinSurfaces} from '../shared/overhaulRuinSurfaces';
import {clipOverhaulFragment} from '../src/game/world/overhaulFragmentGeometry';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {parseInput} from '../shared/protocol';
vi.mock('../src/game/runtime',()=>({runtime:{authority:false,generation:0}}));
const district=buildOverhaulDistrict(7734)!,facades=district.blocks.filter(b=>overhaulFragmentRecipe(b).length===4);
beforeAll(async()=>{await RAPIER.init();});
const volume=(h:readonly number[])=>8*h[0]*h[1]*h[2];
it('preserves all1123 originals and partitions640 actual facades into3043 finite exact-volume owners',()=>{
 expect(district.blocks.length).toBe(1123);expect(facades.length).toBe(640);expect(overhaulFractureBudget(district)).toBe(3043);
 for(const source of facades){const recipe=overhaulFragmentRecipe(source);expect(recipe.reduce((n,f)=>n+volume(f.halfExtents),0)).toBeCloseTo(volume(source.halfExtents),10);
  for(const f of recipe){const b=overhaulFragmentBlock(source,f.piece);expect(b.material).toBe(source.material);expect(b.structureId).toBe(source.structureId);expect(b.cellId).toBe(source.cellId);
   for(let axis=0;axis<3;axis++)expect(Math.abs(f.offset[axis])+f.halfExtents[axis]).toBeCloseTo(source.halfExtents[axis],12);
   const angle=source.yaw+(/:facade-east-/.test(source.id)?Math.PI/2:/:facade-west-/.test(source.id)?-Math.PI/2:/:facade-north-/.test(source.id)?Math.PI:0);
   const frontHalf=Math.max(source.halfExtents[0],source.halfExtents[2]),x=f.canonicalOffset[0]*2*frontHalf;
   expect(b.position[0]-source.position[0]).toBeCloseTo(x*Math.cos(angle),10);expect(b.position[2]-source.position[2]).toBeCloseTo(-x*Math.sin(angle),10);
  }
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)expect(recipe[i].offset.some((x,a)=>Math.abs(x-recipe[j].offset[a])>=recipe[i].halfExtents[a]+recipe[j].halfExtents[a]-1e-10)).toBe(true);
 }
});
it('closes actual source cut contours and preserves source UV/color/detail primitive ownership',async()=>{
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});await MeshoptDecoder.ready;
 const gltf=await io.read('public/assets/overhaul/city-v3/Rainline_Identity_v3.glb');let primitives=0,triangles=0;
 for(const node of gltf.getRoot().listNodes()){if(!/^(loading|transit|control|residential)_(ground|label|upper)$/.test(node.getName()))continue;
  for(const child of node.listChildren()){const mesh=child.getMesh();if(!mesh)continue;
   for(const p of mesh.listPrimitives()){const source=new BufferGeometry();for(const semantic of p.listSemantics()){const a=p.getAttribute(semantic)!;const name=semantic==='POSITION'?'position':semantic==='NORMAL'?'normal':semantic==='COLOR_0'?'color':semantic==='TEXCOORD_0'?'uv':null;if(name){const component=a.getComponentType(),maximum=component===5120?127:component===5121?255:component===5122?32767:component===5123?65535:1;source.setAttribute(name,new Float32BufferAttribute(Array.from(a.getArray()!).map(v=>a.getNormalized()?Math.max(-1,v/maximum):v),a.getElementSize()));}}source.setIndex(Array.from(p.getIndices()!.getArray()!));
    // Exported child transform is baked by the production adapter.
    source.applyMatrix4(new (await import('three')).Matrix4().fromArray(child.getWorldMatrix()));
    for(const x of [-.25,.25])for(const y of [-.25,.25]){const cut=clipOverhaulFragment(source,[x,y,0]),positions=cut.getAttribute('position');
     expect(Object.keys(cut.attributes)).toEqual(Object.keys(source.attributes));
     for(let i=0;i<positions.count;i++){expect(Math.abs(positions.getX(i))).toBeLessThanOrEqual(.250001);expect(Math.abs(positions.getY(i))).toBeLessThanOrEqual(.250001);expect(Math.abs(positions.getZ(i))).toBeLessThanOrEqual(.500001);}
     triangles+=positions.count/3;cut.dispose();
    }primitives++;source.dispose();
   }
  }
 }expect(primitives).toBeGreaterThanOrEqual(12);
 const cube=new BoxGeometry(1,1,1),cut=clipOverhaulFragment(cube,[.25,.25,0]);let signed=0;const p=cut.getAttribute('position');for(let i=0;i<p.count;i+=3){const a=[p.getX(i),p.getY(i),p.getZ(i)],b=[p.getX(i+1),p.getY(i+1),p.getZ(i+1)],c=[p.getX(i+2),p.getY(i+2),p.getZ(i+2)];signed+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}expect(signed).toBeCloseTo(.25,6);cube.dispose();cut.dispose();
 console.log(JSON.stringify({sourcePrimitives:primitives,clippedTriangles:triangles}));
});
it('admits all four source pieces atomically, keeps exact guest geometry, and never settles a moving burst for capacity',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new OverhaulRuinsOwner(world,district,()=>-.08,{fractureFacades:true}),guestWorld=new RAPIER.World({x:0,y:-22,z:0}),guest=new OverhaulRuinCollisionOwner(guestWorld,district);
 try{facades.slice(0,5).forEach(b=>owner.detach(b,0,{x:-1,y:0,z:0}));const before=owner.snapshot();expect(before.length).toBe(20);expect(before.every(r=>!r.settled)).toBe(true);expect(owner.diagnostics().capacitySettlements).toBe(0);
  expect(parseOverhaulRuins(before,district,0)).not.toBeNull();expect(parseOverhaulRuins(before.slice(1),district,0)).toBeNull();expect(parseOverhaulRuins(before.map((r,i)=>i? r:{...r,piece:4}),district,0)).toBeNull();expect(parseOverhaulRuins(before.map((r,i)=>i? r:{...r,born:.01}),district,1)).toBeNull();expect(guest.sync(before,1,0)).toBe(true);
  for(const r of before){const native=owner.collider(r.block,r.piece)!,proxy=guest.collider(r.block,r.piece)!;expect(proxy.halfExtents()).toEqual(native.halfExtents());expect(proxy.translation()).toEqual(native.translation());}
  world.step();owner.advance(1/60);expect(owner.snapshot().every(r=>!r.settled)).toBe(true);expect(owner.diagnostics().capacitySettlements).toBe(0);
  const surfaces=new OverhaulRuinSurfaces(owner);surfaces.sync();expect(surfaces.read()).toHaveLength(0);
 }finally{guest.dispose();guestWorld.free();owner.dispose();world.free();}
});
it('ordinary accepted pulse commands physically clear the actual west facade for unchanged full Pounce walking',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','FRACTURE-LOCAL',RAPIER,{experimentalFacadeFracture:true});
 const internal=sim as unknown as {ruinsOwner:OverhaulRuinsOwner},source=district.blocks.find(b=>b.id==='7734:overhaul:spawn-west:facade-west-0-3')!;
 expect(source).toBeTruthy();const index=district.blocks.indexOf(source),actor=sim.addActor('breach','Breach','pounce',false,{x:-43.2,y:.92,z:source.position[2]});let seq=0;
 const trace:unknown[]=[],command=(fire:boolean,forward:number)=>sim.setInput(actor.id,parseInput({...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,aimYaw:-Math.PI/2,pitch:0,fire,forward})!);
 try{
  for(let i=0;i<60;i++){command(false,0);sim.step(1/60);}
  for(let i=0;i<960;i++){command(true,0);sim.step(1/60);if(i%120===0)trace.push({tick:sim.tick,actor:{position:{...actor.position},hp:actor.hp,heat:actor.heat},ruins:sim.snapshot().ruins!.filter(r=>r.block===index)});}
  expect(sim.snapshot().ruins!.filter(r=>r.block===index)).toHaveLength(4);
  for(let i=0;i<240;i++){command(false,1);sim.step(1/60);}
  const result={source:source.id,sourcePosition:source.position,actor,ruins:sim.snapshot().ruins,diagnostics:internal.ruinsOwner.diagnostics(),trace};mkdirSync('.sites-runtime/overhaul-20261010/fracture-001',{recursive:true});writeFileSync('.sites-runtime/overhaul-20261010/fracture-001/local-opening.json',JSON.stringify(result,null,2));
  expect(actor.hp).toBeGreaterThan(0);expect(actor.position.x).toBeGreaterThan(source.position[0]+1.75);expect(actor.grounded).toBe(true);
 }finally{sim.dispose();world.free();}
},60000);
it('records exact stopped-hull obstruction and one ordinary upper-aim rocket route without weakening native geometry',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','FRACTURE-LOCAL',RAPIER,{experimentalFacadeFracture:true});
 const source=district.blocks.find(b=>b.id==='7734:overhaul:spawn-west:facade-west-0-3')!,actor=sim.addActor('breach','Breach','pounce',false,{x:-43.2,y:.92,z:source.position[2]});let seq=0;
 const internal=sim as unknown as {physics:Map<string,{collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController}>;colliderCell:Map<number,{block:typeof source}>;ruinsOwner:OverhaulRuinsOwner};
 const command=(fire:boolean,forward:number,rocket=false,pitch=0)=>sim.setInput(actor.id,parseInput({...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,aimYaw:-Math.PI/2,pitch,fire,forward,rocket})!);
 const receipt=()=>{const p=internal.physics.get(actor.id)!,c=p.collider,hit=world.castShape(c.translation(),c.rotation(),{x:1,y:0,z:0},c.shape,0,4,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,c);
  const describe=(collider:RAPIER.Collider)=>({handle:collider.handle,bodyType:collider.parent()?.bodyType(),translation:collider.translation(),rotation:collider.rotation(),shape:collider.shape,original:internal.colliderCell.get(collider.handle),ruin:sim.snapshot().ruins!.find(r=>internal.ruinsOwner.collider(r.block,r.piece)?.handle===collider.handle)});
  return{actor:{position:{...actor.position},hp:actor.hp},query:{center:c.translation(),rotation:c.rotation(),shape:c.shape,velocity:{x:1,y:0,z:0}},hit:hit&&{toi:hit.time_of_impact,normal:hit.normal1,owner:describe(hit.collider)},contacts:Array.from({length:p.controller.numComputedCollisions()},(_,i)=>{const collision=p.controller.computedCollision(i)!;return{toi:collision.toi,normal:collision.normal1,witness:collision.witness1,owner:describe(collision.collider!)};}),ruins:sim.snapshot().ruins};
 };
 try{
  for(let i=0;i<60;i++){command(false,0);sim.step(1/60);}for(let i=0;i<960;i++){command(true,0);sim.step(1/60);}for(let i=0;i<240;i++){command(false,1);sim.step(1/60);}const before=receipt();
  for(let i=0;i<720&&actor.hp>0;i++){const dx=source.position[0]-actor.position.x,pitch=Math.atan2(3.145-(actor.position.y+.65),dx);command(false,0,true,pitch);sim.step(1/60);}
  for(let i=0;i<360&&actor.hp>0;i++){command(false,1);sim.step(1/60);}const after=receipt();mkdirSync('.sites-runtime/overhaul-20261010/fracture-001',{recursive:true});writeFileSync('.sites-runtime/overhaul-20261010/fracture-001/obstruction-upper-rocket.json',JSON.stringify({before,after,diagnostics:internal.ruinsOwner.diagnostics(),events:sim.snapshot().events},null,2));
  console.log(JSON.stringify({scope:'One bounded native observation and ordinary upper-aim rocket attempt',before:before.actor,after:after.actor,obstacle:before.hit?.owner,ruins:after.ruins!.length}));
 }finally{sim.dispose();world.free();}
},60000);
