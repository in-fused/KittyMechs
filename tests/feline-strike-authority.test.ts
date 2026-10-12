import fs from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {STRIKE_PROFILES,sweepFelineContact,type ActorTravel} from '../shared/felineStrike';
import {emptyInput,type ActorState,type Chassis,type CombatEvent,type InputState,type Mode} from '../shared/types';
import {ACTOR_HEIGHT,UPRIGHT_HEIGHT} from '../shared/config';
import {terrainHeight} from '../shared/world';
import {parseInput} from '../shared/protocol';
beforeAll(async()=>{await RAPIER.init();});
type Fixtures={physics:Map<string,{body:RAPIER.RigidBody;collider:RAPIER.Collider;protectedUntil:number}>};
function run(test:(sim:Simulation)=>void,mode:Mode='pvp') {const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,1926,mode);for(const actor of [...sim.actors.values()])sim.removeActor(actor.id);sim.time=3;sim.tick=180;try{test(sim);}finally{sim.dispose();world.free();}}
function pilot(sim:Simulation,id:string,chassis:Chassis='pounce',z=208,bot=false):ActorState {const actor=sim.addActor(id,id,chassis,bot,{x:200,y:24,z},bot?'scout':undefined);(sim as unknown as Fixtures).physics.get(id)!.protectedUntil=0;return actor;}
const intent=(actor:ActorState,seq=1,id=1,extra={})=>({...emptyInput(),seq,strikeId:id,strikeEpoch:actor.jumpEpoch,strike:true,boost:true,...extra});
function ticks(sim:Simulation,n:number){for(let i=0;i<n;i++)sim.step(1/60);}
// Controlled supported encounter, copied from the independently qualified
// Pounce pounce NPC/ally schedules in feline-strike-modes.test.ts. All shipped
// NPCs and live Scout AI remain active; this is not a shipped route proof.
function supportedCoopContact(npc:boolean){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop'),source=sim.addActor('source','Source','pounce');
  const spawn={x:source.position.x+4.6,y:terrainHeight(source.position.x+4.6,source.position.z,7734)+ACTOR_HEIGHT,z:source.position.z};
  const target=sim.addActor('target','Target',npc?'pounce':'bastion',npc,npc?spawn:undefined,npc?'scout':undefined);
  const frames:{time:number;source:ActorState;target:ActorState}[]=[],events:CombatEvent[]=[],inputs:unknown[]=[],routes:unknown[]=[];
  const scope=sim as unknown as {resolveStrikes:(travel:Map<string,ActorTravel>,retiring:Set<string>)=>void},resolve=scope.resolveStrikes.bind(sim);
  scope.resolveStrikes=(travel,retiring)=>{if(source.strike)routes.push({tick:sim.tick,source:structuredClone(travel.get(source.id)),target:structuredClone(travel.get(target.id))});resolve(travel,retiring);};
  let seq=0,last=0;
  const send=(actor:ActorState,extra:Partial<InputState>={})=>{const input=parseInput({...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:actor===source?Math.atan2(-(target.position.x-source.position.x),-(target.position.z-source.position.z)):0,...extra});if(!input)throw Error('Invalid controlled encounter input');inputs.push({tick:sim.tick,actor:actor.id,input});sim.setInput(actor.id,input);};
  const step=(extra:Partial<InputState>={})=>{send(source,extra);if(!npc)send(target);sim.step(1/60);const fresh=sim.events.filter(e=>e.id>last);if(fresh.length)last=Math.max(...fresh.map(e=>e.id));events.push(...structuredClone(fresh));frames.push({time:sim.time,source:structuredClone(source),target:structuredClone(target)});};
  try{
    for(let i=0;i<156;i++)step({forward:npc&&Math.hypot(target.position.x-source.position.x,target.position.z-source.position.z)>4.6?1:0});
    const hp=target.hp,hurt=target.hurtAt,life=source.jumpEpoch;expect(source.grounded).toBe(true);
    step({jumpId:1,jump:true});for(let i=1;i<4;i++)step();expect(source.grounded).toBe(false);
    for(let i=0;i<60;i++)step({strikeId:1,strike:true,boost:true});step();for(let i=0;i<6;i++)step({strikeId:1,strike:true,boost:true});
    expect(source.strikeProcessed).toBe(1);expect(source.jumpEpoch).toBe(life);expect(source.strike?.stage).not.toBe('flight');
    const hits=events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===target.id);
    if(npc){
      expect(hits).toHaveLength(1);expect(hits[0].amount).toBe(50);expect(hp-target.hp).toBe(50);expect(target.hurtAt).toBe(hits[0].at);
      const index=frames.findIndex(f=>Math.abs(f.time-hits[0].at)<1e-7);expect(index).toBeGreaterThanOrEqual(0);expect(index+1).toBeLessThan(frames.length);
      const at=frames[index].target.position,next=frames[index+1].target.position,n=hits[0].normal!;expect(n).toBeDefined();if(frames[index].target.pair){expect(frames[index].target.pair?.other).toBe(source.id);expect(frames[index].source.pair?.other).toBe(target.id);expect(Math.hypot(next.x-at.x,next.z-at.z)).toBeLessThan(.05);}else expect(-(next.x-at.x)*n.x-(next.y-at.y)*n.y-(next.z-at.z)*n.z).toBeGreaterThan(.04);
    }else{expect(hits).toHaveLength(0);expect(target.hp).toBe(hp);expect(target.hurtAt).toBe(hurt);}
  }finally{
    const folder=process.env.FELINE_AUTHORITY_EVIDENCE;if(folder){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/supported-${npc?'live-scout':'ally'}.json`,JSON.stringify({placement:'Same controlled supported ground placement and ordinary 156-tick settle/jump/4-tick Shift schedule as qualified59 matrix; no clock/health/velocity/collider edits.',inputs,frames,routes,events},null,2));}
    sim.dispose();world.free();
  }
}

describe('authoritative feline body-contact strikes',()=>{
  for(const receding of [false,true])it(receding?'does not turn a pre-slide leg into a hit on a receding rival':'retains a real late-jump rounded-edge pounce before KCC slides upward',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),source=sim.addActor('source','Source','pounce'),target=sim.addActor('target','Target','pounce');let sequence=0;
    const send=(actor:ActorState,extra={})=>{const input=parseInput({...emptyInput(),seq:++sequence,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,pitch:-.070666269156514,...extra});if(!input)throw Error('Invalid replay input');sim.setInput(actor.id,input);};
    try{
      // Default admitted slots, real terrain, native support and elapsed spawn
      // protection. No position, health, velocity or collider mutation.
      for(let i=0;i<1115;i++){send(source);send(target);sim.step(1/60);}
      expect(source.grounded&&target.grounded).toBe(true);send(source,{jumpId:1,jump:true});sim.step(1/60);
      for(let i=0;i<13;i++){send(source,{jumpId:1,jump:true});send(target,receding?{strafe:1,yaw:0}:{});sim.step(1/60);}
      expect(source.grounded).toBe(false);
      for(let i=0;i<24;i++){send(source,{strikeId:1,strike:true,boost:true});send(target,receding?{strafe:1,yaw:0}:{});sim.step(1/60);}
      const impacts=sim.events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===target.id);
      expect(source.strikeProcessed).toBe(1);
      if(receding){expect(target.hp).toBe(target.maxHp);expect(impacts).toHaveLength(0);}else{expect(target.hp).toBe(target.maxHp-STRIKE_PROFILES.pounce.damage);expect(impacts).toHaveLength(1);}
    }finally{sim.dispose();world.free();}
  });
  for(const observation of [undefined,false])it(`does not infer a safe target path from ${String(observation)} collision observation`,()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),source=sim.addActor('source','Source','pounce'),target=sim.addActor('target','Target','pounce');let sequence=0,physicalLegWithoutChord=false;
    type ObservedTravel=ActorTravel&{normalPathObserved?:boolean;approach?:{target:string;to:ActorTravel['to'];fraction:number}};
    const resolver=sim as unknown as {resolveStrikes:(travel:Map<string,ObservedTravel>,retiring:Set<string>)=>void},resolve=resolver.resolveStrikes.bind(sim);
    // Run the real default-slot KCC journey, then withhold only the target-path
    // observation at the resolver seam. This synthetic observation negative
    // represents branches (including climb/mantle) whose KCC path was not read;
    // it does not claim a live climbing-target reproduction or alter its hull.
    resolver.resolveStrikes=(travel,retiring)=>{
      const route=travel.get(source.id),other=travel.get(target.id),leg=route?.approach;
      if(route&&other&&leg?.target===target.id&&source.strike?.stage==='flight'){
        const destination={...other,to:{x:other.from.x+(other.to.x-other.from.x)*leg.fraction,y:other.from.y+(other.to.y-other.from.y)*leg.fraction,z:other.from.z+(other.to.z-other.from.z)*leg.fraction}},options={facingYaw:-Math.PI/2,contactDistance:.02,minFacingDot:.35};
        if(!sweepFelineContact(RAPIER,route,other,options)&&sweepFelineContact(RAPIER,{...route,to:leg.to},destination,options))physicalLegWithoutChord=true;
      }
      if(other)other.normalPathObserved=observation;
      resolve(travel,retiring);
    };
    const send=(actor:ActorState,extra={})=>{const input=parseInput({...emptyInput(),seq:++sequence,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,pitch:-.070666269156514,...extra});if(!input)throw Error('Invalid replay input');sim.setInput(actor.id,input);};
    try{
      for(let i=0;i<1115;i++){send(source);send(target);sim.step(1/60);}
      send(source,{jumpId:1,jump:true});sim.step(1/60);
      for(let i=0;i<13;i++){send(source,{jumpId:1,jump:true});send(target);sim.step(1/60);}
      for(let i=0;i<24;i++){send(source,{strikeId:1,strike:true,boost:true});send(target);sim.step(1/60);}
      expect(source.strikeProcessed).toBe(1);expect(physicalLegWithoutChord).toBe(true);expect(target.hp).toBe(target.maxHp);expect(sim.events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===target.id)).toHaveLength(0);
    }finally{sim.dispose();world.free();}
  });
  for(const chassis of ['pounce','bastion','lynx','caracal'] as const)it(`${chassis} strikes a rival once with its physical accepted travel`,()=>run(sim=>{
    const source=pilot(sim,'source',chassis),target=pilot(sim,'target','pounce',202);sim.setInput(source.id,intent(source));ticks(sim,28);
    expect(target.hp).toBeCloseTo(target.maxHp-STRIKE_PROFILES[chassis].damage,3);expect(source.strikeProcessed).toBe(1);expect(sim.events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===target.id)).toHaveLength(1);expect(source.strike?.stage).not.toBe('flight');
    sim.setInput(source.id,intent(source,2));ticks(sim,8);expect(target.hp).toBeCloseTo(target.maxHp-STRIKE_PROFILES[chassis].damage,3);
  }));
  it('retains the original controlled-airborne moving-Scout physical MISS (failed positive history)',()=>run(sim=>{
    // Exact original synthetic fixture: y24, clock3, immediate yaw0 Shift and
    // 24 ticks. Live Scout self-motion prevents a native .02 swept candidate;
    // this does not describe ordinary grounded/jumped combat generally.
    const source=pilot(sim,'source'),enemy=pilot(sim,'enemy','pounce',202,true),hp=enemy.hp,hurt=enemy.hurtAt;
    type Route=ActorTravel&{approach?:{target:string;to:ActorTravel['to'];fraction:number}};
    const scope=sim as unknown as {resolveStrikes:(travel:Map<string,Route>,retiring:Set<string>)=>void},resolve=scope.resolveStrikes.bind(sim);
    const rows:unknown[]=[],identity={x:0,y:0,z:0,w:1};let count=0,legs=0,nativeCandidates=0;
    const cast=(a:ActorTravel,b:ActorTravel)=>{
      const ca={...a.from,y:a.from.y+a.height/2-ACTOR_HEIGHT},cb={...b.from,y:b.from.y+b.height/2-ACTOR_HEIGHT},va={x:a.to.x-a.from.x,y:a.to.y-a.from.y,z:a.to.z-a.from.z},vb={x:b.to.x-b.from.x,y:b.to.y-b.from.y,z:b.to.z-b.from.z};
      return new RAPIER.RoundCylinder(a.height/2-.12,a.radius-.12,.12).castShape(ca,identity,va,new RAPIER.RoundCylinder(b.height/2-.12,b.radius-.12,.12),cb,identity,vb,.02,1,true);
    };
    scope.resolveStrikes=(travel,retiring)=>{
      const a=travel.get(source.id),b=travel.get(enemy.id);if(a&&b){count++;const hit=cast(a,b);if(hit)nativeCandidates++;expect(sweepFelineContact(RAPIER,a,b,{facingYaw:0,contactDistance:.02,minFacingDot:.35})).toBeNull();
        const leg=a.approach;if(leg?.target===enemy.id){legs++;const target={...b,to:{x:b.from.x+(b.to.x-b.from.x)*leg.fraction,y:b.from.y+(b.to.y-b.from.y)*leg.fraction,z:b.from.z+(b.to.z-b.from.z)*leg.fraction}},short={...a,to:leg.to};if(cast(short,target))nativeCandidates++;expect(sweepFelineContact(RAPIER,short,target,{facingYaw:0,contactDistance:.02,minFacingDot:.35})).toBeNull();}
        rows.push({tick:sim.tick,a:structuredClone(a),b:structuredClone(b)});
      }resolve(travel,retiring);
    };
    sim.setInput(source.id,intent(source));ticks(sim,24);
    expect(count).toBeGreaterThan(0);expect(legs).toBeGreaterThan(0);expect(nativeCandidates).toBe(0);expect(enemy.position.x).toBeLessThan(199.5);expect(enemy.hp).toBe(hp);expect(enemy.hurtAt).toBe(hurt);expect(sim.events.filter(e=>e.type==='impact'&&e.actor===source.id&&e.target===enemy.id)).toHaveLength(0);
    const folder=process.env.FELINE_AUTHORITY_EVIDENCE;if(folder){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/original-airborne-miss.json`,JSON.stringify({rows,nativeCandidates,legs,count,source:structuredClone(source),enemy:structuredClone(enemy),events:sim.events},null,2));}
  },'coop'));
  it('hits a live Scout once from the qualified supported jump/aim schedule and preserves co-op allies',()=>{
    supportedCoopContact(true);supportedCoopContact(false);
  });
  it('a real thin wall blocks contact and ends redirected flight',()=>run(sim=>{
    const source=pilot(sim,'source'),target=pilot(sim,'target','pounce',202);sim.world.createCollider(RAPIER.ColliderDesc.cuboid(6,8,.025).setTranslation(200,24,205));sim.setInput(source.id,intent(source));ticks(sim,24);expect(target.hp).toBe(target.maxHp);expect(source.strike?.stage).not.toBe('flight');expect(source.position.z).toBeGreaterThan(206.7);
  }));
  it('rejects overlapping starts, reserved spawn-protected contacts, and applies existing shields',()=>{
    run(sim=>{const source=pilot(sim,'source'),target=pilot(sim,'target','pounce',207);sim.setInput(source.id,intent(source));ticks(sim,24);expect(target.hp).toBe(target.maxHp);});
    run(sim=>{const source=pilot(sim,'source'),target=pilot(sim,'target','pounce',202);(sim as unknown as Fixtures).physics.get(target.id)!.protectedUntil=100;sim.setInput(source.id,intent(source));ticks(sim,24);expect(target.hp).toBe(target.maxHp);expect(target.velocity.x).toBe(0);});
    run(sim=>{const source=pilot(sim,'source'),target=pilot(sim,'target','pounce',202);target.shieldUntil=100;sim.setInput(source.id,intent(source));ticks(sim,24);expect(target.hp).toBeCloseTo(target.maxHp-STRIKE_PROFILES.pounce.damage*.7,3);});
  });
  it('selects dive and upright tackle only from authoritative form/aim, with detached snapshots',()=>run(sim=>{
    const dive=pilot(sim,'dive');sim.setInput(dive.id,intent(dive,1,1,{pitch:-.6}));sim.step(1/60);expect(dive.strike?.kind).toBe('dive');expect(dive.velocity.y).toBeLessThan(-5);
    const tackle=pilot(sim,'tackle','bastion',240);tackle.stance='upright';const p=(sim as unknown as Fixtures).physics.get(tackle.id)!;p.collider.setShape(new RAPIER.RoundCylinder(UPRIGHT_HEIGHT/2-.12,2.05-.12,.12));p.collider.setTranslationWrtParent({x:0,y:UPRIGHT_HEIGHT/2-1,z:0});
    sim.setInput(tackle.id,intent(tackle,1,1,{stance:'upright'}));sim.step(1/60);expect(tackle.strike?.kind).toBe('tackle');const snapshot=sim.snapshot();snapshot.actors.find(a=>a.id===tackle.id)!.strike!.direction.z=99;expect(tackle.strike!.direction.z).not.toBe(99);
  }));
  it('consumes ground/cooldown/disrupted press IDs without queuing a later attack',()=>run(sim=>{
    const source=pilot(sim,'source');source.grounded=true;source.abilityReadyAt=100;sim.setInput(source.id,intent(source));sim.step(1/60);expect(source.strikeProcessed).toBe(1);expect(source.strike).toBeNull();source.grounded=false;source.abilityReadyAt=0;sim.step(1/60);expect(source.strike).toBeNull();
    source.disruptedUntil=100;sim.setInput(source.id,intent(source,2,2));sim.step(1/60);expect(source.strikeProcessed).toBe(2);expect(source.strike).toBeNull();source.disruptedUntil=0;sim.step(1/60);expect(source.strike).toBeNull();
  }));
  it('cancellation coalesces before stepping and old-life/duplicate packets cannot rearm',()=>run(sim=>{
    const source=pilot(sim,'source');sim.setInput(source.id,intent(source));sim.setInput(source.id,{...emptyInput(),seq:2,strikeEpoch:source.jumpEpoch,strikeCancel:1});sim.step(1/60);expect(source.strike).toBeNull();expect(source.strikeProcessed).toBe(1);
    sim.setInput(source.id,intent(source,3));sim.step(1/60);expect(source.strike).toBeNull();sim.setInput(source.id,intent(source,4,2,{strikeEpoch:source.jumpEpoch+1}));sim.step(1/60);expect(source.strikeProcessed).toBe(1);
  }));
  it('disruption, climb intent, accepted cancellation, and death end contact eligibility',()=>{
    for(const stop of ['disrupt','climb','cancel','death'] as const)run(sim=>{const source=pilot(sim,'source'),target=pilot(sim,'target','pounce',199);sim.setInput(source.id,intent(source));sim.step(1/60);expect(source.strike?.stage).toBe('flight');if(stop==='disrupt')source.disruptedUntil=100;if(stop==='death')source.hp=0;if(stop==='climb')sim.setInput(source.id,{...emptyInput(),seq:2,climb:true});if(stop==='cancel')sim.setInput(source.id,{...emptyInput(),seq:2,strikeEpoch:source.jumpEpoch,strikeCancel:1});ticks(sim,24);expect(source.strike).toBeNull();expect(target.hp).toBe(target.maxHp);});
  });
  it('held and reordered boosts cannot arm a landing ability until a genuine admitted release',()=>run(sim=>{
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(20,1,20).setTranslation(200,20,200));const source=pilot(sim,'source');sim.setInput(source.id,intent(source));sim.step(1/60);const p=(sim as unknown as Fixtures).physics.get(source.id)!;
    ticks(sim,70);expect(source.grounded).toBe(true);source.abilityReadyAt=0;sim.setInput(source.id,{...emptyInput(),seq:3,boost:true});sim.setInput(source.id,{...emptyInput(),seq:2,boost:false});sim.step(1/60);expect(source.abilityAt).toBeLessThan(0);
    sim.setInput(source.id,{...emptyInput(),seq:4,boost:false});sim.step(1/60);sim.setInput(source.id,{...emptyInput(),seq:5,boost:true});sim.step(1/60);expect(source.abilityAt).toBe(sim.time);expect(p.collider.isValid()).toBe(true);
  }));
  it('rejects a static embedded hull while preserving exact floor touch and clear travel',()=>run(sim=>{
    const query=sim as unknown as {strikePathClear:(route:{from:{x:number;y:number;z:number};to:{x:number;y:number;z:number};radius:number;height:number},fraction:number)=>boolean};
    const route={from:{x:200,y:24,z:200},to:{x:200,y:24,z:205},radius:1.75,height:2.6};expect(query.strikePathClear(route,1)).toBe(true);
    const wall=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(4,4,.2).setTranslation(200,24,200));sim.world.step();expect(query.strikePathClear(route,1)).toBe(false);sim.world.removeCollider(wall,true);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(12,1,12).setTranslation(200,22,200));sim.world.step();expect(query.strikePathClear(route,1)).toBe(true);
  }));
  it('resolves genuine equal-time mutual strikes identically under reversed actor insertion order',()=>{
    const outcomes:{a:number;b:number;ak:number;bk:number}[]=[];for(const reversed of [false,true])run(sim=>{for(const id of reversed?['b','a']:['a','b'])pilot(sim,id,'pounce',id==='a'?208:202);const a=sim.actors.get('a')!,b=sim.actors.get('b')!;a.hp=b.hp=20;sim.setInput(a.id,intent(a));sim.setInput(b.id,intent(b,1,1,{yaw:Math.PI}));ticks(sim,20);outcomes.push({a:a.hp,b:b.hp,ak:a.kills,bk:b.kills});});expect(outcomes[0]).toEqual({a:0,b:0,ak:1,bk:1});expect(outcomes[1]).toEqual(outcomes[0]);
  });
  it('a source killed at an earlier swept time cannot deal a later queued hit',()=>run(sim=>{
    const a=pilot(sim,'a'),b=pilot(sim,'b'),c=pilot(sim,'c'),d=pilot(sim,'d');
    const positions={a:{x:200,y:24,z:200},b:{x:205,y:24,z:202.5},c:{x:207,y:24,z:197.5},d:{x:203,y:24,z:194}};
    for(const actor of [a,b,c,d]){actor.position={...positions[actor.id as keyof typeof positions]};const body=(sim as unknown as Fixtures).physics.get(actor.id)!.body;body.setTranslation(actor.position,true);body.setNextKinematicTranslation(actor.position);}
    sim.setInput(a.id,intent(a,1,1,{yaw:-Math.PI/2}));sim.setInput(d.id,intent(d,1,1,{yaw:Math.PI}));sim.step(1/60);a.hp=20;
    // Synthetic simultaneous accepted-path schedule, using real rounded hull
    // casts and real damage/life retirement; not an ordinary 60Hz KCC journey.
    const route=(id:keyof typeof positions,dx=0,dz=0)=>({from:{...positions[id]},to:{...positions[id],x:positions[id].x+dx,z:positions[id].z+dz},radius:1.75,height:2.6,life:sim.actors.get(id)!.jumpEpoch,redirected:false});
    const paths=new Map([['a',route('a',8)],['b',route('b')],['c',route('c')],['d',route('d',0,6)]]);
    (sim as unknown as {resolveStrikes:(travel:typeof paths,retiring:Set<string>)=>void}).resolveStrikes(paths,new Set());expect(a.hp).toBe(0);expect(b.hp).toBeLessThan(b.maxHp);expect(c.hp).toBe(c.maxHp);
  }));
});
