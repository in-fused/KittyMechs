import fs from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {OwnedCharacterMotion} from '../shared/ownedCharacterMotion';
import {cityDistrict} from '../shared/cityDistrict';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState,type CombatEvent,type InputState,type Vec3} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const bank=cityDistrict(7734)!.structures.find(s=>s.id==='7734:city:building-0:facade')!,cell=bank.cells[3],dt=1/60;
type Owner='dedicated'|'external';
type Hit={dynamic:boolean;normal:Vec3;position:Vec3;handle:number};
type Query={tick:number;id:string;desired:Vec3;move:Vec3;rawGrounded:boolean;hits:Hit[]};
type Frame={tick:number;time:number;lead:ActorState;target:ActorState|null;rubble:number;};
type Physics={collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController};
type Scope={physics:Map<string,Physics>;characterMotion:OwnedCharacterMotion};
type Fixture={world:RAPIER.World;sim:Simulation;lead:ActorState;source:ActorState;target:ActorState|null;tick:(patches?:Record<string,Partial<InputState>>)=>void;frames:Frame[];queries:Query[];events:Map<number,CombatEvent>;};
/** Controlled supported source spawn; all activation is accepted parsed combat.
 * Normal pilots/rival use default admitted slots. The local-pile case reuses the
 * retained source005 placement/schedule. No actor, clock, HP or velocity edits. */
function fixture(label:string,owner:Owner,localPile:boolean,rival:boolean,body:(f:Fixture)=>void){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','TRAINING',RAPIER,{experimentalPhysicalRubble:true}),lead=sim.addActor('lead','Grounding pilot','pounce',false,localPile?{x:123,y:.92,z:cell.position[2]}:undefined),target=rival?sim.addActor('target','Rival','bastion'):null,source=localPile?lead:sim.addActor('source','Remote source','pounce',false,{x:123,y:.92,z:cell.position[2]}),scope=sim as unknown as Scope,frames:Frame[]=[],queries:Query[]=[],events=new Map<number,CombatEvent>();let seq=0;
  const observe=(controller:RAPIER.KinematicCharacterController,collider:RAPIER.Collider,desired:Vec3)=>{const id=[...scope.physics].find(([,p])=>p.collider===collider)![0],hits:Hit[]=[];for(let i=0;i<controller.numComputedCollisions();i++){const hit=controller.computedCollision(i);if(hit?.collider)hits.push({dynamic:hit.collider.parent()?.isDynamic()===true,normal:{...hit.normal1},position:hit.collider.translation(),handle:hit.collider.handle});}queries.push({tick:sim.tick,id,desired:{...desired},move:controller.computedMovement(),rawGrounded:controller.computedGrounded(),hits});};
  const normal=scope.characterMotion.computeColliderMovement.bind(scope.characterMotion),dynamic=scope.characterMotion.computeColliderMovementWithDynamics.bind(scope.characterMotion);
  scope.characterMotion.computeColliderMovement=(...args)=>{normal(...args);observe(args[0],args[1],args[2]);};
  scope.characterMotion.computeColliderMovementWithDynamics=(...args)=>{dynamic(...args);observe(args[0],args[1],args[2]);};
  const inputs:unknown[]=[],tick=(patches:Record<string,Partial<InputState>>={})=>{for(const a of sim.actors.values()){const input=parseInput({...emptyInput(),seq:++seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,stance:a.stance,yaw:a===source?Math.PI/2:0,...patches[a.id]});if(!input)throw Error('Grounding input rejected');inputs.push({tick:sim.tick,id:a.id,input});sim.setInput(a.id,input);}sim.step(dt,owner==='dedicated');if(owner==='external'){world.timestep=dt;world.step();}sim.events.forEach(e=>events.set(e.id,structuredClone(e)));frames.push({tick:sim.tick,time:sim.time,lead:structuredClone(lead),target:target?structuredClone(target):null,rubble:sim.rubble.length});};
  try{body({world,sim,lead,source,target,tick,frames,queries,events});}
  finally{const out=process.env.CITY_RUBBLE_GROUNDING_EVIDENCE;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/${label}-${owner}.json`,JSON.stringify({inputs,frames,queries,events:[...events.values()],physicsFailed:sim.physicsFailed},null,2));}sim.dispose();world.free();}
}
function activate(f:Fixture,active:boolean){
  for(let i=0;i<60;i++)f.tick();expect(f.lead.grounded).toBe(true);
  // Same retained remote source timing; only the control's remote fire differs.
  for(let i=0;i<25;i++)f.tick(active?{[f.source.id]:{fire:true,yaw:Math.PI/2}}:{});
  expect(f.sim.structures.find(s=>s.id===bank.id)!.hp[3]).toBe(active?0:65);expect(f.sim.rubble).toHaveLength(0);f.tick();expect(f.sim.rubble).toHaveLength(active?8:0);
}
const leadQueries=(f:Fixture,after:number)=>f.queries.filter(q=>q.id===f.lead.id&&q.tick>after);
const pose=(a:ActorState)=>({position:a.position,velocity:a.velocity,grounded:a.grounded,groundedOnRubble:a.groundedOnRubble,jumpProcessed:a.jumpProcessed,strike:a.strike,strikeEndedAt:a.strikeEndedAt});

it('remote active rubble preserves confirmed static-only jump and landing accepted paths versus no-rubble controls',()=>{
  for(const owner of ['dedicated','external'] as const){const traces:unknown[][]=[];
    for(const active of [false,true])fixture(`static-rise-${active}`,owner,false,false,f=>{activate(f,active);if(active)expect(Math.hypot(f.lead.position.x-cell.position[0],f.lead.position.z-cell.position[2])).toBeGreaterThan(80);const start=f.sim.tick;f.tick({lead:{jump:true,jumpId:1}});const first=leadQueries(f,start)[0];expect(first.desired.y).toBeGreaterThan(0);expect(first.move.y).toBeGreaterThan(.15);expect(f.lead.grounded).toBe(false);expect(f.lead.velocity.y).toBeCloseTo(12.2-22/60,12);for(let i=0;i<100;i++)f.tick();expect(f.lead.grounded).toBe(true);expect(f.lead.velocity.y).toBe(0);expect(leadQueries(f,start).every(q=>q.hits.every(h=>!h.dynamic))).toBe(true);if(active)expect(f.sim.rubble).toHaveLength(8);traces.push(f.frames.filter(r=>r.tick>start).map(r=>pose(r.lead)));});
    expect(traces[1]).toEqual(traces[0]);
  }
},30000);

it('positive requested motion with exact zero accepted rise under a declared real fixed ceiling retains the original grounding rule',()=>{
  for(const owner of ['dedicated','external'] as const){const traces:unknown[][]=[];
    for(const active of [false,true])fixture(`zero-ceiling-${active}`,owner,false,false,f=>{activate(f,active);const collider=(f.sim as unknown as Scope).physics.get(f.lead.id)!.collider,top=collider.translation().y+collider.halfHeight()+collider.roundRadius();
      // Deliberate fixture: lower surface exactly at the actual native hull top.
      // No simulated result, actor repositioning or tolerance-selected gap.
      f.world.createCollider(RAPIER.ColliderDesc.cuboid(4,.25,4).setTranslation(f.lead.position.x,top+.25,f.lead.position.z));f.world.step();const start=f.sim.tick;f.tick({lead:{jump:true,jumpId:1}});const first=leadQueries(f,start)[0];expect(first.desired.y).toBeGreaterThan(0);expect(first.move.y===0).toBe(true);expect(f.lead.grounded).toBe(first.rawGrounded);for(let i=0;i<30;i++)f.tick();traces.push(f.frames.filter(r=>r.tick>start).map(r=>pose(r.lead)));});
    expect(traces[1]).toEqual(traces[0]);
  }
},30000);

it('retains original descending native grounding, then witnesses actual supported descent over owned rubble',()=>{
  for(const owner of ['dedicated','external'] as const)fixture('descending-support',owner,true,false,f=>{
    for(let i=0;i<60;i++)f.tick();for(const index of [2,3,4,10,11,12]){const c=bank.cells[index],dx=c.position[0]-f.lead.position.x,dz=c.position[2]-f.lead.position.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(c.position[1]-f.lead.position.y-.65,Math.hypot(dx,dz));for(let i=0;i<240&&f.sim.structures.find(s=>s.id===bank.id)!.hp[index]>0;i++)f.tick({lead:{fire:true,yaw,pitch}});expect(f.sim.structures.find(s=>s.id===bank.id)!.hp[index]).toBe(0);}
    for(let i=0;i<360&&f.lead.position.x>110.5;i++)f.tick({lead:{yaw:Math.PI/2,forward:1}});const start=f.sim.tick;f.tick({lead:{yaw:Math.PI/2,forward:1,jump:true,jumpId:f.sim.tick+1}});for(let i=0;i<120;i++)f.tick({lead:{yaw:Math.PI/2,forward:f.lead.position.x>110.5?1:0}});
    // First air-to-ground transition follows the original descending native
    // flag. A grounding/snap query can return no computedCollision witness;
    // this assertion does NOT label that first landing an owned-contact proof.
    const landing=f.frames.find((r,i)=>r.tick>start+1&&r.lead.grounded&&!f.frames[i-1].lead.grounded&&f.frames[i-1].lead.velocity.y<0);expect(landing).toBeDefined();const first=f.queries.find(q=>q.id==='lead'&&q.tick===landing!.tick)!;expect(first.desired.y).toBeLessThan(0);expect(first.rawGrounded).toBe(true);expect(landing!.lead.grounded).toBe(first.rawGrounded);expect(landing!.lead.velocity.y).toBe(0);
    // Separate later support proof: actual downward desired AND accepted
    // movement, actual dynamic upward normal, authoritative rubble support.
    const support=f.queries.find(q=>q.tick>landing!.tick&&q.id==='lead'&&q.desired.y<0&&q.move.y<0&&q.rawGrounded&&q.hits.some(h=>h.dynamic&&h.normal.y>.5)&&f.frames.find(r=>r.tick===q.tick)?.lead.groundedOnRubble);expect(support).toBeDefined();const supported=f.frames.find(r=>r.tick===support!.tick)!;expect(supported.lead.grounded).toBe(true);expect(supported.lead.groundedOnRubble).toBe(true);expect(supported.rubble).toBeGreaterThan(0);expect(supported.lead.velocity.y).toBe(0);
  });
},30000);

it('remote active rubble preserves an ordinary rising pounce rival contact and recovery versus no-rubble controls',()=>{
  for(const owner of ['dedicated','external'] as const){const traces:unknown[][]=[];
    for(const active of [false,true])fixture(`rising-strike-${active}`,owner,false,true,f=>{activate(f,active);while(f.sim.tick<156)f.tick();const yaw=Math.atan2(-(f.target!.position.x-f.lead.position.x),-(f.target!.position.z-f.lead.position.z)),start=f.sim.tick;f.tick({lead:{jump:true,jumpId:1,yaw}});for(let i=1;i<4;i++)f.tick({lead:{yaw}});expect(f.lead.grounded).toBe(false);f.tick({lead:{yaw,strike:true,strikeId:1,boost:true}});expect(f.lead.strike).toMatchObject({id:1,kind:'pounce',stage:'flight'});const accepted=leadQueries(f,f.sim.tick-1)[0];expect(accepted.desired.y).toBeGreaterThan(0);expect(accepted.move.y).toBeGreaterThan(0);expect(f.lead.grounded).toBe(false);for(let i=0;i<60;i++)f.tick({lead:{yaw,strike:true,strikeId:1,boost:true}});const hits=[...f.events.values()].filter(e=>e.type==='impact'&&e.actor==='lead'&&e.target==='target');expect(hits).toHaveLength(1);expect(hits[0].amount).toBe(50);expect(f.target!.hp).toBe(290);expect(f.lead.strike?.stage).not.toBe('flight');expect(f.lead.strikeProcessed).toBe(1);expect(f.frames.some(r=>r.tick>start&&r.lead.strike?.stage==='recovery')).toBe(true);if(active)expect(f.sim.rubble).toHaveLength(8);traces.push(f.frames.filter(r=>r.tick>start).map(r=>({lead:pose(r.lead),target:pose(r.target!)})));});
    expect(traces[1]).toEqual(traces[0]);
  }
},30000);
