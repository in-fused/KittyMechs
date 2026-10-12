import {beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type GameSnapshot} from '../shared/types';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {createTrainingAuthority145} from '../src/game/trainingAuthority145';
import {createTrainingWorkerClient145,type WorkerPort145} from '../src/game/trainingWorkerClient145';
import {TrainingClock145,type TrainingReply145,type TrainingRequest145} from '../src/game/trainingWorkerProtocol145';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
beforeAll(async()=>{await RAPIER.init();});
const options={seed:7734,room:'TRAINING145',id:'local',name:'Pilot',chassis:'pounce' as const};
class Port implements WorkerPort145 {onmessage:WorkerPort145['onmessage']=null;onerror:WorkerPort145['onerror']=null;onmessageerror:WorkerPort145['onmessageerror']=null;sent:TrainingRequest145[]=[];terminated=0;postMessage(m:TrainingRequest145){this.sent.push(structuredClone(m));}terminate(){this.terminated++;}receive(m:TrainingReply145){this.onmessage?.({data:m} as MessageEvent<TrainingReply145>);}}
const canonical=(s:GameSnapshot)=>JSON.stringify(s.actors.map(a=>[a.id,a.position,a.velocity,a.hp,a.jumpEpoch,a.jumpProcessed,a.strikeProcessed,a.lastInput,a.stance,a.stanceFeedback,a.grounded,a.nativePose?.movement.delta,a.nativePose?.movement.contacts.map(c=>[c.reportedHandle,c.toi,c.raw,c.applied,c.remaining])]));
describe('145 worker native authority retains simulation contracts',()=>{
 it('retains full training roster,60Hz native poses,input ACK and admission against ordinary Simulation',()=>{
  const owner=createTrainingAuthority145(options),world=new RAPIER.World({x:0,y:-22,z:0}),baseline=new Simulation(world,options.seed,'training',options.room,RAPIER);baseline.addActor('local','Pilot','pounce');let previous:GameSnapshot|null=null;
  try{expect(owner.sim.actors.size).toBe(baseline.actors.size);expect([...owner.sim.actors.values()].filter(a=>a.bot).length).toBeGreaterThan(0);
   for(let tick=1;tick<=18;tick++){const a=owner.sim.actors.get('local')!,input={...emptyInput(),seq:tick,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,forward:.25,strafe:.1,...(tick===4?{jump:true,jumpId:1}:tick>=5?{jumpCancel:1}:{}),...(tick>=9?{stance:'upright' as const,stanceRequest:{seq:9,life:a.jumpEpoch}}:{})};owner.input(input);baseline.setInput('local',input);owner.step();baseline.step(1/60);const snapshot=owner.snapshot();expect(canonical(snapshot)).toBe(canonical(baseline.snapshot()));const admitted=admitStructuralSnapshot(snapshot,previous);expect(admitted).not.toBeNull();previous=admitted;expect(snapshot.tick).toBe(tick);expect(snapshot.time).toBeCloseTo(tick/60,12);expect(snapshot.actors.find(a=>a.id==='local')!.lastInput).toBe(tick);expect(snapshot.actors.find(a=>a.id==='local')!.nativePose?.nativeStepTick).toBe(tick);}
  }finally{owner.close();baseline.dispose();world.free();}
 });
 it('pauses native time entirely, retires paused wall debt and retains pending60Hz ticks in bounded turns',()=>{
  const clock=new TrainingClock145(0),owner=createTrainingAuthority145(options);try{expect(clock.pump(100,owner.step)).toBe(4);expect(owner.sim.tick).toBe(4);expect(clock.pump(100,owner.step)).toBe(2);expect(owner.sim.tick).toBe(6);clock.setPaused(true,100);expect(clock.pump(5100,owner.step)).toBe(0);expect(owner.sim.tick).toBe(6);clock.setPaused(false,5100);expect(clock.pump(5100,owner.step)).toBe(0);expect(clock.pump(5100+1000/60,owner.step)).toBe(1);expect(owner.sim.time).toBeCloseTo(7/60,12);}finally{owner.close();}
 });
 it('a native query failure poisons the owner and prevents further step/publication, then disposes idempotently',()=>{
  const owner=createTrainingAuthority145(options),physics=(owner.sim as unknown as {physics:Map<string,{controller:RAPIER.KinematicCharacterController}>}).physics;physics.get('local')!.controller.computeColliderMovement=()=>{throw Error('Actual native controller failure');};expect(()=>owner.step()).toThrow();expect(owner.sim.physicsFailed).toBe(true);expect(()=>owner.snapshot()).toThrow();owner.close();owner.close();expect(()=>owner.step()).toThrow(/closed/);
 });
});
describe('145 worker client readiness and ownership',()=>{
 it('admits actual native readiness before sends, stops async callbacks on close and ignores stale generations',()=>{
  const native=createTrainingAuthority145(options),port=new Port(),ready=vi.fn(),failure=vi.fn();let current=true;const admit=vi.fn((s:GameSnapshot)=>admitStructuralSnapshot(s,null)!==null),client=createTrainingWorkerClient145(port,7,options,{current:()=>current,admit,ready,failure});
  try{expect(client.input(emptyInput())).toBe(false);port.receive({kind:'ready',generation:6,state:native.snapshot()});expect(admit).not.toHaveBeenCalled();port.receive({kind:'ready',generation:7,state:native.snapshot()});expect(ready).toHaveBeenCalledOnce();expect(client.input({...emptyInput(),seq:1})).toBe(true);expect(port.sent.at(-1)?.kind).toBe('input');const late=port.onmessage;current=false;late?.({data:{kind:'failure',generation:7,message:'late'}} as MessageEvent<TrainingReply145>);expect(failure).not.toHaveBeenCalled();client.close();client.close();expect(port.terminated).toBe(1);expect(port.onmessage).toBeNull();}finally{client.close();native.close();}
 });
 it('terminates on finite startup timeout and never silently creates a partial main authority',()=>{
  vi.useFakeTimers();const port=new Port(),failure=vi.fn(),ready=vi.fn(),client=createTrainingWorkerClient145(port,9,options,{current:()=>true,admit:()=>true,ready,failure});try{vi.advanceTimersByTime(20000);expect(port.terminated).toBe(1);expect(failure).toHaveBeenCalledOnce();expect(ready).not.toHaveBeenCalled();expect(client.input(emptyInput())).toBe(false);}finally{client.close();vi.useRealTimers();}
 });
 it('terminates on post failure or rejected native snapshot without readiness',()=>{
  const native=createTrainingAuthority145(options),port=new Port(),failure=vi.fn(),ready=vi.fn(),client=createTrainingWorkerClient145(port,1,options,{current:()=>true,admit:()=>false,ready,failure});try{port.receive({kind:'ready',generation:1,state:native.snapshot()});expect(port.terminated).toBe(1);expect(failure).toHaveBeenCalledOnce();expect(ready).not.toHaveBeenCalled();}finally{client.close();native.close();}
 });
});
