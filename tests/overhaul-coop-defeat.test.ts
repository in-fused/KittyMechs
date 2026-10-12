import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {getMap} from '../shared/maps';
import {terrainHeight} from '../shared/world';
import {emptyInput,type ActorState,type Mode,type Vec3} from '../shared/types';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

beforeAll(async()=>{await RAPIER.init();});
function arena(mode:Mode='coop',seed=7734,placed=false){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,mode);
  const street=placed?sim.actors.get('overhaul-street-scout'):undefined,guardian=placed?sim.actors.get('roof-guardian'):undefined;
  for(const a of [...sim.actors.values()])if(a.bot&&a!==street&&a!==guardian)sim.removeActor(a.id);
  const origin=getMap(seed).spawn,host=sim.addActor('host','Host','pounce');
  const enemy=street??sim.addActor('placed-defense','Defense','pounce',true,{x:origin.x+9,y:terrainHeight(origin.x+9,origin.z,seed)+1,z:origin.z},'scout');
  let seq=0;
  const send=(interact=false)=>sim.setInput(host.id,{...emptyInput(),seq:++seq,jumpEpoch:host.jumpEpoch,strikeEpoch:host.jumpEpoch,interact});
  const step=(count:number,interact=false)=>{for(let i=0;i<count;i++){send(interact);sim.step(1/60);}};
  const lethal=(a:ActorState,owner=host.id)=>(sim as unknown as {damage:(target:ActorState,amount:number,owner:string,point:Vec3)=>void}).damage(a,10000,owner,a.position);
  const close=()=>{sim.dispose();world.free();};step(180);return {world,sim,host,enemy,guardian,step,lethal,close};
}

describe('finite placed Rainline co-op defeats',()=>{
  it('keeps the authored street scout and roof guardian defeated beyond their old timer with one salvage award',()=>{
    const run=arena('coop',7734,true);try{
      run.lethal(run.enemy);run.lethal(run.guardian!);const epoch=run.enemy.jumpEpoch,deadline=run.enemy.respawnAt;expect(run.host.kills).toBe(2);expect(run.host.salvage).toBe(70);
      run.step(1500);expect(run.sim.time).toBeGreaterThan(deadline);expect(run.enemy.hp).toBe(0);expect(run.guardian!.hp).toBe(0);expect(run.enemy.jumpEpoch).toBe(epoch);expect(run.enemy.aiState).toBe('destroyed');expect(run.enemy.grounded).toBe(true);
      run.lethal(run.enemy);expect(run.host.kills).toBe(2);expect(run.host.salvage).toBe(70);
      run.sim.addActor('late','Late','pounce');const snapshot=run.sim.snapshot();expect(snapshot.actors.find(a=>a.id===run.enemy.id)?.hp).toBe(0);expect(snapshot.actors.find(a=>a.id===run.guardian!.id)?.hp).toBe(0);expect(admitStructuralSnapshot(snapshot,null)).not.toBeNull();
    }finally{run.close();}
  });
  it('retains a cleared enemy across all-down checkpoint retry and a later full respawn interval',()=>{
    const run=arena();try{
      run.lethal(run.enemy);const first=run.sim.objectives[0];first.complete=true;first.progress=1;run.sim.checkpoint={objectiveId:first.id,name:first.name,position:{...first.position},activatedAt:run.sim.time};
      const kills=run.host.kills,salvage=run.host.salvage;run.lethal(run.host,'world');run.step(1);expect(run.sim.snapshot().coop?.status).toBe('failed');run.step(70);run.step(1,true);
      expect(run.sim.snapshot().coop?.attempt).toBe(2);expect(run.host.hp).toBe(run.host.maxHp);expect(run.enemy.hp).toBe(0);expect(run.sim.checkpoint?.objectiveId).toBe(first.id);
      run.step(1500);expect(run.enemy.hp).toBe(0);expect(run.host.kills).toBe(kills);expect(run.host.salvage).toBe(salvage);expect(run.sim.snapshot().coop?.status).toBe('active');
    }finally{run.close();}
  });
  it('starts a fresh placed encounter roster in a newly constructed room',()=>{
    const first=arena('coop',7734,true);try{first.lethal(first.enemy);expect(first.enemy.hp).toBe(0);}finally{first.close();}
    const next=arena('coop',7734,true);try{expect(next.enemy.hp).toBe(next.enemy.maxHp);expect(next.guardian!.hp).toBe(next.guardian!.maxHp);expect(next.host.kills).toBe(0);}finally{next.close();}
  });
  for(const [mode,seed] of [['pvp',7734],['pvpve',7734],['training',7734],['coop',1926],['coop',4107]] as const)it(`retains normal enemy respawn in ${mode}/${seed}`,()=>{
    const run=arena(mode,seed);try{
      run.lethal(run.enemy);expect(run.enemy.hp).toBe(0);const epoch=run.enemy.jumpEpoch;run.step(1330);expect(run.enemy.hp).toBe(run.enemy.maxHp);expect(run.enemy.jumpEpoch).toBeGreaterThan(epoch);expect(run.host.kills).toBe(1);expect(run.host.salvage).toBe(35);
    }finally{run.close();}
  });
});
