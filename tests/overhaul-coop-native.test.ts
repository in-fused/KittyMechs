import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {getMap} from '../shared/maps';
import {terrainHeight} from '../shared/world';
import {emptyInput,type ActorState,type InputState,type Vec3} from '../shared/types';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

beforeAll(async()=>{await RAPIER.init();});
function arena(seed=7734){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'coop');
  for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);
  const origin=getMap(seed).spawn;
  const at=(x:number):Vec3=>({x,y:terrainHeight(x,origin.z,seed)+1,z:origin.z});
  const host=sim.addActor('host','Host','pounce',false,at(origin.x)),guest=sim.addActor('guest','Guest','pounce',false,at(origin.x+4.2));
  let seq=0;
  const send=(a:ActorState,extra:Partial<InputState>={})=>sim.setInput(a.id,{...emptyInput(),seq:++seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,...extra});
  const step=(count=1,hostExtra:Partial<InputState>={},guestExtra:Partial<InputState>={})=>{for(let i=0;i<count;i++){send(host,hostExtra);send(guest,guestExtra);sim.step(1/60);}};
  // Exercise the actual native damage acceptance/cleanup path, without making this
  // a weapon aim test. Initial normal inputs end spawn protection after 2.5 seconds.
  const damage=(a:ActorState,amount:number)=>(sim as unknown as {damage:(target:ActorState,amount:number,owner:string,point:Vec3)=>void}).damage(a,amount,'enemy-test',a.position);
  const lethal=(a:ActorState)=>damage(a,10000);
  const collider=(a:ActorState)=>{let result:RAPIER.Collider|undefined;world.colliders.forEach(c=>{const body=c.parent(),p=body?.translation();if(body?.isKinematic()&&p&&Math.hypot(p.x-a.position.x,p.y-a.position.y,p.z-a.position.z)<.01)result=c;});return result!;};
  const close=()=>{sim.dispose();world.free();};
  step(180);return {world,sim,host,guest,send,step,damage,lethal,collider,close};
}

describe('native integrated overhaul co-op authority',()=>{
  it('continues native corpse gravity after an airborne all-down failure',()=>{
    const run=arena();try{
      run.step(1,{jump:true,jumpId:1},{jump:true,jumpId:1});run.step(10);
      expect(run.guest.grounded).toBe(false);const airY=run.guest.position.y;
      run.lethal(run.host);run.lethal(run.guest);run.step();
      expect(run.sim.snapshot().coop?.status).toBe('failed');run.step(180);
      expect(run.guest.position.y).toBeLessThan(airY-.5);expect(run.guest.grounded).toBe(true);
      expect(run.guest.hp).toBe(0);expect(run.sim.snapshot().coop?.status).toBe('failed');
    }finally{run.close();}
  });
  it('accepts lethal downing, retires collision/life, suppresses action and never rebuilds on a timer',()=>{
    const run=arena();try{
      const epoch=run.guest.jumpEpoch,bodyCount=run.world.bodies.len();run.lethal(run.guest);
      expect(run.guest.hp).toBe(0);expect(run.guest.downed).toBeTruthy();expect(run.guest.jumpEpoch).toBeGreaterThan(epoch);expect(run.collider(run.guest).isEnabled()).toBe(false);
      run.step(420,{}, {forward:1,fire:true,boost:true,jump:true,jumpId:1,strike:true,strikeId:1});
      expect(run.guest.hp).toBe(0);expect(run.guest.strike).toBeNull();expect(run.guest.climb).toBeNull();expect(run.sim.projectiles).toHaveLength(0);expect(run.world.bodies.len()).toBe(bodyCount);expect(run.sim.snapshot().coop?.status).toBe('active');
      const snap=run.sim.snapshot(),admitted=admitStructuralSnapshot(snap,null);expect(admitted).not.toBeNull();snap.actors.find(a=>a.id==='guest')!.downed!.reviveProgress=.7;expect(admitted!.actors.find(a=>a.id==='guest')!.downed!.reviveProgress).toBe(0);
    }finally{run.close();}
  });
  it('revives at the corpse position with an actual enabled quadruped collider and admitted snapshots',()=>{
    const run=arena();try{
      run.lethal(run.guest);run.step(30);const position={...run.guest.position},epoch=run.guest.jumpEpoch,count=run.world.bodies.len(),lastDamage=run.guest.hurtAt;
      run.step(90,{interact:true});expect(run.guest.hp).toBe(0);expect(run.guest.downed?.reviveProgress).toBeCloseTo(.5);
      const midway=admitStructuralSnapshot(run.sim.snapshot(),null);expect(midway).not.toBeNull();run.step(90,{interact:true});
      expect(run.guest.hp).toBe(88);expect(run.guest.downed).toBeNull();expect(run.guest.position.x).toBeCloseTo(position.x);expect(run.guest.position.z).toBeCloseTo(position.z);expect(Math.abs(run.guest.position.y-position.y)).toBeLessThan(.02);expect(run.collider(run.guest).isEnabled()).toBe(true);expect(run.guest.jumpEpoch).toBe(epoch);expect(run.world.bodies.len()).toBe(count);
      expect(admitStructuralSnapshot(run.sim.snapshot(),midway)).not.toBeNull();
      expect(run.guest.hurtAt).toBe(lastDamage);expect(run.guest.hitAt).toBeCloseTo(run.sim.time);
      run.step(12,{}, {forward:1});expect(run.guest.hp).toBe(88);expect(Math.hypot(run.guest.position.x-position.x,run.guest.position.z-position.z)).toBeGreaterThan(.5);
      run.damage(run.guest,10);expect(run.guest.hp).toBe(88);expect(run.guest.hurtAt).toBe(lastDamage);
      run.step(121);run.damage(run.guest,10);expect(run.guest.hp).toBe(78);expect(run.guest.hurtAt).toBe(run.sim.time);expect(run.guest.hitAt).toBe(run.sim.time);
    }finally{run.close();}
  });
  it('blocks rescue through a real solid while retaining the rescue interaction priority',()=>{
    const run=arena();try{
      run.lethal(run.guest);run.step(30);const p=run.host.position,q=run.guest.position;
      const barrier=run.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,2,2).setTranslation((p.x+q.x)/2,Math.min(p.y,q.y)+1,p.z));run.world.step();
      run.step(210,{interact:true});expect(run.guest.hp).toBe(0);expect(run.guest.downed?.reviveProgress).toBe(0);
      run.world.removeCollider(barrier,true);run.world.step();run.step(180,{interact:true});expect(run.guest.hp).toBe(88);
    }finally{run.close();}
  });
  it('freezes an all-down attempt until a fresh press then retries from a preserved checkpoint',()=>{
    const run=arena();try{
      const first=run.sim.objectives[0];first.complete=true;first.progress=1;const second=run.sim.objectives[1];second.progress=.6;
      run.sim.checkpoint={objectiveId:first.id,name:first.name,position:{...first.position},activatedAt:run.sim.time};
      const damage=run.sim.structures[0];damage.hp[0]=damage.hp[0]-10;const beforeHp=damage.hp[0],epoch=run.guest.jumpEpoch;
      run.send(run.host,{interact:true});run.lethal(run.host);run.lethal(run.guest);run.sim.step(1/60);expect(run.sim.snapshot().coop?.status).toBe('failed');
      const before={...run.guest.position};run.step(100,{interact:true});expect(run.sim.snapshot().coop?.status).toBe('failed');expect(Math.hypot(run.guest.position.x-before.x,run.guest.position.z-before.z)).toBeLessThan(.001);expect(run.guest.grounded).toBe(true);expect(run.guest.hp).toBe(0);
      run.step(1,{interact:false});run.step(1,{interact:true});expect(run.sim.snapshot().coop?.status).toBe('active');expect(run.sim.snapshot().coop?.attempt).toBe(2);expect(run.guest.hp).toBe(run.guest.maxHp);expect(run.guest.jumpEpoch).toBeGreaterThan(epoch);expect(run.collider(run.guest).isEnabled()).toBe(true);
      expect(Math.hypot(run.guest.position.x-first.position.x,run.guest.position.z-first.position.z)).toBeLessThan(21);expect(first.complete).toBe(true);expect(second.progress).toBe(0);expect(damage.hp[0]).toBe(beforeHp);expect(run.sim.checkpoint?.objectiveId).toBe(first.id);expect(admitStructuralSnapshot(run.sim.snapshot(),null)).not.toBeNull();
    }finally{run.close();}
  });
  it('admits a late join into failure with no live blocking hull and includes it in retry',()=>{
    const run=arena();try{
      run.lethal(run.host);run.lethal(run.guest);run.step();const late=run.sim.addActor('late','Late','pounce');
      expect(late.downed).toBeTruthy();expect(late.hp).toBe(0);expect(run.collider(late).isEnabled()).toBe(false);run.step(90);
      run.send(late,{interact:true});run.sim.step(1/60);expect(run.sim.snapshot().coop?.status).toBe('active');expect(late.hp).toBe(late.maxHp);expect(run.collider(late).isEnabled()).toBe(true);
    }finally{run.close();}
  });
  it('keeps established co-op death-rebuild behavior outside the integrated Rainline district',()=>{
    const run=arena(1926);try{run.lethal(run.guest);expect(run.guest.downed??null).toBeNull();run.step(310);expect(run.guest.hp).toBe(run.guest.maxHp);expect(run.sim.snapshot().coop).toBeUndefined();}finally{run.close();}
  });
});
