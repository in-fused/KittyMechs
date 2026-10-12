import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {rooftopEncounter} from '../shared/encounters';
import {ACTOR_HEIGHT,actorHullRadius,actorCollisionHeight} from '../shared/config';
import type {LocalRoofProof} from '../shared/overhaulRoofLocal';
import type {ActorState,Vec3} from '../shared/types';
import {emptyInput} from '../shared/types';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
beforeAll(async()=>{await RAPIER.init();});
type Access={localRoofRoute:(actor:ActorState,goal:Vec3)=>LocalRoofProof|null;navigation:{path:(from:Vec3,to:Vec3)=>Vec3[]};botInput:(actor:ActorState)=>ReturnType<typeof emptyInput>;navigate:(actor:ActorState,goal:Vec3,input:ReturnType<typeof emptyInput>,brain:unknown)=>void;brains:Map<string,unknown>;physics:Map<string,{controller:RAPIER.KinematicCharacterController}>;characterMotion:{beginStep:()=>boolean;endStep:()=>void};moveCharacter:(p:unknown,desired:Vec3)=>unknown;damageCell:(block:CityBlock,amount:number,owner:string,point:Vec3,incoming:Vec3,normal:Vec3)=>void};
function arena(){const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop'),access=sim as unknown as Access,actor=sim.actors.get('roof-guardian')!;world.step();return {world,sim,access,actor,close:()=>{sim.dispose();world.free();}};}
function contacts(world:RAPIER.World,actor:ActorState,position:Vec3){const height=actorCollisionHeight(actor,0),shape=new RAPIER.RoundCylinder(height/2-.12,actorHullRadius(actor)-.12,.12),center={...position,y:position.y+height/2-ACTOR_HEIGHT},handles:number[]=[];world.intersectionsWithShape(center,{x:0,y:0,z:0,w:1},shape,c=>{handles.push(c.handle);return true;},RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);return handles.flatMap(h=>{const c=world.getCollider(h),contact=shape.contactShape(center,{x:0,y:0,z:0,w:1},c.shape,c.translation(),c.rotation(),0);return contact&&contact.distance< -1e-5?[contact.distance]:[];});}
describe('native same-roof local admission',()=>{
 it('keeps all12 authored NPCs/full hull and resolves the preserved occupied home on its same roof',()=>{
  const run=arena();try{
   expect([...run.sim.actors.values()].filter(a=>a.bot)).toHaveLength(12);expect(actorHullRadius(run.actor)).toBe(2.2);expect(actorCollisionHeight(run.actor,0)).toBe(3.2);expect(rooftopEncounter(7734).guardian.position).toEqual({x:-35.5,y:10.92,z:-62.5});
   expect(run.access.localRoofRoute(run.actor,run.actor.position)?.status).toBe('clear');expect(contacts(run.world,run.actor,run.actor.position)).toEqual([]);
   const original={x:-34.037769057006145,y:11.940099705950589,z:-60.797690398593836},oldHome={x:-34,y:11.92,z:-60.5};expect(contacts(run.world,run.actor,original).length).toBeGreaterThan(0);expect(run.access.localRoofRoute({...run.actor,position:original},oldHome)?.status).toBe('blocked');
  }finally{run.close();}
 });
 it('rejects a real swept side obstruction even when both full-hull endpoints are clear',()=>{
  const run=arena();try{
   const from={x:-35.5,y:11.94,z:-60.8},to={x:-35.5,y:11.94,z:-62.5},actor={...run.actor,position:from};expect(run.access.localRoofRoute(actor,to)?.status).toBe('clear');
   run.world.createCollider(RAPIER.ColliderDesc.cuboid(.03,.6,.03).setTranslation(-33.31,12.8,-61.65));run.world.step();expect(contacts(run.world,run.actor,from)).toEqual([]);expect(contacts(run.world,run.actor,to)).toEqual([]);expect(run.access.localRoofRoute(actor,to)?.status).toBe('blocked');
  }finally{run.close();}
 });
 it('uses current owned support and rejects accepted deck retirement during the repath interval',()=>{
  const run=arena();try{
   const goal={...run.actor.position},from={...goal,z:goal.z+1.7},actor={...run.actor,position:from};expect(run.access.localRoofRoute(actor,goal)?.status).toBe('clear');
   const deck=cityDistrict(7734)!.blocks.find(b=>b.id.endsWith('west-relay-yard:roof-0'))!;run.access.damageCell(deck,10000,'fixture',goal,{x:0,y:0,z:0},{x:0,y:1,z:0});run.world.step();expect(run.access.localRoofRoute(actor,goal)?.status).toBe('unsupported');
  }finally{run.close();}
 });
 it('still rejects the original obstruction after accepted hardware damage makes it owned moving debris',()=>{
  const run=arena();try{
   const original={x:-34.037769057006145,y:11.940099705950589,z:-60.797690398593836},oldHome={x:-34,y:11.92,z:-60.5};
   for(const suffix of ['sky-uplink-mast','sky-uplink-terminal']){const block=cityDistrict(7734)!.blocks.find(b=>b.id.endsWith('west-relay-yard:'+suffix))!;run.access.damageCell(block,10000,'fixture',original,{x:0,y:0,z:0},{x:0,y:1,z:0});}run.world.step();
   // Vanilla EXCLUDE_DYNAMIC ignores these actual detached pieces. The source
   // solidArgs owner filter must keep them in the full native route proof.
   expect(contacts(run.world,run.actor,original)).toEqual([]);expect(run.access.localRoofRoute({...run.actor,position:original},oldHome)?.status).toBe('blocked');
  }finally{run.close();}
 });
 it('bypasses only the eligible local roof domain; ground and cross-roof controls stay outside it',()=>{
  const run=arena();try{
   const from={...run.actor.position,z:run.actor.position.z+1.7};expect(run.access.localRoofRoute({...run.actor,position:from},run.actor.position)?.status).toBe('clear');
   expect(run.access.localRoofRoute(run.actor,{x:-35.5,y:1,z:-62.5})).toBeNull();expect(run.access.localRoofRoute(run.actor,{x:52,y:19,z:-55})).toBeNull();
   run.access.navigation.path=()=>{throw Error('local roof must not enter ground grid');};const input=emptyInput();run.access.navigate({...run.actor,position:from},run.actor.position,input,run.access.brains.get(run.actor.id));expect(Math.abs(input.forward)+Math.abs(input.strafe)).toBeGreaterThan(.9);
  }finally{run.close();}
 });
 it('admits the same full native controller movement along the clear supported corridor',()=>{
  const run=arena();try{
   const goal={...run.actor.position},from={...goal,y:goal.y+.02,z:goal.z+1.7};run.sim.removeActor(run.actor.id);const actor=run.sim.addActor('roof-guardian','Native fixture','pounce',true,from,'anchor');run.world.step();
   expect(run.access.localRoofRoute(actor,goal)?.status).toBe('clear');const physics=run.access.physics.get(actor.id)!;run.access.characterMotion.beginStep();try{run.access.moveCharacter(physics,{x:0,y:-.02,z:-1.7});}finally{run.access.characterMotion.endStep();}const move=physics.controller.computedMovement();expect(move.z).toBeLessThan(-1.65);expect(Math.abs(move.x)).toBeLessThan(.01);expect(run.access.localRoofRoute({...actor,position:{x:from.x+move.x,y:from.y+move.y,z:from.z+move.z}},goal)?.status).toBe('clear');
  }finally{run.close();}
 });
 it('uses the actual guardian idle hook after normal native combat motion and a teammate departure',()=>{
  const run=arena();try{
   const home={...run.actor.position},human=run.sim.addActor('fixture-human','Human','pounce',false,{x:-30,y:11.94,z:-60.5});for(let i=0;i<80;i++)run.sim.step(1/60);
   expect(Math.hypot(run.actor.position.x-home.x,run.actor.position.z-home.z)).toBeGreaterThan(.3);expect(run.access.localRoofRoute(run.actor,home)?.status).toBe('clear');run.sim.removeActor(human.id);
   const prior=run.access.localRoofRoute.bind(run.access),ground=run.access.navigation.path.bind(run.access.navigation);let calls=0;run.access.localRoofRoute=(actor,goal)=>{if(actor.id===run.actor.id)calls++;return prior(actor,goal);};run.access.navigation.path=(from,to)=>{if(Math.hypot(from.x-run.actor.position.x,from.z-run.actor.position.z)<1e-4)throw Error('actual guardian idle hook reached ground grid');return ground(from,to);};
   run.sim.step(1/60);expect(calls).toBeGreaterThan(0);expect([...run.sim.actors.values()].filter(a=>a.bot)).toHaveLength(12);
  }finally{run.close();}
 });
});
