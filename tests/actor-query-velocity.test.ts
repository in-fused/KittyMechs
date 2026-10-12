import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {ACTOR_HEIGHT,QUADRUPED_HEIGHT} from '../shared/config';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
type Owned={body:RAPIER.RigidBody;collider:RAPIER.Collider};
const floors=new WeakMap<Simulation,RAPIER.Collider>();
type FixtureAccess={physics:Map<string,Owned>};
const dt=1/60;
function send(sim:Simulation,actor:ActorState,forward=0){
  const packet=parseInput({...emptyInput(),seq:sim.tick+1,jumpEpoch:actor.jumpEpoch,stance:'quadruped',forward,yaw:-Math.PI/2,boost:forward>0});
  if(!packet)throw Error('Invalid ordinary input');sim.setInput(actor.id,packet);
}
function fixture(test:(sim:Simulation)=>void){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,1926,'pvp');
  for(const a of [...sim.actors.values()])sim.removeActor(a.id);
  // Retained historical controlled clock/spawn-protection fixture, not ordinary-time qualification.
  sim.time=3;sim.tick=180;
  // Controlled native fixture platform far above source terrain. Collider top=100.
  floors.set(sim,world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(100,99.5,208)));
  try{test(sim);}finally{sim.dispose();world.free();}
}
function step(sim:Simulation){sim.step(dt);}
function trace(sim:Simulation,label:string){console.log(JSON.stringify({label,tick:sim.tick,actors:[...sim.actors.values()].map(a=>{const body=(sim as unknown as FixtureAccess).physics.get(a.id)!.body;return{id:a.id,position:a.position,velocity:a.velocity,grounded:a.grounded,current:body.translation(),pending:body.nextTranslation(),nativeVelocity:body.linvel()};})}));}

describe('integrated owned-character support and deliberate nonconveyance',()=>{
  it('excludes a foreign moving platform and conveys a genuinely grounded rider',()=>fixture(sim=>{
    const platform=sim.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(100,103,208));
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(6,.5,6),platform);
    const rider=sim.addActor('rider','Rider','pounce',false,{x:100,y:103.5+ACTOR_HEIGHT+.03,z:208});
    for(let i=0;i<30;i++){send(sim,rider);step(sim);}
    trace(sim,'foreign-grounded');expect(rider.grounded).toBe(true);const start={...rider.position};
    for(let i=0;i<60;i++){platform.setNextKinematicTranslation({x:100+(i+1)*.025,y:103,z:208});send(sim,rider);step(sim);}
    trace(sim,'foreign-after-carry');console.log(JSON.stringify({foreignCurrent:platform.translation(),foreignPending:platform.nextTranslation(),foreignVelocity:platform.linvel()}));expect(platform.translation().x-100).toBeCloseTo(1.5,6);
    expect(rider.position.x-start.x).toBeGreaterThan(1.2);expect(rider.position.x-start.x).toBeLessThan(1.8);
    expect(rider.grounded).toBe(true);expect(Math.abs(rider.position.y-start.y)).toBeLessThan(.08);
  }));
  for(const reversed of [false,true])for(const landing of [false,true])it(`owned moving mech remains solid without passive conveyance (reverse=${reversed}, landing=${landing})`,()=>fixture(sim=>{
    const createCarrier=()=>sim.addActor('carrier','Carrier','bastion',false,{x:100,y:100+ACTOR_HEIGHT,z:208});
    const createRider=()=>sim.addActor('rider','Rider','pounce',false,{x:100,y:100+QUADRUPED_HEIGHT+ACTOR_HEIGHT+(landing?1.5:.03),z:208});
    let carrier:ActorState,rider:ActorState;if(reversed){rider=createRider();carrier=createCarrier();}else{carrier=createCarrier();rider=createRider();}
    for(let i=0;i<90;i++){send(sim,carrier);send(sim,rider);step(sim);}
    trace(sim,`owned-before-motion reverse=${reversed} landing=${landing}`);
    // Grounding arises from actual native contact, never assigned by fixture.
    expect(rider.grounded).toBe(true);expect(rider.position.y-carrier.position.y).toBeGreaterThan(QUADRUPED_HEIGHT-.12);
    const physics=(sim as unknown as FixtureAccess).physics;
    const riderCollider=physics.get(rider.id)!.collider,carrierCollider=physics.get(carrier.id)!.collider;
    // Prediction distance .2 observes native witnesses; it does not enlarge either hull.
    const initialSupport=riderCollider.contactCollider(carrierCollider,.2);
    expect(initialSupport).not.toBeNull();expect(initialSupport!.distance).toBeGreaterThanOrEqual(0);expect(initialSupport!.distance).toBeLessThan(.05);
    const start={...rider.position},carrierStart=carrier.position.x;let supportedTicks=0,groundLost:number|null=null,floorLanded:number|null=null;
    let historical90:unknown;
    for(let i=0;i<180;i++){
      send(sim,carrier,1);send(sim,rider);step(sim);
      if(rider.grounded&&rider.position.y>start.y-.15)supportedTicks++;
      if(!rider.grounded&&groundLost===null)groundLost=i+1;
      const floorContact=riderCollider.contactCollider(floors.get(sim)!, .2);
      if(groundLost!==null&&rider.grounded&&rider.position.y<start.y-1.5&&floorContact&&floorLanded===null)floorLanded=i+1;
      if(i===89){historical90={carrierTravel:carrier.position.x-carrierStart,riderDrop:start.y-rider.position.y,supportedTicks,grounded:rider.grounded,position:{...rider.position},oldCarrierOver5:carrier.position.x-carrierStart>5,oldDropOver1_5:rider.position.y<start.y-1.5};}
    }
    const finalFloor=riderCollider.contactCollider(floors.get(sim)!, .2);
    trace(sim,`owned-after180 reverse=${reversed} landing=${landing}`);
    console.log(JSON.stringify({historical90,extended180:{carrierTravel:carrier.position.x-carrierStart,groundLost,floorLanded,finalFloor},initialSupport,supportedTicks,scope:'Original90 contracts retained as diagnostics; independent180 departure/floor landing contract',carrierInput:{forward:1,boost:true,yaw:-Math.PI/2},riderInput:{forward:0,boost:false}}));
    expect(carrier.position.x-carrierStart).toBeGreaterThan(13);
    expect(Math.abs(rider.position.x-start.x)).toBeLessThan(.15);
    expect(supportedTicks).toBeGreaterThan(0);expect(groundLost).not.toBeNull();expect(floorLanded).not.toBeNull();expect(floorLanded!).toBeGreaterThan(groundLost!);
    expect(rider.grounded).toBe(true);expect(finalFloor).not.toBeNull();expect(finalFloor!.distance).toBeGreaterThanOrEqual(0);expect(finalFloor!.distance).toBeLessThan(.05);

  }));
});
