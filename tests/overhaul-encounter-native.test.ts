import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type InputState} from '../shared/types';
import {terrainHeight} from '../shared/world';
import {horizontalDistance} from '../shared/math';

beforeAll(async()=>{await RAPIER.init();});
function arena(mode:'coop'|'pvpve'='coop'){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode),pilot=sim.addActor('pilot','Pilot','pounce');let seq=0;
  const step=(count=1,extra:Partial<InputState>={})=>{for(let i=0;i<count;i++){sim.setInput(pilot.id,{...emptyInput(),seq:++seq,jumpEpoch:pilot.jumpEpoch,strikeEpoch:pilot.jumpEpoch,...extra});sim.step(1/60);}};
  const close=()=>{sim.dispose();world.free();};return {world,sim,pilot,step,close};
}
describe('native district encounter pacing',()=>{
  it('lets a solo pilot remain in staging with the full authored roster for thirty seconds',()=>{
    const run=arena();try{
      const homes=new Map([...run.sim.actors.values()].filter(a=>a.bot).map(a=>[a.id,{...a.position}]));expect(homes.size).toBeGreaterThan(7);
      run.step(1800);expect(run.pilot.hp).toBe(run.pilot.maxHp);expect(run.sim.snapshot().coop?.status).toBe('active');
      for(const a of run.sim.actors.values())if(a.bot){expect(a.fireAt).toBe(-100);expect(a.rocketAt).toBe(-100);expect(horizontalDistance(a.position,homes.get(a.id)!)).toBeLessThan(21);}
    }finally{run.close();}
  },20000);
  it('admits a local enemy after ordinary movement leaves staging, warns, then causes normal damage',()=>{
    const run=arena();try{
      run.step(180);let warning=false;
      for(let i=0;i<480;i++){
        run.step(1,{forward:1});const threats=[...run.sim.actors.values()].filter(a=>a.bot&&a.windupUntil>run.sim.time&&a.aiState==='windup');
        if(threats.length){warning=true;expect(run.pilot.position.z).toBeLessThan(0);expect(run.pilot.hp).toBe(run.pilot.maxHp);expect(threats).toHaveLength(1);expect(threats[0].windupUntil-run.sim.time).toBeGreaterThan(.8);break;}
      }
      expect(warning).toBe(true);run.step(42);expect(run.pilot.hp).toBe(run.pilot.maxHp);
      run.step(240);expect(run.pilot.hp).toBeLessThan(run.pilot.maxHp);expect([...run.sim.actors.values()].some(a=>a.bot&&a.fireAt>0)).toBe(true);
    }finally{run.close();}
  },20000);
  it('admits an explicitly attacked local defense in PvPvE staging with telegraph and ordinary damage',()=>{
    const run=arena('pvpve');try{
      for(const a of [...run.sim.actors.values()])if(a.bot)run.sim.removeActor(a.id);
      const x=run.pilot.position.x,z=run.pilot.position.z-12,enemy=run.sim.addActor('local-defense','Defense','pounce',true,{x,y:terrainHeight(x,z,7734)+1,z},'anchor');run.step(180);
      expect(enemy.fireAt).toBe(-100);run.step(1,{fire:true,yaw:Math.PI});expect(enemy.aiState).toBe('windup');expect(enemy.windupUntil).toBeGreaterThan(run.sim.time+.8);
      run.step(42);expect(enemy.fireAt).toBe(-100);expect(run.pilot.hp).toBe(run.pilot.maxHp);run.step(180);expect(enemy.fireAt).toBeGreaterThan(0);expect(run.pilot.hp).toBeLessThan(run.pilot.maxHp);
    }finally{run.close();}
  });
});
