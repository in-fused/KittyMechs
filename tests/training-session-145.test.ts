import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {createTrainingAuthority145} from '../src/game/trainingAuthority145';
import type {TrainingReply145,TrainingRequest145} from '../src/game/trainingWorkerProtocol145';
const visual=vi.hoisted(()=>({ready:false}));
vi.mock('../src/game/camera/visualRegistry',()=>({createCameraVisualStartup044:()=>()=>visual.ready}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
const listeners=new Map<string,()=>void>();
vi.stubGlobal('window',{innerWidth:1200,addEventListener:(name:string,fn:()=>void)=>listeners.set(name,fn),removeEventListener:(name:string,fn:()=>void)=>{if(listeners.get(name)===fn)listeners.delete(name);}});
vi.stubGlobal('location',{search:''});
class Port {static all:Port[]=[];onmessage:((e:MessageEvent<TrainingReply145>)=>void)|null=null;onerror:((e:ErrorEvent)=>void)|null=null;onmessageerror:((e:MessageEvent)=>void)|null=null;sent:TrainingRequest145[]=[];terminated=0;constructor(){Port.all.push(this);}postMessage(m:TrainingRequest145){this.sent.push(structuredClone(m));}terminate(){this.terminated++;}receive(m:TrainingReply145){this.onmessage?.({data:m} as MessageEvent<TrainingReply145>);}}
vi.stubGlobal('Worker',Port);
const {runtime,resetRuntime}=await import('../src/game/runtime');
const {useGameStore}=await import('../src/state/store');
const {deployTrainingWorker145,releaseTrainingSession145,readTrainingWorker145}=await import('../src/game/trainingSession145');
beforeAll(async()=>{await RAPIER.init();});
afterEach(()=>{resetRuntime();vi.useRealTimers();visual.ready=false;useGameStore.setState({phase:'hangar',error:null});});
function ready(port:Port){const start=port.sent[0];if(start.kind!=='start')throw Error('Missing actual startup');const owner=createTrainingAuthority145(start.options);try{port.receive({kind:'ready',generation:start.generation,state:owner.snapshot()});}finally{owner.close();}}
describe('145 deploy lifecycle owns a worker and no main authority',()=>{
 it('admits native bootstrap, keeps worker gated for real visual startup, then posts pause/resume and blur independently of authority',()=>{
  vi.useFakeTimers();const failure=vi.fn();runtime.transport='training';deployTrainingWorker145(failure);const port=Port.all.at(-1)!;expect(runtime.authority).toBe(false);expect(runtime.sim).toBeNull();expect(useGameStore.getState().phase).toBe('loading');ready(port);expect(useGameStore.getState().phase).toBe('playing');expect(readTrainingWorker145().session?.visualReady).toBe(false);visual.ready=true;vi.advanceTimersByTime(50);expect(port.sent.at(-1)).toMatchObject({kind:'pause',paused:false});useGameStore.setState({phase:'paused'});expect(port.sent.at(-1)).toMatchObject({kind:'pause',paused:true});useGameStore.setState({phase:'playing'});expect(port.sent.at(-1)).toMatchObject({kind:'pause',paused:false});listeners.get('blur')?.();expect(useGameStore.getState().phase).toBe('paused');expect(port.sent.at(-1)).toMatchObject({kind:'pause',paused:true});expect(failure).not.toHaveBeenCalled();
 });
 it('generation-bound scene cleanup terminates only its owned worker, removes listeners and fences late readiness',()=>{
  const failure=vi.fn();deployTrainingWorker145(failure);const old=Port.all.at(-1)!,generation=runtime.generation,late=old.onmessage;releaseTrainingSession145(generation);expect(old.terminated).toBe(1);expect(listeners.has('blur')).toBe(false);expect(runtime.generation).toBe(generation+1);deployTrainingWorker145(failure);const next=Port.all.at(-1)!;late?.({data:{kind:'failure',generation,message:'late'}} as MessageEvent<TrainingReply145>);releaseTrainingSession145(generation);expect(next.terminated).toBe(0);expect(failure).not.toHaveBeenCalled();expect(runtime.sim).toBeNull();
 });
 it('native-ready without visual readiness has a finite failure and complete worker cleanup',()=>{
  vi.useFakeTimers();const failure=vi.fn();deployTrainingWorker145(failure);const port=Port.all.at(-1)!;ready(port);vi.advanceTimersByTime(20000);expect(failure).toHaveBeenCalledOnce();expect(port.terminated).toBe(1);expect(listeners.has('blur')).toBe(false);expect(runtime.sim).toBeNull();expect(readTrainingWorker145().session?.status).toBe('closed');
 });
});
