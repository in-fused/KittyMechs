import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import {ACTOR_HEIGHT,actorHullRadius,actorQuadHeight} from '../../shared/config';
import {getMap} from '../../shared/maps';
import {terrainHeight} from '../../shared/world';
import {emptyInput,type ActorState,type InputState,type Vec3} from '../../shared/types';
beforeAll(async()=>{await RAPIER.init();});
function arena(){
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'coop');
 for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);
 const origin=getMap(7734).spawn,at=(x:number)=>({x,y:terrainHeight(x,origin.z,7734)+ACTOR_HEIGHT,z:origin.z});
 const host=sim.addActor('host','Host','pounce',false,at(origin.x)),guest=sim.addActor('guest','Guest','pounce',false,at(origin.x+4.2));let seq=0;
 const send=(actor:ActorState,extra:Partial<InputState>)=>sim.setInput(actor.id,{...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,...extra});
 const step=(count:number,interact=false)=>{for(let i=0;i<count;i++){send(host,{interact});send(guest,{});sim.step(1/60);}};
 const collider=()=>{let found:RAPIER.Collider|undefined;world.colliders.forEach(c=>{const body=c.parent(),p=body?.translation();if(body?.isKinematic()&&p&&Math.hypot(p.x-guest.position.x,p.y-guest.position.y,p.z-guest.position.z)<.01)found=c;});return found!;};
 step(180);
 // A controlled native regression uses the same accepted damage path as the
 // existing co-op tests, then normal setInput/E and real Simulation steps.
 (sim as unknown as {damage:(a:ActorState,n:number,owner:string,p:Vec3)=>void}).damage(guest,10000,'enemy-test',guest.position);step(30);
 return {world,sim,host,guest,step,collider,close:()=>{sim.dispose();world.free();}};
}
function restoration(run:ReturnType<typeof arena>){const radius=actorHullRadius(run.guest),height=actorQuadHeight(run.guest),center={...run.guest.position,y:run.guest.position.y-ACTOR_HEIGHT+height/2+.06};return {radius,height,center,actual:new RAPIER.RoundCylinder(height/2-.12,radius-.12,.12)};}
describe('actual circular rescue restoration 070',()=>{
 it('revives beside a diagonal solid outside the real circular hull after the normal three-second E channel',()=>{
  const run=arena();try{
   const corpse={...run.guest.position},query=restoration(run),corner=run.world.createCollider(RAPIER.ColliderDesc.cuboid(.05,.5,.05).setTranslation(corpse.x+1.5,query.center.y,corpse.z+1.5));run.world.step();
   const self=run.collider(),flags=RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,rotation={x:0,y:0,z:0,w:1};
   expect(run.world.intersectionWithShape(query.center,rotation,new RAPIER.Cuboid(query.radius,query.height/2,query.radius),flags,undefined,self,self.parent()??undefined)?.handle).toBe(corner.handle);
   expect(run.world.intersectionWithShape(query.center,rotation,query.actual,flags,undefined,self,self.parent()??undefined)).toBeNull();
   run.step(179,true);expect(run.guest.hp).toBe(0);expect(run.guest.downed?.reviveProgress).toBeCloseTo(179/180,6);
   run.step(1,true);expect(run.guest.hp).toBe(88);expect(run.guest.downed).toBeNull();expect(run.collider().isEnabled()).toBe(true);expect(run.collider().shape).toBeInstanceOf(RAPIER.RoundCylinder);
   expect(run.guest.position.x).toBeCloseTo(corpse.x,6);expect(run.guest.position.z).toBeCloseTo(corpse.z,6);expect(Math.abs(run.guest.position.y-corpse.y)).toBeLessThan(.03);
  }finally{run.close();}
 });
 it('rejects genuine circular hull penetration while retaining full channel progress and revives after actual solid removal',()=>{
  const run=arena();try{
   const q=restoration(run),barrier=run.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.5,.1).setTranslation(run.guest.position.x+1,q.center.y,run.guest.position.z+1));run.world.step();
   expect(run.world.intersectionWithShape(q.center,{x:0,y:0,z:0,w:1},q.actual,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC)).not.toBeNull();
   run.step(210,true);expect(run.guest.hp).toBe(0);expect(run.guest.downed?.reviveProgress).toBe(1);expect(run.collider().isEnabled()).toBe(false);
   run.world.removeCollider(barrier,true);run.world.step();run.step(1,true);expect(run.guest.hp).toBe(88);expect(run.guest.downed).toBeNull();expect(run.collider().isEnabled()).toBe(true);
  }finally{run.close();}
 });
 it('keeps ordinary terrain-floor restoration and accepted post-revive movement',()=>{
  const run=arena();try{
   const corpse={...run.guest.position};expect(run.guest.grounded).toBe(true);run.step(180,true);
   expect(run.guest.hp).toBe(88);expect(run.guest.downed).toBeNull();expect(run.collider().isEnabled()).toBe(true);expect(Math.abs(run.guest.position.y-corpse.y)).toBeLessThan(.03);
   const input={...emptyInput(),seq:100000,jumpEpoch:run.guest.jumpEpoch,strikeEpoch:run.guest.jumpEpoch,forward:1};run.sim.setInput(run.guest.id,input);for(let i=0;i<12;i++)run.sim.step(1/60);
   expect(Math.hypot(run.guest.position.x-corpse.x,run.guest.position.z-corpse.z)).toBeGreaterThan(.5);expect(run.guest.hp).toBe(88);
  }finally{run.close();}
 });
});
