import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {actorHullRadius,actorQuadHeight} from '../shared/config';
import {rooftopEncounter} from '../shared/encounters';
import {climbAnchors,roofSurfaces} from '../shared/traversal';
import {onRoof,roofPath,roofPoint} from '../shared/vertical-navigation';
import {propCollider,terrainHeight} from '../shared/world';
import {horizontalDistance} from '../shared/math';
import {emptyInput,type ActorState,type InputState,type Mode} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,seed=7734,mode:Mode='coop')=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,mode);
  try{for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const sequences=new WeakMap<ActorState,number>();
const input=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>{const seq=Math.max(sim.tick+1,(sequences.get(a)??0)+1);sequences.set(a,seq);sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq,jumpEpoch:a.jumpEpoch,jumpId:patch.jump?seq:0,...patch});};
const pilotOnRoof=(sim:Simulation)=>{
  const encounter=rooftopEncounter(sim.seed),p=sim.addActor('pilot','Pilot','pounce',false,{...encounter.roof.patrol[2],y:encounter.roof.center.y+1});
  p.hp=p.maxHp=100000;return p;
};

describe('authored multilevel enemy navigation',()=>{
  for(const seed of [7734,1926,4107])it(`${seed} scout hears the roof, grips the correct facade, mantles and pursues without teleporting`,()=>withSim(sim=>{
    const encounter=rooftopEncounter(seed),anchor=climbAnchors(seed).find(a=>a.id===encounter.roof.anchorId)!;
    const pilot=pilotOnRoof(sim),scout=sim.addActor('scout','Scout','pounce',true,{...encounter.pursuer.position,y:encounter.pursuer.position.y+1},'scout');
    advance(sim,1);input(sim,pilot,{fire:true,yaw:1.4});sim.step(1/60);input(sim,pilot,{});
    let climbed=false,mantled=false,arrived=false;const count=sim.world.bodies.len();
    for(let i=0;i<1200;i++) {
      const before={...scout.position};sim.step(1/60);
      expect(Math.hypot(scout.position.x-before.x,scout.position.y-before.y,scout.position.z-before.z)).toBeLessThan(.26);
      if(scout.climb){climbed=true;expect(scout.climb.anchor).toBe(anchor.id);if(scout.climb.phase==='mantle'){mantled=true;
        if(scout.climb.mantleStage==='transfer'||scout.climb.mantleStage==='settle')expect(scout.position.y-1).toBeGreaterThanOrEqual(scout.climb.top+.1);
        else {expect(scout.climb.gripMask|scout.climb.roofMask).toBe(0);expect(['out','lift']).toContain(scout.climb.mantleStage);}
      }else{
        const d=(scout.position.x-anchor.position.x)*anchor.normal.x+(scout.position.z-anchor.position.z)*anchor.normal.z;expect(d).toBeGreaterThanOrEqual(actorHullRadius(scout)+.065);
      }}
      if(climbed&&!scout.climb&&onRoof(encounter.roof,scout.position)){arrived=true;break;}
    }
    expect(climbed).toBe(true);expect(mantled).toBe(true);expect(arrived).toBe(true);const after={...scout.position};advance(sim,3);
    expect(onRoof(encounter.roof,scout.position)).toBe(true);expect(horizontalDistance(after,scout.position)).toBeGreaterThan(1);expect(scout.pulseAt).toBeGreaterThan(4);
    // Crossing a chunk boundary may legitimately unload the approach's outer ring.
    expect(sim.world.bodies.len()).toBeLessThanOrEqual(count);
  },seed));
  it('patrols a supported roof, keeps a nonnumeric guardian home on respawn and clears an occupied slot',()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),roof=encounter.roof,guardian=sim.addActor(encounter.guardian.id,'Guardian','pounce',true,{...encounter.guardian.position,y:roof.center.y+1},'anchor');
    const initial={...guardian.position};advance(sim,10);expect(onRoof(roof,guardian.position)).toBe(true);expect(horizontalDistance(initial,guardian.position)).toBeGreaterThan(3);
    const shape=(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(guardian.id)!.collider.shape as RAPIER.RoundCylinder;
    expect(2*(shape.halfHeight+shape.borderRadius)).toBeCloseTo(actorQuadHeight(guardian));
    guardian.hp=0;guardian.respawnAt=sim.time+.2;sim.step(1/60);
    const occupant=sim.addActor('occupant','Pilot','bastion',false,{...encounter.guardian.position,y:roof.center.y+1});sim.world.step();const count=sim.world.bodies.len();advance(sim,.4);
    expect(guardian.hp).toBe(guardian.maxHp);expect(onRoof(roof,guardian.position)).toBe(true);expect(horizontalDistance(guardian.position,occupant.position)).toBeGreaterThan(actorHullRadius(guardian)+actorHullRadius(occupant));expect(sim.world.bodies.len()).toBe(count);
  }));
  it('waits outside an occupied landing, resumes when it clears and lets a wall-grip corpse fall',()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),anchor=climbAnchors(sim.seed)[1],pilot=pilotOnRoof(sim),scout=sim.addActor('scout','Scout','pounce',true,{...encounter.pursuer.position,y:encounter.pursuer.position.y+1},'scout');
    const occupant=sim.addActor('occupant','Guardian','bastion',false,{...anchor.landing,y:anchor.landing.y+1});advance(sim,1);
    for(let i=0;i<240;i++){input(sim,pilot,{fire:true,yaw:1.4});sim.step(1/60);expect(scout.climb).toBeNull();}
    sim.removeActor(occupant.id);for(let i=0;i<240&&!scout.climb;i++){input(sim,pilot,{fire:true,yaw:1.4});sim.step(1/60);}
    expect(scout.climb).not.toBeNull();advance(sim,1);const y=scout.position.y;scout.hp=0;scout.respawnAt=sim.time+10;advance(sim,.9);
    expect(scout.climb).toBeNull();expect(scout.position.y).toBeLessThan(y-.5);
    expect((sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(scout.id)!.collider.isEnabled()).toBe(false);
  }));
  it('routes a whole hull around a solid roof bank with bounded supported waypoints',()=>{
    const roof=roofSurfaces(7734)[1],from={...roof.patrol[0],y:roof.center.y+1},to={...roof.patrol[2],y:roof.center.y+1};
    const path=roofPath(roof,from,to,2.2,p=>Math.abs(p.x-roof.center.x)>2.5||Math.abs(p.z-roof.center.z)>2.5);
    expect(path.length).toBeGreaterThan(3);expect(path.length).toBeLessThanOrEqual(64);for(const p of path){expect(onRoof(roof,p)).toBe(true);expect(Math.abs(p.x-roof.center.x)>2.5||Math.abs(p.z-roof.center.z)>2.5).toBe(true);}
    expect(roofPath(roof,from,to,2.2,()=>false)).toEqual([]);
  });
  it('returns a scout from a forgotten rooftop target by walking beyond the supported lip and dropping',()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),pilot=pilotOnRoof(sim),scout=sim.addActor('scout','Scout','pounce',true,{...encounter.pursuer.position,y:encounter.pursuer.position.y+1},'scout');advance(sim,1);
    input(sim,pilot,{fire:true,yaw:1.4});sim.step(1/60);input(sim,pilot,{});
    let climbed=false;for(let i=0;i<900;i++){sim.step(1/60);if(scout.climb)climbed=true;if(climbed&&!scout.climb&&onRoof(encounter.roof,scout.position))break;}
    expect(onRoof(encounter.roof,scout.position)).toBe(true);sim.removeActor(pilot.id);let fell=false;
    for(let i=0;i<1800;i++){const before={...scout.position};sim.step(1/60);expect(horizontalDistance(before,scout.position)).toBeLessThan(.2);if(scout.position.y-1<encounter.roof.center.y-5)fell=true;}
    expect(fell,JSON.stringify({position:scout.position,state:scout.aiState,brain:(sim as unknown as {brains:Map<string,unknown>}).brains.get(scout.id)})).toBe(true);expect(scout.grounded).toBe(true);expect(scout.position.y-1).toBeLessThan(encounter.roof.center.y-5);
  }));
  it('disruption releases a climbing scout without weapon actions and leaves movement available',()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),pilot=pilotOnRoof(sim),scout=sim.addActor('scout','Scout','pounce',true,{...encounter.pursuer.position,y:encounter.pursuer.position.y+1},'scout');advance(sim,1);
    input(sim,pilot,{fire:true,yaw:1.4});sim.step(1/60);input(sim,pilot,{});
    for(let i=0;i<300&&!scout.climb;i++)sim.step(1/60);expect(scout.climb).not.toBeNull();advance(sim,.7);
    const y=scout.position.y;scout.disruptedUntil=sim.time+8;sim.step(1/60);expect(scout.climb).toBeNull();advance(sim,1);
    expect(scout.position.y).toBeLessThan(y);expect(scout.pulseAt).toBe(-100);expect(scout.rocketAt).toBe(-100);
  }));
  it('actual roof-bank weapon destruction removes its obstruction, replans supported paths and permits full-hull passage',()=>withSim(sim=>{
    // Keep the starting lane clear of the measured antenna terminal. The old
    // center lane begins inside its full-hull exclusion area on the fitted roof.
    const roof=rooftopEncounter(sim.seed).roof,bank=roof.obstacles[0],box=propCollider(bank)!,actor=sim.addActor('pilot','Pilot','bastion',false,{x:bank.x+1.35,y:roof.center.y+1,z:bank.z-5});advance(sim,1);sim.syncChunks([actor.position]);sim.world.step();
    const clear=(p:ActorState['position'])=>(sim as unknown as {roofClear(a:ActorState,p:ActorState['position']):boolean}).roofClear(actor,p),goal={x:bank.x,y:roof.center.y+1,z:bank.z},state=sim.cover.get(bank.id!)!,count=sim.world.bodies.len();
    expect(state.hp).toBe(100);expect(clear(goal)).toBe(false);const before=roofPath(roof,actor.position,goal,actorHullRadius(actor),clear);expect(before.some(p=>horizontalDistance(p,goal)<1)).toBe(false);
    const pitch=Math.atan2(bank.y+box[1]-(actor.position.y+.65),horizontalDistance(actor.position,{x:bank.x,y:bank.y,z:bank.z})-1.3),yaw=Math.atan2(actor.position.x-bank.x,actor.position.z-bank.z);
    for(let i=0;i<100;i++){input(sim,actor,{fire:true,yaw,pitch});sim.step(1/60);}input(sim,actor,{});sim.syncChunks([actor.position]);sim.world.step();
    expect(state.hp).toBe(0);expect(sim.world.bodies.len()).toBe(count-1);expect(clear(goal)).toBe(true);
    // The measured eave is narrower than the old filled collision box. The
    // destination must retain whole-hull clearance from that actual edge.
    const safeGoal=roofPoint(roof,goal,actorHullRadius(actor)),after=roofPath(roof,actor.position,goal,actorHullRadius(actor),clear);
    expect(after.length).toBeGreaterThan(0);expect(horizontalDistance(after.at(-1)!,safeGoal)).toBeLessThan(.01);expect(clear(safeGoal)).toBe(true);
    for(let i=0;i<65;i++){input(sim,actor,{forward:1,yaw:Math.PI});sim.step(1/60);}expect(actor.position.z).toBeGreaterThan(bank.z);expect(onRoof(roof,actor.position)).toBe(true);
  }));
});

describe('optional sky uplink authority',()=>{
  it('requires actual roof reach and a cleared guardian, resets interrupted hold and grants one shared claim',()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),o=sim.objectives.find(o=>o.optional)!,below=sim.addActor('below','Below','pounce',false,{...o.position,y:terrainHeight(o.position.x,o.position.z,sim.seed)+1});
    for(let i=0;i<200;i++){input(sim,below,{interact:true});sim.step(1/60);}expect(o.progress).toBe(0);sim.removeActor(below.id);
    const pilot=sim.addActor('pilot','Pilot','pounce',false,{...o.position,y:o.position.y+1,z:o.position.z-3});pilot.hp=pilot.maxHp=100000;
    const guardian=sim.addActor(encounter.guardian.id,'Guardian','pounce',true,{...encounter.guardian.position,y:encounter.guardian.position.y+1},'anchor');advance(sim,1);
    for(let i=0;i<200;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(o.progress).toBe(0);sim.removeActor(guardian.id);
    for(let i=0;i<90;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(o.progress).toBeGreaterThan(.45);input(sim,pilot,{});sim.step(1/60);expect(o.progress).toBe(0);
    for(let i=0;i<190;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(o.complete).toBe(true);expect(pilot.salvage).toBe(200);expect(sim.phase).toBe('active');expect(sim.objectives.slice(0,4).every(o=>!o.complete)).toBe(true);
    const event=sim.events.find(e=>e.type==='area'&&e.effect==='emp');expect(event?.position).toEqual(encounter.pulseOrigin);expect(event?.radius).toBe(60);
    for(let i=0;i<200;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(pilot.salvage).toBe(200);
  }));
  it('omits NPCs and optional uplink from rival-only PvP',()=>withSim(sim=>{
    expect([...sim.actors.values()]).toEqual([]);expect(sim.objectives.some(o=>o.optional)).toBe(false);
  },7734,'pvp'));
  for(const mode of ['coop','pvpve'] as Mode[])it(`${mode} applies one 8s EMP using exact antenna 3D range and solid LOS, with mode-correct energy restoration`,()=>withSim(sim=>{
    const encounter=rooftopEncounter(sim.seed),o=sim.objectives.find(o=>o.optional)!,roof=encounter.roof;
    const point=(x:number,z:number)=>({x:roof.center.x+x,y:roof.center.y+1,z:roof.center.z+z});
    const pilot=sim.addActor('pilot','Pilot','pounce',false,{...o.position,y:o.position.y+1,z:o.position.z-3});pilot.hp=pilot.maxHp=100000;advance(sim,1);
    for(let i=0;i<177;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(o.complete).toBe(false);
    const visible=sim.addActor('visible','Visible','pounce',true,point(7.2,-7.2),'anchor'),blocked=sim.addActor('blocked','Blocked','pounce',true,point(7.2,7.2),'anchor');
    const farPoint={x:encounter.pulseOrigin.x+59,y:0,z:encounter.pulseOrigin.z};farPoint.y=terrainHeight(farPoint.x,farPoint.z,sim.seed)+1;
    const far=sim.addActor('far','Far','pounce',true,farPoint,'mortar'),ally=sim.addActor('ally','Ally','pounce',false,point(-6.3,-6.3));ally.hp=ally.maxHp=100000;
    const midpoint={x:(encounter.pulseOrigin.x+blocked.position.x)/2,y:roof.center.y+3.2,z:(encounter.pulseOrigin.z+blocked.position.z)/2},yaw=Math.atan2(blocked.position.x-encounter.pulseOrigin.x,blocked.position.z-encounter.pulseOrigin.z);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(2.5,3,.2).setTranslation(midpoint.x,midpoint.y,midpoint.z).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}));sim.world.step();
    const clear=(p:ActorState)=>(sim as unknown as {clearRay(a:ActorState['position'],b:ActorState['position']):boolean}).clearRay(encounter.pulseOrigin,{...p.position,y:p.position.y+.4});
    expect(clear(visible)).toBe(true);expect(clear(blocked)).toBe(false);expect(Math.hypot(farPoint.x-encounter.pulseOrigin.x,farPoint.y-encounter.pulseOrigin.y,farPoint.z-encounter.pulseOrigin.z)).toBeGreaterThan(60);
    pilot.energy=ally.energy=0;for(let i=0;i<10&&!o.complete;i++){input(sim,pilot,{interact:true});sim.step(1/60);}expect(o.complete).toBe(true);
    expect(pilot.energy).toBe(100);if(mode==='coop')expect(ally.energy).toBe(100);else expect(ally.energy).toBeLessThan(3);
    expect(visible.disruptedUntil-sim.time).toBeCloseTo(8);expect(blocked.disruptedUntil).toBe(0);expect(far.disruptedUntil).toBe(0);
    const hits=sim.events.filter(e=>e.type==='emp-hit');expect(hits.map(e=>e.target)).toEqual([visible.id]);expect(horizontalDistance(hits[0].position,visible.position)).toBeLessThan(.1);
    const before={...visible.position};advance(sim,2);expect(horizontalDistance(before,visible.position)).toBeGreaterThan(.5);expect(visible.pulseAt).toBe(-100);advance(sim,6.2);expect(visible.disruptedUntil).toBeLessThan(sim.time);
  },7734,mode));
});
