import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {terrainHeight} from '../shared/world';
import {coopExtractionWait,withinObjectiveReach} from '../shared/coopExtraction';
import {ACTOR_HEIGHT} from '../shared/config';
import {emptyInput,type ActorState,type InputState,type Mode,type Vec3} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
function arena(mode:Mode='coop',far=false){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  for(const actor of [...sim.actors.values()])sim.removeActor(actor.id);
  // Fixture isolates the native extraction/lifecycle rule, not mission traversal.
  sim.supplies=[];for(const o of sim.objectives)if(!o.optional&&o.id!=='extraction'){o.complete=true;o.progress=1;}
  const extraction=sim.objectives.find(o=>o.id==='extraction')!;extraction.unlocked=true;
  const at=(x:number,z:number):Vec3=>({x,y:terrainHeight(x,z,7734)+ACTOR_HEIGHT,z});
  const host=sim.addActor('host','Host','pounce',false,at(-9.8,12));
  const guest=sim.addActor('guest','Guest','pounce',false,at(-6.2,far?22:12));
  let seq=0;
  const step=(n=1,h:Partial<InputState>={},g:Partial<InputState>={})=>{for(let i=0;i<n;i++){
    for(const [a,input] of [[host,h],[guest,g]] as const)if(sim.actors.has(a.id))sim.setInput(a.id,{...emptyInput(),seq:++seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,...input});
    sim.step(1/60);
  }};
  const lethal=(actor:ActorState)=>(sim as unknown as {damage:(a:ActorState,n:number,id:string,p:Vec3)=>void}).damage(actor,10000,'test-enemy',actor.position);
  const close=()=>{sim.dispose();world.free();};step(180);
  return{world,sim,host,guest,step,lethal,extraction,close};
}
describe('authoritative squad extraction 052',()=>{
  it('does not pass an empty roster and shares strict 3D adjusted reach',()=>{
    expect(coopExtractionWait([],{x:0,y:0,z:0})).toBe('assemble');
    const a={bot:false,hp:1,downed:null,position:{x:0,y:ACTOR_HEIGHT+4.5,z:0}};
    expect(withinObjectiveReach(a,{x:0,y:0,z:0})).toBe(false);
    a.position.y-=.001;expect(coopExtractionWait([a,{...a,bot:true,hp:0,position:{x:100,y:0,z:100}}],{x:0,y:0,z:0})).toBeNull();
    a.hp=0;expect(coopExtractionWait([a],{x:0,y:0,z:0})).toBe('revive');
  });
  it('keeps a distant downed pilot and native rescue lifecycle active after a full host hold',()=>{
    const r=arena('coop',true);try{
      r.lethal(r.guest);r.step(500,{interact:true});
      expect(r.sim.phase).toBe('active');expect(r.extraction.complete).toBe(false);expect(r.extraction.progress).toBe(0);expect(r.guest.downed).toBeTruthy();
      const tick=r.sim.tick;r.step(30);expect(r.sim.tick).toBe(tick+30);expect(r.guest.grounded).toBe(true);expect(r.sim.snapshot().coop?.status).toBe('active');
    }finally{r.close();}
  });
  it('waits for a living distant pilot and does not softlock after that pilot disconnects',()=>{
    const r=arena('coop',true);try{
      r.step(500,{interact:true});expect(r.sim.phase).toBe('active');expect(r.extraction.progress).toBe(0);
      r.sim.removeActor(r.guest.id);r.step(481,{interact:true});expect(r.extraction.complete).toBe(true);expect(r.sim.phase).toBe('extracted');
    }finally{r.close();}
  });
  it('requires the full eight seconds with all humans alive inside and emits one capture',()=>{
    const r=arena();try{
      expect(coopExtractionWait([...r.sim.actors.values()],r.extraction.position)).toBeNull();
      r.step(479,{interact:true},{interact:true});expect(r.sim.phase).toBe('active');expect(r.extraction.progress).toBeCloseTo(479/480);
      r.step(2,{interact:true},{interact:true});expect(r.sim.phase).toBe('extracted');expect(r.extraction.complete).toBe(true);
      expect(r.sim.events.filter(e=>e.type==='capture')).toHaveLength(1);expect(r.host.hp).toBeGreaterThan(0);expect(r.guest.hp).toBeGreaterThan(0);
    }finally{r.close();}
  });
  it('resets a partial channel when a pilot is downed and allows the native revive to finish',()=>{
    const r=arena();try{
      r.step(240,{interact:true});expect(r.extraction.progress).toBeCloseTo(.5);r.lethal(r.guest);r.step(1,{interact:true});
      expect(r.sim.phase).toBe('active');expect(r.extraction.progress).toBe(0);r.step(210,{interact:true});expect(r.guest.downed).toBeNull();expect(r.guest.hp).toBe(88);
      expect(r.sim.phase).toBe('active');expect(r.extraction.progress).toBeLessThan(.1);
    }finally{r.close();}
  });
  it('resets a partial channel when an ordinary moving guest leaves the zone',()=>{
    const r=arena();try{
      r.step(240,{interact:true});r.step(100,{interact:true},{forward:1});
      expect(withinObjectiveReach(r.guest,r.extraction.position)).toBe(false);expect(r.extraction.progress).toBe(0);expect(r.sim.phase).toBe('active');
    }finally{r.close();}
  });
  it('rechecks late native damage on the terminal frame before committing extraction',()=>{
    const r=arena();try{
      r.step(479,{interact:true});
      const hooks=r.sim as unknown as {advanceFields:(dt:number)=>void},original=hooks.advanceFields.bind(r.sim);
      hooks.advanceFields=dt=>{original(dt);if(r.extraction.progress>=1)r.lethal(r.guest);};
      r.step(2,{interact:true});expect(r.guest.downed).toBeTruthy();expect(r.sim.phase).toBe('active');expect(r.extraction.complete).toBe(false);expect(r.extraction.progress).toBe(0);
    }finally{r.close();}
  });
  it.each(['training','pvpve'] as const)('preserves %s one-pilot extraction with a distant living teammate',mode=>{
    const r=arena(mode,true);try{r.step(481,{interact:true});expect(r.sim.phase).toBe('extracted');expect(r.extraction.complete).toBe(true);}finally{r.close();}
  });
  it('preserves PvP objective exclusion',()=>{
    const r=arena('pvp',true);try{r.step(481,{interact:true});expect(r.sim.phase).toBe('active');expect(r.extraction.progress).toBe(0);}finally{r.close();}
  });
});
