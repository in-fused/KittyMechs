import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import {actorHullRadius,actorQuadHeight} from '../../shared/config';
import {chooseSquadPlacement168,squadPairDistance168} from '../../shared/squadPlacement168';
import type {ActorState,Chassis} from '../../shared/types';
import {writeFileSync} from 'node:fs';
beforeAll(async()=>{await RAPIER.init();});
it('rejects actual165 tangency and derives unequal chassis reservations without a universal spacing constant',()=>{const actual=4.599997376965466;expect(actual).toBeLessThan(1.75+1.75+1.1);expect(squadPairDistance168(1.75,1.75)).toBe(6.8);expect(squadPairDistance168(2.05,1.65)).toBeCloseTo(7,12);let calls=0;const point=chooseSquadPlacement168({id:'b',origin:{x:0,y:1,z:0},radius:1.75,height:2.6,slot:1,occupants:[{id:'a',position:{x:0,y:1,z:0},radius:1.75,height:2.6,arrival:1.1}]},(x,z)=>{calls++;return {x,y:1,z};});expect(point?.x).toBe(7);expect(calls).toBe(1);expect(chooseSquadPlacement168({id:'b',origin:{x:0,y:1,z:0},radius:1.75,height:2.6,slot:0,occupants:[]},()=>undefined)).toBeUndefined();});
it('native authority places1..4 unequal chassis safely, repeats the policy at checkpoint, and refuses a completely obstructed spawn',()=>{const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop','FIXTURE168');try{const chassis:Chassis[]=['pounce','bastion','lynx','caracal'],players:ActorState[]=[],initial=[];
 for(let i=0;i<4;i++){const a=sim.addActor('fixture-'+i,'Fixture'+i,chassis[i]);players.push(a);expect(a.hp).toBeGreaterThan(0);expect(sim.inspectSquadPlacement168(a.id)?.status).toBe('PLACED');for(const b of players.slice(0,-1))expect(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)).toBeGreaterThan(squadPairDistance168(actorHullRadius(a),actorHullRadius(b)));initial.push(sim.inspectSquadPlacement168(a.id));}
 // Directed restore fixture invokes the actual existing native restoration
 // routine; it is not public damage/retry or checkpoint qualification.
 sim.checkpoint={objectiveId:'relay-west',name:'Fixture checkpoint',position:{x:-12,y:0,z:-35},activatedAt:sim.time};
 const internal=sim as unknown as {physics:Map<string,unknown>;respawn:(a:ActorState,p:unknown)=>void;squadPlacements168:Map<string,unknown>};internal.squadPlacements168.clear();for(const a of players)a.hp=0;
 for(const a of players){internal.respawn(a,internal.physics.get(a.id));expect(a.hp).toBeGreaterThan(0);expect(sim.inspectSquadPlacement168(a.id)?.status).toBe('PLACED');}
 for(let i=0;i<players.length;i++)for(let j=0;j<i;j++)expect(Math.hypot(players[i].position.x-players[j].position.x,players[i].position.z-players[j].position.z)).toBeGreaterThan(squadPairDistance168(actorHullRadius(players[i]),actorHullRadius(players[j])));
 const restored=players.map(a=>sim.inspectSquadPlacement168(a.id));sim.checkpoint=null;const obstruction=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-8,4,22));world.createCollider(RAPIER.ColliderDesc.cuboid(150,10,150),obstruction);const pending=sim.addActor('blocked','Blocked','pounce');expect(pending.hp).toBe(0);expect(pending.aiState).toBe('destroyed');expect(sim.inspectSquadPlacement168(pending.id)?.status).toBe('PENDING_NATIVE_CLEARANCE');expect(sim.inspectSquadPlacement168(pending.id)?.reservation).toBeNull();expect(pending.respawnAt).toBe(sim.time+.5);
 writeFileSync(new URL('./native-placement-receipt.json',import.meta.url),JSON.stringify({writer:'CLOSED',scope:'DIRECTED_NATIVE_FIXTURE_NO_PUBLIC_COOP_QUALIFICATION',initial,restored,blocked:sim.inspectSquadPlacement168(pending.id),quadHeight:actorQuadHeight(players[0])},null,2));
 }finally{sim.dispose();world.free();}},20000);
