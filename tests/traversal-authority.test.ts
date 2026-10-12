import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Navigation } from '../shared/navigation';
import { Simulation } from '../shared/simulation';
import { actorHullRadius } from '../shared/config';
import { breakableCover, climbAnchors } from '../shared/traversal';
import { propCollider, terrainHeight } from '../shared/world';
import { emptyInput, type ActorState, type Chassis, type InputState } from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,seed=7734)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp');
  try{run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const input=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq:sim.tick+1,...patch});
const climber=(sim:Simulation,chassis:Chassis='pounce')=>{
  const anchor=climbAnchors(sim.seed)[0],radius=actorHullRadius({chassis,bot:false});
  const yaw=Math.atan2(anchor.normal.x,anchor.normal.z);
  // Start clear of the measured trim and approach through the ordinary KCC.
  // A nominal main-wall spawn can already overlap the real workshop shell.
  const a=sim.addActor('p','Pilot',chassis,false,{x:anchor.position.x+anchor.normal.x*(radius+.65),y:anchor.position.y+1,z:anchor.position.z+anchor.normal.z*(radius+.65)});
  advance(sim,.6);
  for(let i=0;i<45;i++){input(sim,a,{forward:1,yaw});sim.step(1/60);}
  input(sim,a,{yaw});advance(sim,.25);return {a,anchor,yaw};
};
const coverFixture=(sim:Simulation)=>{
  const p=breakableCover(sim.seed)[0],box=propCollider(p)!,c=Math.cos(p.rotation),s=Math.sin(p.rotation);
  const point=(x:number,z:number)=>({x:p.x+x*c+z*s,y:terrainHeight(p.x+x*c+z*s,p.z-x*s+z*c,sim.seed)+1,z:p.z-x*s+z*c});
  const shooter=sim.addActor('a','Shooter','pounce',false,point(0,-box[2]-7));advance(sim,3);
  return {p,box,point,shooter,yaw:Math.atan2(-s,-c)};
};

describe('changing authoritative cover geometry',()=>{
  it('invalidates occupied cells and cached detours when a known cover prop retires',()=>{
    const navigation=new Navigation(7734),from={x:18,y:1,z:42},to={x:54,y:1,z:42};
    const before=navigation.path(from,to);
    expect(before.length).toBeGreaterThan(0);expect(navigation.walkable({x:35,y:1,z:42})).toBe(false);
    navigation.setPropFilter(prop=>!(prop.kind==='workshop'&&prop.x===35&&prop.z===42));
    const after=navigation.path(from,to);
    expect(navigation.walkable({x:35,y:1,z:42})).toBe(true);expect(after.length).toBeLessThan(before.length);
    expect(after.some(p=>p.x>25&&p.x<45&&Math.abs(p.z-42)<3)).toBe(true);
    expect(navigation.path(from,to)).toEqual(after);
  });
});

describe('full hull climbing and mantle authority',()=>{
  for(const seed of [7734,1926,4107])for(const chassis of ['pounce','bastion','lynx','caracal'] as Chassis[])it(`${seed} ${chassis} rises outside the facade before crossing and walks across its roof`,()=>withSim(sim=>{
    const {a,anchor,yaw}=climber(sim,chassis),count=sim.world.bodies.len();let attached=false,mantled=false,done=false;
    for(let i=0;i<660;i++) {
      input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);
      if(a.climb){attached=true;if(a.climb.phase==='mantle'){mantled=true;
        if(a.climb.mantleStage==='transfer'||a.climb.mantleStage==='settle')expect(a.position.y-1).toBeGreaterThanOrEqual(a.climb.top+.1);
        else {expect(a.climb.gripMask|a.climb.roofMask).toBe(0);expect(['out','lift']).toContain(a.climb.mantleStage);}
      }else{
        const d=(a.position.x-anchor.position.x)*anchor.normal.x+(a.position.z-anchor.position.z)*anchor.normal.z;
        expect(d).toBeGreaterThanOrEqual(actorHullRadius(a)+.065);
      }}else if(attached){done=true;break;}
    }
    expect(done).toBe(true);expect(mantled).toBe(true);expect(a.energy).toBeGreaterThan(20);expect(a.energy).toBeLessThan(92);expect(a.stance).toBe('quadruped');expect(a.fireAt).toBe(-100);
    input(sim,a,{});advance(sim,.4);expect(a.grounded).toBe(true);
    for(let i=0;i<90;i++){input(sim,a,{forward:1,yaw});sim.step(1/60);}
    expect(a.position.y).toBeGreaterThan(anchor.landing.y+.94);expect(sim.world.bodies.len()).toBe(count);
  },seed));
  it('blocks shooting, abilities and form changes while attached and copies nested climb state',()=>withSim(sim=>{
    const {a,yaw}=climber(sim);input(sim,a,{climb:true,yaw});sim.step(1/60);expect(a.climb?.phase).toBe('grab');
    const snap=sim.snapshot();snap.actors[0].climb!.normal.x=99;snap.actors[0].climb!.contact.y=99;expect(a.climb!.normal.x).not.toBe(99);expect(a.climb!.contact.y).not.toBe(99);
    for(let i=0;i<60;i++){input(sim,a,{climb:true,fire:true,rocket:true,boost:true,stance:'upright',yaw});sim.step(1/60);}
    expect(a.climb?.phase).toBe('cling');expect(a.stance).toBe('quadruped');expect(a.fireAt).toBe(-100);expect(a.abilityReadyAt).toBe(0);
  }));
  it('detaches on release, stale input, energy exhaustion and death',()=>{
    for(const reason of ['release','stale','energy','death'])withSim(sim=>{
      const {a,yaw}=climber(sim);for(let i=0;i<40;i++){input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);}expect(a.climb).not.toBeNull();const y=a.position.y;
      if(reason==='release')input(sim,a,{yaw});if(reason==='energy'){a.energy=.01;input(sim,a,{climb:true,forward:1,yaw});}if(reason==='death'){a.hp=0;a.respawnAt=sim.time+10;}
      advance(sim,reason==='stale'?.4:.05);expect(a.climb).toBeNull();
      if(reason!=='death'){input(sim,a,{yaw});advance(sim,.8);expect(a.position.y).toBeLessThan(y);}
    });
  });
  it('rejects low energy, wrong-facing or occluded walls and upright transitions',()=>{
    for(const reason of ['energy','facing','wall','upright'])withSim(sim=>{
      const {a,anchor,yaw}=climber(sim);
      if(reason==='energy')a.energy=7;
      if(reason==='wall'){sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,3,3).setTranslation(anchor.position.x+anchor.normal.x*.6,anchor.position.y+3,anchor.position.z));sim.world.step();}
      if(reason==='upright'){input(sim,a,{stance:'upright'});sim.step(1/60);}
      input(sim,a,{climb:true,yaw:reason==='facing'?yaw+Math.PI:yaw});sim.step(1/60);expect(a.climb).toBeNull();
    });
  });
  it('permits supported lower wall grips while an occupied roof denies inward vault transfer',()=>withSim(sim=>{
    const {a,anchor,yaw}=climber(sim);sim.addActor('other','Guardian','bastion',false,{...anchor.landing,y:anchor.landing.y+1});sim.world.step();
    input(sim,a,{climb:true,yaw});sim.step(1/60);expect(a.climb?.phase).toBe('grab');
    for(let i=0;i<240;i++){input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);expect(a.climb?.mantleStage).not.toBe('transfer');expect(a.position.y-1).toBeLessThan(anchor.landing.y);}
    expect(a.climb).not.toBeNull();input(sim,a,{climb:true,forward:-1,yaw});advance(sim,.2);expect(a.position.y).toBeLessThan(anchor.landing.y);
  }));
  it('does not mantle through a blocker placed in its route after attachment',()=>withSim(sim=>{
    const {a,anchor,yaw}=climber(sim);input(sim,a,{climb:true,yaw});sim.step(1/60);expect(a.climb).not.toBeNull();
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.6,3,4).setTranslation(anchor.landing.x+3,anchor.landing.y+3,anchor.landing.z));sim.world.step();
    let sawMantle=false;for(let i=0;i<660;i++){input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);if(a.climb?.phase==='mantle')sawMantle=true;if(!a.climb)break;}
    expect(a.position.x).toBeGreaterThan(anchor.landing.x+4);expect(a.position.y-1).toBeLessThan(anchor.landing.y);
    // A blocked local landing may be rejected before vault launch; a failed
    // launch is not required merely to demonstrate preserved collision.
    if(sawMantle)expect(a.climb?.mantleStage).not.toBe('settle');
  }));
  it('uses a 2.6m climbing hull and rejects a newly inserted overhead obstruction',()=>{
    for(const blocked of [false,true])withSim(sim=>{
      const {a,anchor,yaw}=climber(sim,'bastion');
      if(blocked){sim.world.createCollider(RAPIER.ColliderDesc.cuboid(3,.2,3).setTranslation(a.position.x,anchor.position.y+2.7,a.position.z));sim.world.step();}
      input(sim,a,{climb:true,yaw});sim.step(1/60);
      if(blocked)expect(a.climb).toBeNull();else {
        const collider=(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(a.id)!.collider,shape=collider.shape as RAPIER.RoundCylinder;
        expect(2*(shape.halfHeight+shape.borderRadius)).toBeCloseTo(2.6);expect(collider.translation().y-1.3).toBeCloseTo(a.position.y-1,3);
      }
    });
  });
  it('rechecks a live guardian arriving on the landing during mantle and detaches outside it',()=>withSim(sim=>{
    const {a,anchor,yaw}=climber(sim);for(let i=0;i<600&&a.climb?.phase!=='mantle';i++){input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);}
    expect(a.climb?.phase).toBe('mantle');const guardian=sim.addActor('guardian','Guardian','bastion',false,{...anchor.landing,y:anchor.landing.y+1});sim.world.step();
    input(sim,a,{climb:true,forward:1,yaw});sim.step(1/60);expect(a.climb).toBeNull();
    expect(Math.hypot(a.position.x-guardian.position.x,a.position.z-guardian.position.z)).toBeGreaterThan(actorHullRadius(a)+actorHullRadius(guardian));
  }));
  it('retains climb headroom during release pose retraction and delays a requested form change',()=>withSim(sim=>{
    const {a,yaw}=climber(sim);input(sim,a,{climb:true,yaw});sim.step(1/60);expect(a.climb).not.toBeNull();
    const collider=(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(a.id)!.collider;
    const height=()=>{const shape=collider.shape as RAPIER.RoundCylinder;return 2*(shape.halfHeight+shape.borderRadius);};
    input(sim,a,{stance:'upright',yaw});sim.step(1/60);const detachedAt=a.climbDetachedAt;
    expect(a.climb).toBeNull();expect(height()).toBeCloseTo(2.6);
    for(let i=0;i<14;i++){input(sim,a,{stance:'upright',yaw});sim.step(1/60);}
    expect(a.grounded).toBe(true);expect(a.stance).toBe('quadruped');expect(height()).toBeCloseTo(2.6);
    expect(sim.snapshot().actors[0].climbDetachedAt).toBe(detachedAt);
    for(let i=0;i<8;i++){input(sim,a,{stance:'upright',yaw});sim.step(1/60);}
    expect(a.stance).toBe('upright');expect(height()).toBeCloseTo(3.8);
  }));
});

describe('replicated authored breakable cover',()=>{
  it('damages only a winning cover hit, retires one collider, and keeps destroyed state through reloads',()=>withSim(sim=>{
    const {p,shooter,yaw,point,box}=coverFixture(sim),state=sim.cover.get(p.id!)!,count=sim.world.bodies.len();
    const victim=sim.addActor('victim','Victim','pounce',false,point(0,-box[2]-3));advance(sim,3);
    input(sim,shooter,{fire:true,yaw});sim.step(1/60);input(sim,shooter,{});advance(sim,.15);expect(victim.hp).toBeLessThan(victim.maxHp);expect(state.hp).toBe(180);sim.removeActor(victim.id);
    for(let i=0;i<150;i++){input(sim,shooter,{fire:true,yaw});sim.step(1/60);}
    expect(state.hp).toBe(0);expect(state.destroyedAt).not.toBeNull();expect(sim.world.bodies.len()).toBe(count-1);
    const snap=sim.snapshot();snap.cover[0].hp=180;expect(state.hp).toBe(0);expect(sim.events.filter(e=>e.type==='cover-break'&&e.coverId===p.id)).toHaveLength(1);
    sim.syncChunks([{x:300,y:1,z:300}]);sim.syncChunks([shooter.position]);sim.world.step();const loaded=sim.world.bodies.len();
    sim.syncChunks([{x:300,y:1,z:300}]);sim.syncChunks([shooter.position]);expect(sim.world.bodies.len()).toBe(loaded);expect(sim.snapshot().cover.find(c=>c.id===p.id)?.hp).toBe(0);
    for(let i=0;i<150;i++){input(sim,shooter,{forward:1,yaw});sim.step(1/60);}expect(shooter.grounded).toBe(true);
    const c=Math.cos(p.rotation),s=Math.sin(p.rotation),localZ=(shooter.position.x-p.x)*s+(shooter.position.z-p.z)*c;expect(localZ).toBeGreaterThan(box[2]+2);
  }));
  it('keeps the wall blocking the rocket explosion that destroys it, then opens LOS',()=>withSim(sim=>{
    const {p,box,point,shooter,yaw}=coverFixture(sim),state=sim.cover.get(p.id!)!;
    // Strike near the corner: target is close enough for splash but protected by the intact box.
    sim.removeActor(shooter.id);const a=sim.addActor('a','Shooter','pounce',false,point(box[0]-.5,-box[2]-7));
    const target=sim.addActor('target','Target','pounce',false,point(box[0]+2,0));advance(sim,3);state.hp=50;
    input(sim,a,{rocket:true,yaw});sim.step(1/60);input(sim,a,{});advance(sim,.35);
    expect(state.hp).toBe(0);expect(target.hp).toBe(target.maxHp);expect(sim.snapshot().cover.find(c=>c.id===p.id)?.destroyedAt).not.toBeNull();
    const clear=(sim as unknown as {lineOfSight(a:ActorState['position'],b:ActorState['position']):boolean}).lineOfSight(point(box[0]-.5,-box[2]-.1),target.position);expect(clear).toBe(true);
  }));
  it('admits stable neutral cover in every theater and applies bounded actual weapon damage',()=>{
    for(const seed of [7734,1926,4107])withSim(sim=>{
      const {p,shooter,yaw}=coverFixture(sim),state=sim.cover.get(p.id!)!;expect(state.maxHp).toBe(180);
      // Aim at the actual upper panel using the muzzle-to-wall distance.
      // Diagnostic rays show the old short-distance proxy aim misses Ember's
      // shipping wall and hits terrain; it is not an accepted cover hit.
      const pitch=Math.atan2(p.y+4*p.scale-(shooter.position.y+.65),Math.hypot(shooter.position.x-p.x,shooter.position.z-p.z)-1.3);
      input(sim,shooter,{fire:true,yaw,pitch});sim.step(1/60);input(sim,shooter,{});advance(sim,.2);
      expect(state.hp).toBe(158);expect(sim.snapshot().cover.find(c=>c.id===p.id)?.hp).toBe(158);
    },seed);
  });
});
