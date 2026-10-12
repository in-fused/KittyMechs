import fs from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState,type Chassis,type CombatEvent,type InputState} from '../shared/types';
import {ACTOR_HEIGHT} from '../shared/config';
import {terrainHeight} from '../shared/world';
import type {ActorTravel,FelineStrikeMode} from '../shared/felineStrike';
import type {OwnedCharacterMotion} from '../shared/ownedCharacterMotion';

beforeAll(async()=>{await RAPIER.init();});
const chassis=['pounce','bastion','lynx','caracal'] as const;
const kinds=['pounce','dive','tackle'] as const;
// Independent gameplay contract literals, not expectations mirrored from profiles.
const damage:Record<FelineStrikeMode,readonly number[]>={pounce:[50,65,38,44],dive:[56,72.8,42.56,49.28],tackle:[52.5,68.25,39.9,46.2]};
type Variant='rival'|'npc'|'ally'|'protected'|'shield'|'receding'|'wall';
type ObservedTravel=ActorTravel&{life:number;redirected:boolean;approach?:{target:string;to:ActorTravel['to'];fraction:number};};
type Physics={body:RAPIER.RigidBody;controller:RAPIER.KinematicCharacterController;collider:RAPIER.Collider;};
type Scope={characterMotion:OwnedCharacterMotion;physics:Map<string,Physics>;resolveStrikes:(travel:Map<string,ObservedTravel>,retiring:Set<string>)=>void;};
interface Receipt {label:string;placement:string;inputs:unknown[];frames:unknown[];routes:unknown[];collisions:unknown[];events:CombatEvent[];accepted:unknown[];sourceLife:number;targetHpBefore:number;sourceHpBefore:number;targetHpAfter:number;sourceHpAfter:number;targetHurtBefore:number;targetHurtAfter:number;targetShield:number;processed:number;finalStage:string|null;groundedAtLaunch:boolean;airborneAtShift:boolean;targetMoved:number;}
const evidence=process.env.FELINE_MODES_EVIDENCE;
type DiveFixture='original'|'higher-ascent';
// Original57 bytes/failures are retained in source-integration-001. Only the two
// physically missing NPC dives get NEW positive coverage; their old schedules
// remain separate negative regressions below, not rewritten historical passes.
function scenario(chassisId:Chassis,kind:FelineStrikeMode,variant:Variant,fixture:DiveFixture='original'):Receipt {
  const higher=fixture==='higher-ascent';
  const world=new RAPIER.World({x:0,y:-22,z:0}),cooperative=variant==='npc'||variant==='ally',sim=new Simulation(world,7734,cooperative?'coop':'pvp',`MODE-${variant}`);
  const source=sim.addActor('source','Source',chassisId);
  const targetChassis=variant==='shield'?'bastion':chassis[(chassis.indexOf(chassisId)+1)%4];
  const spawnNpc={x:source.position.x+4.6,y:terrainHeight(source.position.x+4.6,source.position.z,7734)+ACTOR_HEIGHT,z:source.position.z};
  let target=variant==='protected'?null:sim.addActor('target','Target',variant==='npc'?'pounce':targetChassis,variant==='npc',variant==='npc'?spawnNpc:undefined,variant==='npc'?'scout':undefined);
  const receipt:Receipt={label:`${chassisId}-${kind}-${variant}${kind==='dive'&&variant==='npc'?'-'+fixture:''}`,placement:variant==='npc'?'Controlled encounter: explicit supported ground Scout placement beside the default human slot; unmodified botInput/KCC and all shipped NPCs retained. Not a shipped-encounter route proof.':'Default admitted human slots on actual Rainline terrain; no state/collider/hp/velocity/form edits.',inputs:[],frames:[],routes:[],collisions:[],events:[],accepted:[],sourceLife:source.jumpEpoch,targetHpBefore:0,sourceHpBefore:0,targetHpAfter:0,sourceHpAfter:0,targetHurtBefore:0,targetHurtAfter:0,targetShield:0,processed:0,finalStage:null,groundedAtLaunch:false,airborneAtShift:false,targetMoved:0};
  const scope=sim as unknown as Scope,originalResolve=scope.resolveStrikes.bind(sim);
  scope.resolveStrikes=(travel,retiring)=>{if(source.strike)receipt.routes.push({tick:sim.tick,time:sim.time,source:travel.get(source.id),target:target?travel.get(target.id):undefined,retiring:[...retiring]});originalResolve(travel,retiring);};
  const controller=scope.physics.get(source.id)!.controller,motion=scope.characterMotion,compute=motion.computeColliderMovement.bind(motion);
  motion.computeColliderMovement=(...args:Parameters<OwnedCharacterMotion['computeColliderMovement']>)=>{
    const result=compute(...args);
    // Original native KCC has completed AND the motion class's finally has
    // restored every body. Do not read computed results inside its Fixed window.
    if(args[0]===controller&&source.strike){
      for(const p of scope.physics.values())expect(p.body.bodyType()).toBe(RAPIER.RigidBodyType.KinematicPositionBased);
      const hits=[];for(let i=0;i<controller.numComputedCollisions();i++){const h=controller.computedCollision(i)!;hits.push({collider:h.collider?.handle,target:h.collider?.handle===scope.physics.get('target')?.collider.handle,toi:h.toi,applied:h.translationDeltaApplied,remaining:h.translationDeltaRemaining,normal:h.normal1});}
      receipt.collisions.push({tick:sim.tick,from:{...source.position},requested:args[2],accepted:controller.computedMovement(),grounded:controller.computedGrounded(),hits});
    }
    return result;
  };
  let sequence=0,lastEvent=0;const accepted=new Set<string>();
  const stance=kind==='tackle'?'upright':'quadruped';
  const yaw=()=>target?Math.atan2(-(target.position.x+(higher?target.velocity.x*.10:0)-source.position.x),-(target.position.z+(higher?target.velocity.z*.10:0)-source.position.z)):-Math.PI/2;
  function send(actor:ActorState,extra:Partial<InputState>={}){
    const input=parseInput({...emptyInput(),seq:++sequence,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,stance:actor===source?stance:'quadruped',yaw:actor===source?yaw():0,...extra});
    if(!input)throw Error('Ordinary input rejected');receipt.inputs.push({tick:sim.tick,actor:actor.id,input});sim.setInput(actor.id,input);
  }
  function step(sourceExtra:Partial<InputState>={},targetExtra:Partial<InputState>={}){
    send(source,sourceExtra);if(target&&!target.bot)send(target,targetExtra);sim.step(1/60);
    const fresh=sim.events.filter(e=>e.id>lastEvent);if(fresh.length)lastEvent=Math.max(...fresh.map(e=>e.id));receipt.events.push(...structuredClone(fresh));
    if(source.strike){const id=`${source.strike.life}/${source.strike.id}`;if(!accepted.has(id)){accepted.add(id);receipt.accepted.push(structuredClone(source.strike));}}
    receipt.frames.push({tick:sim.tick,time:sim.time,source:structuredClone(source),target:target?structuredClone(target):null});
  }
  try{
    if(variant==='wall'){
      // Deliberate REAL static test wall, not a relaxed collider or invisible
      // collision bypass. Both default starting hulls are clear of this plane.
      world.createCollider(RAPIER.ColliderDesc.cuboid(.025,8,6).setTranslation((source.position.x+target!.position.x)/2,terrainHeight(source.position.x,source.position.z,7734)+8,source.position.z));
    }
    for(let i=0;i<156;i++){
      const range=target?Math.hypot(target.position.x-source.position.x,target.position.z-source.position.z):0;
      step({forward:variant==='npc'&&range>4.6?1:0});
    }
    if(variant==='protected'){target=sim.addActor('target','Late protected rival',targetChassis);for(let i=0;i<6;i++)step();}
    if(variant==='receding')for(let i=0;i<30;i++)step({}, {strafe:1,yaw:0});
    if(variant==='shield')step({}, {boost:true});
    receipt.targetHpBefore=target!.hp;receipt.sourceHpBefore=source.hp;receipt.targetHurtBefore=target!.hurtAt;receipt.targetShield=target!.shieldUntil;
    const originalTarget={...target!.position};receipt.groundedAtLaunch=source.grounded;
    step({jumpId:1,jump:true,forward:higher?.45:0},variant==='receding'?{strafe:1,yaw:0}:{});
    const delay=higher?20:kind==='tackle'?1:kind==='dive'?8:4;
    for(let i=1;i<delay;i++)step({forward:higher?.45:0},variant==='receding'?{strafe:1,yaw:0}:{});
    receipt.airborneAtShift=!source.grounded;
    // Held ordinary Shift request: one life-bound ID, no manufactured launch.
    for(let i=0;i<60;i++)step({strikeId:1,strike:true,boost:true,pitch:kind==='dive'?(higher?-.4:-.6):0},variant==='receding'?{strafe:1,yaw:0}:{});
    // Genuine release followed by duplicate old ID, still under cooldown. It
    // cannot produce a second contact or silently fire a landing ability.
    step();for(let i=0;i<6;i++)step({strikeId:1,strike:true,boost:true,pitch:kind==='dive'?(higher?-.4:-.6):0});
    if(variant==='protected')for(let i=0;i<150;i++)step({strikeId:1,strike:true,boost:true});
    receipt.targetMoved=Math.hypot(target!.position.x-originalTarget.x,target!.position.z-originalTarget.z);
    receipt.targetHpAfter=target!.hp;receipt.sourceHpAfter=source.hp;receipt.targetHurtAfter=target!.hurtAt;receipt.processed=source.strikeProcessed;receipt.finalStage=source.strike?.stage??null;
    return receipt;
  }finally{
    if(evidence){fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(`${evidence}/${receipt.label}.json`,JSON.stringify(receipt,null,2));}
    sim.dispose();world.free();
  }
}
const impacts=(r:Receipt)=>r.events.filter(e=>e.type==='impact'&&e.actor==='source'&&e.target==='target');
function acceptedAction(r:Receipt,kind:FelineStrikeMode){
  expect(r.groundedAtLaunch).toBe(true);expect(r.airborneAtShift).toBe(true);expect(r.accepted).toHaveLength(1);
  expect(r.accepted[0]).toMatchObject({id:1,life:r.sourceLife,kind});expect(r.processed).toBe(1);expect(r.finalStage).not.toBe('flight');expect(r.routes.length).toBeGreaterThan(0);
}
function nextTickKnockback(r:Receipt,event:CombatEvent){
  const frames=r.frames as {time:number;target:ActorState}[],index=frames.findIndex(f=>Math.abs(f.time-event.at)<1e-7);
  expect(index).toBeGreaterThanOrEqual(0);expect(index+1).toBeLessThan(frames.length);const at=frames[index].target,next=frames[index+1].target,n=event.normal!;
  expect(n).toBeDefined();const dx=next.position.x-at.position.x,dy=next.position.y-at.position.y,dz=next.position.z-at.position.z;
  // Retained009's lowest damaging next-tick away motion is .0527926m;
  // qualified new dives are .0854646/.0715997m. Use an independent lower bound.
  expect(-dx*n.x-dy*n.y-dz*n.z).toBeGreaterThan(.04);
}
function minimumAcceptedSideGap(r:Receipt){
  const rows=r.routes as {source:ActorTravel&{approach?:{target:string;to:ActorTravel['to'];fraction:number}};target:ActorTravel&{normalPathObserved?:boolean;actorCollision?:boolean;redirected?:boolean;corrected?:boolean}}[];const gaps:number[]=[];
  for(const {source:a,target:b} of rows){if(!a||!b)continue;
    const check=(source:ActorTravel,target:ActorTravel)=>{
      const dy0=source.from.y-target.from.y+(source.height-target.height)/2,dy1=source.to.y-target.to.y+(source.height-target.height)/2;
      expect(Math.max(Math.abs(dy0),Math.abs(dy1))).toBeLessThan((source.height+target.height)/2-.24);
      const rx=source.from.x-target.from.x,rz=source.from.z-target.from.z,vx=source.to.x-source.from.x-(target.to.x-target.from.x),vz=source.to.z-source.from.z-(target.to.z-target.from.z),den=vx*vx+vz*vz,f=den>1e-24?Math.max(0,Math.min(1,-(rx*vx+rz*vz)/den)):0;
      gaps.push(Math.hypot(rx+vx*f,rz+vz*f)-source.radius-target.radius);
    };
    check(a,b);const leg=a.approach;
    if(leg?.target==='target'&&b.normalPathObserved===true&&!b.actorCollision&&!b.redirected&&!b.corrected){const f=leg.fraction;check({...a,to:leg.to},{...b,to:{x:b.from.x+(b.to.x-b.from.x)*f,y:b.from.y+(b.to.y-b.from.y)*f,z:b.from.z+(b.to.z-b.from.z)*f}});}
  }
  expect(gaps.length).toBeGreaterThan(0);return Math.min(...gaps);
}
describe('all feline strike modes on real accepted authority motion',()=>{
  for(const id of chassis)for(const kind of kinds)for(const category of ['rival','npc'] as const){
    const higher=category==='npc'&&kind==='dive'&&(id==='pounce'||id==='caracal');
    it(`${id} ${kind} damages ${category} once${higher?' with NEW higher-ascent/closing/lead fixture':' through real stance/jump/Shift'}`,()=>{
      const r=scenario(id,kind,category,higher?'higher-ascent':'original');acceptedAction(r,kind);
      const hits=impacts(r);expect(hits).toHaveLength(1);expect(hits[0].amount).toBeCloseTo(damage[kind][chassis.indexOf(id)],6);
      expect(r.targetHpBefore-r.targetHpAfter).toBeCloseTo(damage[kind][chassis.indexOf(id)],6);expect(r.targetHurtAfter).toBe(hits[0].at);
      expect(hits[0].normal).toBeDefined();expect(r.collisions.length).toBeGreaterThan(0);nextTickKnockback(r,hits[0]);
    });
  }
  for(const id of ['pounce','caracal'] as const)it(`${id} original8tick pitch-.6 NPC dive remains a physical MISS (retained failed positive history)`,()=>{
    const r=scenario(id,'dive','npc','original');acceptedAction(r,'dive');expect(impacts(r)).toHaveLength(0);
    expect(r.targetHpAfter).toBe(r.targetHpBefore);expect(r.targetHurtAfter).toBe(r.targetHurtBefore);
    // Exact side-separation arithmetic only for these recorded core-overlap
    // paths. This does not manufacture a native .02 swept candidate.
    expect(minimumAcceptedSideGap(r)).toBeGreaterThan(.0201);
  });
  for(const id of chassis)for(const kind of kinds)it(`${id} ${kind} preserves the co-op human ally`,()=>{
    const r=scenario(id,kind,'ally');acceptedAction(r,kind);expect(impacts(r)).toHaveLength(0);expect(r.targetHpAfter).toBe(r.targetHpBefore);expect(r.targetHurtAfter).toBe(r.targetHurtBefore);
  });
  for(const kind of kinds)it(`${kind} reserves naturally protected contact without deferred damage`,()=>{
    const r=scenario('pounce',kind,'protected');acceptedAction(r,kind);expect(r.targetHpAfter).toBe(r.targetHpBefore);expect(r.targetHurtAfter).toBe(r.targetHurtBefore);const hits=impacts(r);expect(hits).toHaveLength(1);expect(hits[0].amount).toBe(0);
  });
  for(const id of chassis)for(const kind of kinds)it(`${id} ${kind} respects the actual Bastion ground ability shield`,()=>{
    const r=scenario(id,kind,'shield');acceptedAction(r,kind);const hits=impacts(r);expect(hits).toHaveLength(1);expect(r.targetShield).toBeGreaterThan(2.6);
    expect(hits[0].amount).toBeCloseTo(damage[kind][chassis.indexOf(id)]*.7,6);expect(r.targetHpBefore-r.targetHpAfter).toBeCloseTo(damage[kind][chassis.indexOf(id)]*.7,6);nextTickKnockback(r,hits[0]);
  });
  for(const kind of kinds)it(`${kind} misses a genuinely receding target`,()=>{
    const r=scenario('pounce',kind,'receding');acceptedAction(r,kind);expect(r.targetMoved).toBeGreaterThan(2);expect(impacts(r)).toHaveLength(0);expect(r.targetHpAfter).toBe(r.targetHpBefore);
  });
  for(const kind of kinds)it(`${kind} stays blocked by a real static wall`,()=>{
    const r=scenario('pounce',kind,'wall');acceptedAction(r,kind);expect(impacts(r)).toHaveLength(0);expect(r.targetHpAfter).toBe(r.targetHpBefore);
  });
});
