import {beforeAll,expect,it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {BONDED_SOURCE_ID,BONDED_FRAME_ID,compileBondedMaterial,planBondedHit,bondedComponents,parseBondedMaterial} from '../shared/overhaulBondedMaterial';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {parseInput} from '../shared/protocol';
const district=buildOverhaulDistrict(7734)!,source=district.blocks.find(b=>b.id===BONDED_SOURCE_ID)!,frame=district.blocks.find(b=>b.id===BONDED_FRAME_ID)!,recipe=compileBondedMaterial(source);
beforeAll(async()=>{await RAPIER.init();});
it('has exact closed16-leaf solid coverage and local irreversible28-interface damage across detached topology',()=>{
 expect(recipe.leaves.length).toBe(16);expect(recipe.bonds.length).toBe(28);const volume=recipe.leaves.reduce((s,l)=>s+8*l.half.x*l.half.y*l.half.z,0);expect(volume).toBeCloseTo(6.88,12);expect(volume*1800).toBeCloseTo(12384,10);
 for(const l of recipe.leaves){expect(Math.abs(l.offset.x)+l.half.x).toBeCloseTo(source.halfExtents[0]);expect(Math.abs(l.offset.y)+l.half.y).toBeLessThanOrEqual(source.halfExtents[1]+1e-12);expect(Math.abs(l.offset.z)+l.half.z).toBeLessThanOrEqual(source.halfExtents[2]);}
 for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){const a=recipe.leaves[i],b=recipe.leaves[j];expect((['x','y','z'] as const).some(axis=>Math.abs(a.offset[axis]-b.offset[axis])>=a.half[axis]+b.half[axis]-1e-12)).toBe(true);}
 for(const bond of recipe.bonds.slice(24)){const p={x:source.position[0]+bond.center.x,y:source.position[1]+bond.center.y,z:source.position[2]+bond.center.z};expect(Math.abs(p.x-frame.position[0])).toBeLessThan(frame.halfExtents[0]);expect(Math.abs(p.z-frame.position[2])+bond.half.z).toBeCloseTo(frame.halfExtents[2],10);}
 const strengths=recipe.bonds.map(b=>b.capacity),members=new Set(recipe.leaves.map(l=>l.id)),a=planBondedHit(strengths,recipe.bonds,members,{x:-.2,y:-1.6,z:-1.5},'pulse',5280),b=planBondedHit(a.strengths,recipe.bonds,members,{x:-.2,y:-1.6,z:-1.5},'pulse',5280);
 expect(a.fractureWork+a.kineticBudget).toBe(5280);expect(a.fractureWork).toBeLessThanOrEqual(5280*.6);expect(b.strengths.some((s,i)=>s<a.strengths[i])).toBe(true);expect(a.strengths[27]).toBe(strengths[27]);expect(bondedComponents(strengths,recipe.bonds,true)).toEqual([{id:0,leaves:Array.from({length:16},(_,i)=>i),attached:true}]);
});
it('performs the frozen ordinary material→column route and BOTH full-hull directions; intact control must block',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','BONDED-MATERIAL-001',RAPIER,{experimentalBondedMaterial:true}),actor=sim.addActor('pilot','Pilot','pounce',false,{x:-43.2,y:.92,z:31});let seq=0;
 const internal=sim as unknown as {bondedOwner:import('../shared/overhaulBondedOwner').OverhaulBondedOwner;physics:Map<string,{collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController}>;colliderCell:Map<number,typeof source>;ruinsOwner:import('../shared/overhaulRuins').OverhaulRuinsOwner};
 const stages:unknown[]=[],timings:number[]=[],phaseTimes:Record<string,number[]>= {};sim.onStepTiming=(stage,ms)=>(phaseTimes[stage]??=[]).push(ms);
 const run=(ticks:number,target?:{x:number;y:number;z:number},fire=false,forward=0,strafe=0)=>{for(let i=0;i<ticks;i++){const dx=target?target.x-actor.position.x:1,dz=target?target.z-actor.position.z:0,yaw=target?Math.atan2(-dx,-dz):-Math.PI/2,pitch=target?Math.atan2(target.y-(actor.position.y+.65),Math.hypot(dx,dz)):0;sim.setInput(actor.id,parseInput({...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,aimYaw:yaw,pitch,fire,forward,strafe})!);const start=performance.now();sim.step(1/60);timings.push(performance.now()-start);}};
 const mark=(name:string)=>stages.push({name,time:sim.time,actor:{position:{...actor.position},hp:actor.hp},material:sim.snapshot().bondedMaterial,ruins:sim.snapshot().ruins});
 const crossing=(x:number)=>{for(let i=0;i<720&&actor.hp>0&&Math.abs(actor.position.x-x)>.3;i++){const forward=Math.sign(x-actor.position.x),strafe=Math.abs(31-actor.position.z)>.12?Math.sign(31-actor.position.z):0;run(1,undefined,false,forward,strafe);}return actor.position.x;};
 const obstacle=()=>{const c=internal.physics.get(actor.id)!.collider,hit=world.castShape(c.translation(),c.rotation(),{x:1,y:0,z:0},c.shape,0,5,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,c);return hit&&{toi:hit.time_of_impact,normal:hit.normal1,handle:hit.collider.handle,position:hit.collider.translation(),rotation:hit.collider.rotation(),shape:hit.collider.shape,original:internal.colliderCell.get(hit.collider.handle)?.id,leaf:internal.bondedOwner.leafForHandle(hit.collider.handle),wreck:internal.ruinsOwner.blockForHandle(hit.collider.handle)?.id};};
 let failure:string|null=null;
 try{
  run(60);const beforeX=actor.position.x;run(120,undefined,false,1);expect(actor.position.x).toBeLessThan(source.position[0]-1.75);expect(actor.position.x).toBeGreaterThan(beforeX);mark('blocked-control');
  // Return to authored firing point using accepted movement, never a pose write.
  for(let i=0;i<240&&actor.position.x>-43.2;i++)run(1,undefined,false,-1);mark('source-before');
  for(const l of recipe.leaves){const target={x:source.position[0]-.2,y:source.position[1]+l.offset.y,z:source.position[2]+l.offset.z};run(60,target,true);run(180);mark('leaf-'+l.id);expect(internal.bondedOwner.active+internal.ruinsOwner.diagnostics().active).toBeLessThanOrEqual(16);}
  run(600);mark('native-sleep-before-column');run(360,{x:frame.position[0],y:2.1,z:frame.position[2]},true);run(600);mark('column-consequence');
  const inside=crossing(-33);mark('inside');expect(inside).toBeGreaterThan(source.position[0]+1.75);const outside=crossing(-43.2);mark('outside');expect(outside).toBeLessThan(source.position[0]-1.75);expect(actor.hp).toBeGreaterThan(0);
  const state=sim.snapshot().bondedMaterial!;expect(parseBondedMaterial(state)).not.toBeNull();expect(parseBondedMaterial({...state,components:state.components.slice(1)})).toBeNull();expect(state.strengths.some(s=>s===0)).toBe(true);
 }catch(error){failure=String(error);throw error;}
 finally{mkdirSync('.sites-runtime/overhaul-20261010/bonded-material-001',{recursive:true});writeFileSync('.sites-runtime/overhaul-20261010/bonded-material-001/frozen-route.json',JSON.stringify({failure,scope:'ONE frozen ordinary native route; no render/guest/performance approval',source,frame,stages,actor,obstacle:obstacle(),material:internal.bondedOwner.diagnostics(),ruins:internal.ruinsOwner.diagnostics(),timings,phaseTimes},null,2));sim.dispose();world.free();}
},90000);
