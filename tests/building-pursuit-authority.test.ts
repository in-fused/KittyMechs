import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {rooftopEncounter} from '../shared/encounters';
import {climbAnchors} from '../shared/traversal';
import {onRoof} from '../shared/vertical-navigation';
import {MECHS,actorHullRadius} from '../shared/config';
import {emptyInput,type ActorState,type InputState} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
/** Explicit seeded pursuit fixture; this is not a player spawn journey. */
function pursuit(seed:number){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'coop');
  for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);
  const encounter=rooftopEncounter(seed),anchor=climbAnchors(seed).find(a=>a.id===encounter.roof.anchorId)!;
  const pilot=sim.addActor('pilot','Explicit roof target','pounce',false,{...encounter.roof.patrol[2],y:encounter.roof.center.y+1});pilot.hp=pilot.maxHp=100000;
  const scout=sim.addActor('scout','Scout','pounce',true,{...encounter.pursuer.position,y:encounter.pursuer.position.y+1},'scout');
  let seq=0;
  const sound=()=>sim.setInput(pilot.id,{...emptyInput(),seq:++seq,jumpEpoch:pilot.jumpEpoch,fire:true,yaw:1.4});
  const internal=sim as unknown as{botInput(actor:ActorState):InputState};
  const original=internal.botInput.bind(internal),requests:{time:number;grounded:boolean;jump:boolean;climb:boolean;normalDistance:number}[]=[];
  internal.botInput=actor=>{const input=original(actor);if(actor===scout)requests.push({time:sim.time,grounded:actor.grounded,jump:input.jump,climb:input.climb,normalDistance:(actor.position.x-anchor.position.x)*anchor.normal.x+(actor.position.z-anchor.position.z)*anchor.normal.z});return input;};
  return{world,sim,scout,pilot,encounter,anchor,requests,sound,close:()=>{sim.dispose();world.free();}};
}

describe('actual decorated-facade Scout pursuit',()=>{
  for(const seed of [7734,1926,4107])it(`${seed} keeps one ordinary jump bounded and completes the supported roof route`,()=>{
    const r=pursuit(seed);try{
      for(let i=0;i<60;i++)r.sim.step(1/60);r.sound();r.sim.step(1/60);
      r.sim.setInput(r.pilot.id,{...emptyInput(),seq:2,jumpEpoch:r.pilot.jumpEpoch});
      let grip=false,mantle=false,arrived=false,acceptedJump=false;
      for(let i=0;i<1200;i++){
        const before={...r.scout.position};r.sim.step(1/60);
        expect(Math.hypot(r.scout.position.x-before.x,r.scout.position.y-before.y,r.scout.position.z-before.z)).toBeLessThan(.26);
        if(r.requests.at(-1)?.jump){acceptedJump=true;expect(r.scout.velocity.y).toBeCloseTo(MECHS.pounce.jump-22/60,6);expect(r.scout.climb).toBeNull();}
        if(r.scout.climb){grip=true;expect(r.scout.climb.anchor).toBe(r.anchor.id);if(r.scout.climb.phase==='mantle')mantle=true;}
        else if(grip&&onRoof(r.encounter.roof,r.scout.position)){arrived=true;break;}
      }
      expect(grip).toBe(true);expect(mantle).toBe(true);expect(arrived).toBe(true);
      const jumps=r.requests.filter(x=>x.jump);expect(jumps).toHaveLength(seed===7734?0:1);
      if(seed!==7734){expect(acceptedJump).toBe(true);expect(jumps[0].grounded).toBe(true);expect(jumps[0].climb).toBe(false);expect(jumps[0].normalDistance).toBeGreaterThanOrEqual(actorHullRadius(r.scout)+1.2);expect(r.requests.some(x=>!x.grounded&&x.climb)).toBe(true);}
    }finally{r.close();}
  });
  for(const blocked of ['occupied','energy','disrupted'] as const)it(`does not launch a grip-clearance jump with ${blocked} route`,()=>{
    const r=pursuit(1926);try{
      if(blocked==='occupied')r.sim.addActor('occupant','Roof occupant','bastion',false,{...r.anchor.landing,y:r.anchor.landing.y+1});
      if(blocked==='disrupted')r.scout.disruptedUntil=100;
      for(let i=0;i<360;i++){if(blocked==='energy')r.scout.energy=0;if(i%30===0)r.sound();r.sim.step(1/60);expect(r.scout.climb).toBeNull();}
      expect(r.requests.some(x=>x.jump)).toBe(false);
    }finally{r.close();}
  });
});
