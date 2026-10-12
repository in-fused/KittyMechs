import assert from 'node:assert/strict';
import {it,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import {buildOverhaulDistrict} from '../../shared/overhaulDistrict';
import {cityBlockActive} from '../../shared/cityDistrict';
import {GuestCollisionTiles} from '../../src/game/world/guestCollisionTiles';
import {OverhaulRuinCollisionOwner} from '../../src/game/world/overhaulRuinCollision';
import {OverhaulRuinsOwner,overhaulRuinPatches} from '../../shared/overhaulRuins';
import {RAINLINE_STREET_SUPERSEDED,isRainlineStreetBlock,rainlineStreetSource,cityBlockColliderDesc,streetRuinNavigationBlocks} from '../../shared/rainlineStreetAdmission';
import {chunkAt,terrainHeight,terrainMesh} from '../../shared/world';
import {emptyInput} from '../../shared/types';
import {Navigation} from '../../shared/navigation';
import {CityPresentation} from '../../src/game/world/cityPresentation';
vi.mock('../../src/game/runtime',()=>({runtime:{authority:false,generation:0}}));

it('qualifies real West source ownership, native contact, all four hull paths and persistent damage lifecycle',async()=>{
const out='.sites-runtime/overhaul-20261010/rainline-street-admission-001/native-check.json',record:{status:string;startUTC:string;endUTC?:string;checks:unknown[];failure?:string}={status:'RUNNING',startUTC:new Date().toISOString(),checks:[]};
const save=()=>writeFileSync(out,JSON.stringify(record,null,2));save();
const worlds:RAPIER.World[]=[],cleanups:(()=>void)[]=[];
try{
 await RAPIER.init();const d=buildOverhaulDistrict(7734)!,blocks=d.blocks.filter(isRainlineStreetBlock);assert.equal(blocks.length,10);assert.ok(d.structures.every(s=>!RAINLINE_STREET_SUPERSEDED.has(s.id)));assert.ok(d.blocks.every(b=>!b.structureId||!RAINLINE_STREET_SUPERSEDED.has(b.structureId)));
 const world=new RAPIER.World({x:0,y:-22,z:0}),guestWorld=new RAPIER.World({x:0,y:-22,z:0});worlds.push(world,guestWorld);
 const sim=new Simulation(world,7734,'pvp','STREET_NATIVE'),guest=new GuestCollisionTiles(guestWorld,7734,'pvp');cleanups.push(()=>sim.dispose(),()=>guest.dispose());
 sim.syncChunks([{x:-55,y:1,z:27}]);guest.sync(-1,0);world.step();guestWorld.step();
 for(const block of blocks){const a=sim.buildingCollider(block.id)!,b=guest.buildingCollider(block.id)!;assert.ok(a&&b);
  for(const [label,w,c] of [['authority',world,a],['guest',guestWorld,b]] as const){assert.equal(c.shape.type,RAPIER.ShapeType.ConvexPolyhedron);const p=c.translation();assert.ok(Math.hypot(p.x-block.position[0],p.y-block.position[1],p.z-block.position[2])<1e-4);
   const supports:unknown[]=[],penetrations:unknown[]=[];w.colliders.forEach(other=>{if(other.handle===c.handle||other.isSensor())return;const contact=other.contactCollider(c,.04);if(!contact)return;
    if(contact.distance<-.02)penetrations.push({handle:other.handle,shape:other.shape.type,...contact});if(!other.parent()&&other.shape.type===RAPIER.ShapeType.TriMesh&&contact.normal1.y>=.5&&contact.distance>=-.02&&contact.distance<=.04)supports.push({handle:other.handle,...contact});});
   record.checks.push({gate:'actual-authored-native-ground',label,id:block.id,position:p,supports,penetrations});save();assert.equal(penetrations.length,0,'Authored hull is penetrated '+block.id);assert.ok(supports.length,'Authored hull has no real terrain support '+block.id);
  }
 }
 // Real source hull mass/inertia and persistent support owner, on actual terrain
 // data at original placements. Explicit detach is a focused owner test only.
 const wreckWorld=new RAPIER.World({x:0,y:-22,z:0}),wreckGuestWorld=new RAPIER.World({x:0,y:-22,z:0});worlds.push(wreckWorld,wreckGuestWorld);
 const tile=terrainMesh(-1,0,32,7734);wreckWorld.createCollider(RAPIER.ColliderDesc.trimesh(tile.vertices,tile.indices).setFriction(.85));
 const ruins=new OverhaulRuinsOwner(wreckWorld,d,(x,z)=>terrainHeight(x,z,7734)),wreckGuest=new OverhaulRuinCollisionOwner(wreckGuestWorld,d);cleanups.push(()=>ruins.dispose(),()=>wreckGuest.dispose());
 for(const block of blocks){ruins.detach(block,0,{x:0,y:-1,z:0});const c=ruins.collider(d.blocks.indexOf(block))!,body=c.parent()!,row=rainlineStreetSource(block)!;body.recomputeMassPropertiesFromColliders();assert.equal(c.shape.type,RAPIER.ShapeType.ConvexPolyhedron);assert.ok(Math.abs(body.mass()-row.massKg)<.001);const inertia=body.principalInertia();assert.ok([inertia.x,inertia.y,inertia.z].every(n=>Number.isFinite(n)&&n>0));assert.equal(overhaulRuinPatches(block,ruins.snapshot().find(p=>p.block===d.blocks.indexOf(block))!).length,0);record.checks.push({gate:'native-mass-inertia',id:block.id,mass:body.mass(),inertia});}
 for(let i=1;i<=600;i++){wreckWorld.timestep=1/60;wreckWorld.step();ruins.advance(i/60);}
 const poses=ruins.snapshot();record.checks.push({gate:'persistent-support',poses,diagnostics:ruins.diagnostics()});save();assert.equal(poses.length,10);assert.ok(poses.every(p=>p.settled),'Native wreck failed supported settlement');assert.ok(wreckGuest.sync(poses,600,10));
 for(const p of poses){const c=wreckGuest.collider(p.block)!;assert.equal(c.shape.type,RAPIER.ShapeType.ConvexPolyhedron);assert.ok(Math.hypot(c.translation().x-p.position.x,c.translation().y-p.position.y,c.translation().z-p.position.z)<1e-4);}
 assert.equal(wreckGuest.patches().length,0);assert.equal(streetRuinNavigationBlocks(d,poses).length,10);
 // Existing projectile authority damages a real authored generator owner.
 const generator=blocks.find(b=>rainlineStreetSource(b)?.module==='generator_skid')!,shooter=sim.addActor('street-shooter','StreetNative','pounce',false,{x:-59.8,y:1,z:29.5});let broken=false;
 for(let i=0;i<420;i++){const pitch=Math.atan2(generator.position[1]-(shooter.position.y+.65),Math.abs(generator.position[2]-shooter.position.z)-1.3);sim.setInput(shooter.id,{...emptyInput(),seq:sim.tick+1,fire:true,yaw:0,pitch});sim.step(1/60);if(!cityBlockActive(generator,sim.structures)){broken=true;break;}}
 const after=sim.snapshot();record.checks.push({gate:'real-authority-projectile',broken,tick:after.tick,time:after.time,events:after.events,ruins:after.ruins,structures:after.structures.filter(s=>s.id===generator.structureId)});save();assert.ok(broken,'Actual authored generator was not damaged by projectile');assert.equal(sim.buildingCollider(generator.id),undefined);assert.ok(after.ruins?.some(p=>p.block===d.blocks.indexOf(generator)));
 const presentation=new CityPresentation();presentation.push(after.tick,after.time,after.structures,after.cover,after.rubble,after.events,after.experimentalPhysicalRubble,after.ruins);presentation.register(s=>guest.syncStructures(s.structures));presentation.present(after.time);assert.equal(guest.buildingCollider(generator.id),undefined);
 const navigation=new Navigation(7734);navigation.setStructureFilter(()=>false);navigation.setRainlineStreetRuins(streetRuinNavigationBlocks(d,after.ruins??[]));assert.equal(navigation.walkable({x:generator.position[0],y:1,z:generator.position[2]}),false);
 // Streaming removes owners and does not resurrect a broken source on reentry.
 guest.sync(9,9);guest.sync(-1,0);assert.equal(guest.buildingCollider(generator.id),undefined);
 record.status='PASS_FOCUSED_NATIVE_NOT_GAMEPLAY_ACCEPTANCE';
}catch(error){record.status='FAIL_STOP';record.failure=error instanceof Error?error.stack:String(error);throw error;}
finally{record.endUTC=new Date().toISOString();save();for(const cleanup of cleanups.reverse())cleanup();for(const world of worlds)world.free();console.log(JSON.stringify({status:record.status,failure:record.failure,checks:record.checks.length,out}));}
},90000);
