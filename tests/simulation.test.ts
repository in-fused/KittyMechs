import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../shared/simulation';
import { emptyInput } from '../shared/types';
import { chunkKeys, generateChunk } from '../shared/world';
import { ACTOR_RADII } from '../shared/config';
import { parseInput, parseJoin } from '../shared/protocol';
import { segmentSphere } from '../shared/math';
import {climbAnchors} from '../shared/traversal';
beforeAll(async()=>{await RAPIER.init();});
const withSim=(mode:'training'|'coop'|'pvp'|'pvpve',test:(sim:Simulation)=>void)=>{const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);try{test(sim);}finally{sim.dispose();world.free();}};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<seconds*60;i++)sim.step(1/60);};
describe('deterministic streamed world',()=>{
  it('regenerates the same chunk, with seed variation',()=>{expect(generateChunk(7734,2,-1)).toEqual(generateChunk(7734,2,-1));expect(generateChunk(1926,2,-1)).not.toEqual(generateChunk(7734,2,-1));expect(chunkKeys(0,0,2)).toHaveLength(25);});
  it('unloads distant physics chunks without unbounded growth',()=>withSim('pvp',sim=>{sim.addActor('p','Pilot','pounce');sim.syncChunks([{x:0,y:1,z:0}]);const original=sim.world.bodies.len();sim.syncChunks([{x:300,y:1,z:300}]);const far=sim.world.bodies.len();sim.syncChunks([{x:0,y:1,z:0}]);expect(sim.activeChunks).toBe(9);expect(sim.world.bodies.len()).toBe(original);expect(far).toBeLessThan(200);}));
});
describe('authoritative gameplay',()=>{
  it('moves, grounds, jumps and rejects stale held inputs',()=>withSim('pvp',sim=>{const a=sim.addActor('p','Pilot','pounce');advance(sim,1);expect(a.grounded).toBe(true);const before=a.position.z;for(let i=0;i<60;i++){sim.setInput(a.id,{...emptyInput(),seq:i,forward:1});sim.step(1/60);}expect(a.position.z).toBeLessThan(before-5);sim.setInput(a.id,{...emptyInput(),seq:61,jump:true,jumpId:1,jumpEpoch:a.jumpEpoch});sim.step(1/60);expect(a.velocity.y).toBeGreaterThan(5);advance(sim,3);expect(a.grounded).toBe(true);}));
  it('projectiles deal damage, kill, award salvage and respawn',()=>withSim('pvp',sim=>{const a=sim.addActor('a','A','pounce',false,{x:0,y:1.15,z:10}),b=sim.addActor('b','B','pounce',false,{x:0,y:1.15,z:-4});advance(sim,3);for(let i=0;i<210;i++){sim.setInput(a.id,{...emptyInput(),seq:i,fire:true});sim.step(1/60);}expect(a.kills).toBeGreaterThan(0);expect(a.salvage).toBeGreaterThan(0);expect(b.hp).toBe(0);advance(sim,6);expect(b.hp).toBe(b.maxHp);}));
  it('co-op friendly fire is disabled',()=>withSim('coop',sim=>{for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);const a=sim.addActor('a','A','pounce',false,{x:0,y:1.15,z:10}),b=sim.addActor('b','B','pounce',false,{x:0,y:1.15,z:-4});advance(sim,3);const hp=b.hp;for(let i=0;i<100;i++){sim.setInput(a.id,{...emptyInput(),seq:i,fire:true});sim.step(1/60);}expect(b.hp).toBe(hp);}));
  it('AI acquires and attacks pilots',()=>withSim('training',sim=>{const player=sim.addActor('p','Pilot','pounce',false,{x:-12,y:1.15,z:-34});advance(sim,12);expect([...sim.actors.values()].some(a=>a.bot&&a.fireAt>0)).toBe(true);expect(player.hitAt).toBeGreaterThan(0);}));
  it('objective proximity and prerequisites are enforced',()=>withSim('pvpve',sim=>{for(const a of [...sim.actors.values()])if(a.bot)sim.removeActor(a.id);const p=sim.addActor('p','Pilot','pounce',false,{x:0,y:1.15,z:-76});for(let i=0;i<300;i++){sim.setInput(p.id,{...emptyInput(),seq:i,interact:true});sim.step(1/60);}expect(sim.objectives[2].complete).toBe(false);expect(sim.objectives[3].unlocked).toBe(false);}));
  it('completes relays, core and extraction in order',()=>withSim('coop',sim=>{
    for(const a of [...sim.actors.values()])sim.removeActor(a.id);
    for(const [index,seconds] of [3.2,3.2,4.2,8.2].entries()){
      sim.removeActor('p');const o=sim.objectives[index];sim.addActor('p','Pilot','pounce',false,{...o.position,y:1});
      for(let i=0;i<seconds*60;i++){sim.setInput('p',{...emptyInput(),seq:i,interact:true});sim.step(1/60);}
      expect(o.complete).toBe(true);
    }
    expect(sim.phase).toBe('extracted');expect(sim.winner).toBe('p');
  }));
  it('solid cover stops fast projectiles',()=>withSim('pvp',sim=>{
    const a=sim.addActor('a','A','pounce',false,{x:0,y:1,z:10}),b=sim.addActor('b','B','pounce',false,{x:0,y:1,z:-20});
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(4,3,.5).setTranslation(0,3,-6));advance(sim,3);
    for(let i=0;i<180;i++){sim.setInput(a.id,{...emptyInput(),seq:i,fire:true});sim.step(1/60);}
    expect(b.hp).toBe(b.maxHp);expect(a.kills).toBe(0);
  }));
  it('missiles damage multiple nearby targets and respect cooldown',()=>withSim('pvp',sim=>{
    const a=sim.addActor('a','A','pounce',false,{x:0,y:1,z:10}),b=sim.addActor('b','B','pounce',false,{x:0,y:1,z:-4}),c=sim.addActor('c','C','pounce',false,{x:3,y:1,z:-4});advance(sim,3);
    const started=sim.time;
    for(let i=0;i<60;i++){sim.setInput(a.id,{...emptyInput(),seq:i,rocket:true});sim.step(1/60);}
    expect(b.hp).toBeLessThan(b.maxHp);expect(c.hp).toBeLessThan(c.maxHp);expect(a.rocketReadyAt).toBeGreaterThan(started+1.4);
    expect(sim.events.filter(e=>e.type==='shot'&&e.weapon==='rocket')).toHaveLength(1);
  }));
});
describe('network and collision edge cases',()=>{
  it('keeps a moving Pounce outside the visible workshop wall',()=>withSim('pvp',sim=>{
    const actor=sim.addActor('p','Pilot','pounce',false,{x:-36,y:1,z:30});
    advance(sim,1);
    for(let i=0;i<300;i++){sim.setInput(actor.id,{...emptyInput(),seq:i,forward:1,yaw:Math.PI});sim.step(1/60);}
    // Measure the current shipping triangle, including its lower trim, instead
    // of the former box proxy's z=43.6. The complete live hull must stay outside.
    const hit=sim.world.castRayAndGetNormal(new RAPIER.Ray({...actor.position},{x:0,y:0,z:1}),12,false,RAPIER.QueryFilterFlags.ONLY_FIXED),wall=sim.buildingCollider(climbAnchors(sim.seed)[0].meshId!);
    expect(hit).not.toBeNull();expect(wall).toBeDefined();expect(hit!.collider.handle).toBe(wall!.handle);expect(hit!.normal.z).toBeLessThan(-.95);
    expect(actor.position.z).toBeGreaterThan(38);
    expect(actor.position.z+ACTOR_RADII.pounce).toBeLessThanOrEqual(actor.position.z+hit!.timeOfImpact-.015);
    const physics=(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(actor.id)!;
    expect(wall!.intersectsShape(physics.collider.shape,physics.collider.translation(),physics.collider.rotation())).toBe(false);
    expect(actor.grounded).toBe(true);
  }));
  it('keeps eight guardian spawn hulls separate and reuses a vacant slot',()=>withSim('pvp',sim=>{
    const squad=Array.from({length:8},(_,i)=>sim.addActor(`pilot-${i}`,`Pilot ${i}`,'bastion'));
    advance(sim,1);
    for(let i=0;i<squad.length;i++)for(let j=i+1;j<squad.length;j++){
      expect(Math.hypot(squad[i].position.x-squad[j].position.x,squad[i].position.z-squad[j].position.z)).toBeGreaterThan(ACTOR_RADII.bastion*2);
    }
    const vacant={...squad[2].position};sim.removeActor(squad[2].id);
    const replacement=sim.addActor('replacement','Replacement','bastion');advance(sim,1);
    expect(replacement.position.x).toBeCloseTo(vacant.x,1);expect(replacement.position.z).toBeCloseTo(vacant.z,1);
    replacement.hp=0;replacement.respawnAt=sim.time+.1;advance(sim,.3);
    expect(replacement.hp).toBe(replacement.maxHp);expect(replacement.position.x).toBeCloseTo(vacant.x,1);expect(replacement.position.z).toBeCloseTo(vacant.z,1);
  }));
  it('rejects malformed and nonfinite inputs',()=>{expect(parseInput({...emptyInput(),yaw:NaN})).toBeNull();expect(parseInput({...emptyInput(),forward:100})?.forward).toBe(1);expect(parseJoin({type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'<Pilot>',room:'../A',mode:'coop',chassis:'pounce'} )?.room).toBe('A');});
  it('swept projectiles detect a small target between frames',()=>{expect(segmentSphere({x:0,y:0,z:0},{x:100,y:0,z:0},{x:20,y:0,z:0},1)).toBeCloseTo(.19);expect(segmentSphere({x:0,y:0,z:0},{x:100,y:0,z:0},{x:20,y:5,z:0},1)).toBeNull();});
});
