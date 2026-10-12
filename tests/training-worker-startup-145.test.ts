import {expect,it,vi} from 'vitest';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import type {TrainingRequest145} from '../src/game/trainingWorkerProtocol145';
const pending=vi.hoisted(()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {resolve,init:vi.fn(()=>promise),create:vi.fn()};});
// Only the asynchronous startup boundary is isolated here. Native simulation
// equivalence, poses, ACKs and disposal are tested with real Rapier separately.
vi.mock('@dimforge/rapier3d-compat',()=>({default:{init:pending.init}}));
vi.mock('../src/game/trainingAuthority145',()=>({createTrainingAuthority145:pending.create}));
it('actual worker entry fences late initialization after stop before allocating authority or publishing',async()=>{
 const scope:{onmessage:((e:MessageEvent<TrainingRequest145>)=>Promise<void>)|null;postMessage:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>}={onmessage:null,postMessage:vi.fn(),close:vi.fn()};
 vi.stubGlobal('self',scope);vi.useFakeTimers();
 try{
  await import('../src/game/training.worker');
  const starting=scope.onmessage!({data:{kind:'start',generation:32,inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,options:{seed:7734,room:'TRAINING145',id:'local',name:'Pilot',chassis:'pounce'}}} as MessageEvent<TrainingRequest145>);
  expect(pending.init).toHaveBeenCalledOnce();
  await scope.onmessage!({data:{kind:'stop',generation:32}} as MessageEvent<TrainingRequest145>);
  pending.resolve();await starting;
  expect(pending.create).not.toHaveBeenCalled();expect(scope.postMessage).not.toHaveBeenCalled();expect(scope.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 }finally{vi.unstubAllGlobals();vi.useRealTimers();}
});
