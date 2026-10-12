import {describe,it,expect,vi} from 'vitest';
import {Scene,PerspectiveCamera,Mesh,BoxGeometry,MeshStandardMaterial,BufferAttribute} from 'three';
vi.mock('../../src/game/runtime',()=>({runtime:{localId:'pilot',generation:1}}));
const provider=vi.hoisted(()=>({winner:null as any}));
vi.mock('../../src/game/camera/visualRegistry',()=>({hasCompletedCameraVisual044:()=>true,inspectCameraVisual222:()=>({winningProvider:provider.winner})}));
import {Preparation232,StartupLifetime232,createGate232,witness232,signature232,bodyReady232,retainedAdmission232,type Stamp232} from './shaderStartup232';
const context={};const stamp=():Stamp232=>({context,localId:'pilot',generation:1,quality:'low',signature:'original-full-scene',winner:'body'});
describe('232 finite owned preparation and actual callback boundary',()=>{
 it('queues once, polls without uniform first use, cannot admit promise/ready before actual body callback',()=>{
  let clock=0,ready=false;const gate=createGate232(),owner=new Preparation232(gate,()=>clock),queue=vi.fn(()=>[{isReady:()=>ready,getUniforms:()=>{throw Error('premature uniforms');}}]);
  owner.prepare(stamp(),true,queue);expect(owner.poll(stamp())).toBe(false);expect(gate.draw).toBeNull();
  clock=10;ready=true;expect(owner.poll(stamp())).toBe(true);expect(gate.draw).toBeNull();
  expect(owner.bodyDraw({...stamp(),winner:'wrong-provider'})).toBe(false);expect(owner.bodyDraw(stamp())).toBe(true);expect(queue).toHaveBeenCalledTimes(1);expect(gate.events.map(e=>e.kind)).toEqual(['warmup-start','KHR-availability','prepare-start','prepare-end','poll-complete','first-body-draw']);
 });
 it.each(['context','localId','generation','quality','signature','winner'] as const)('rejects stale %s and permanently retires old polling',key=>{
  const gate=createGate232(),owner=new Preparation232(gate);owner.prepare(stamp(),true,()=>[{isReady:()=>true}]);
  const changed:any={...stamp(),[key]:key==='context'?{}:key==='generation'?2:'changed'};
  expect(owner.poll(changed)).toBe(false);expect(owner.phase).toBe('cancelled');expect(owner.poll(stamp())).toBe(false);expect(owner.bodyDraw(stamp())).toBe(false);expect(gate.draw).toBeNull();
 });
 it('unsupported KHR remains explicit compatible path, still requires a real callback; preserves original callback and cancellation identity',()=>{
  const gate=createGate232(),owner=new Preparation232(gate);owner.prepare(stamp(),false,()=>[{isReady:()=>true}]);owner.poll(stamp());
  const mesh=new Mesh(),original=vi.fn();mesh.onAfterRender=original;let current:Stamp232|null=null;
  const restore=witness232(mesh,()=>current,owner);const wrapped=mesh.onAfterRender,args:any[]=[1,2,3,4,5,6];wrapped.apply(mesh,args as any);
  expect(original).toHaveBeenCalledWith(...args);expect(gate.draw).toBeNull();current=stamp();wrapped.apply(mesh,args as any);expect(gate.draw?.winner).toBe('body');restore();expect(mesh.onAfterRender).toBe(original);
  const other=vi.fn();const restore2=witness232(mesh,()=>stamp(),owner);mesh.onAfterRender=other;restore2();expect(mesh.onAfterRender).toBe(other);
  expect((gate.events.find(e=>e.kind==='KHR-availability')?.detail as any).available).toBe(false);
 });
 it('cleanup/StrictMode creates a fresh owner; detached callback cannot resurrect cancelled owner',()=>{
  const gate=createGate232(),old=new Preparation232(gate);old.prepare(stamp(),true,()=>[{isReady:()=>true}]);old.poll(stamp());
  const mesh=new Mesh(),original=mesh.onAfterRender,undo=witness232(mesh,()=>stamp(),old),detached=mesh.onAfterRender;old.cancel('StrictMode cleanup');undo();detached.apply(mesh,[] as any);expect(gate.draw).toBeNull();expect(mesh.onAfterRender).toBe(original);
  const fresh=new Preparation232(gate);fresh.prepare(stamp(),true,()=>[{isReady:()=>true}]);expect(fresh.poll(stamp())).toBe(true);expect(fresh.bodyDraw(stamp())).toBe(true);
 });
 it('deadline/error retires without another queue or fabricated readiness',()=>{
  let clock=0;const gate=createGate232(),owner=new Preparation232(gate,()=>clock,20),queue=vi.fn(()=>[{isReady:()=>false}]);owner.prepare(stamp(),true,queue);clock=20;expect(()=>owner.poll(stamp())).toThrow('expired');expect(owner.phase).toBe('error');expect(gate.draw).toBeNull();expect(queue).toHaveBeenCalledTimes(1);
  const failed=new Preparation232(createGate232());expect(()=>failed.prepare(stamp(),true,()=>{throw Error('shader compile failure');})).toThrow('shader compile failure');expect(failed.phase).toBe('error');
  const shape=new Preparation232(createGate232());expect(()=>shape.prepare(stamp(),true,()=>[{} as any])).toThrow('API unavailable');
 });
 it('signature preserves moving poses/streamed weather while invalidating material variants and attribute identity',()=>{
  const scene=new Scene(),camera=new PerspectiveCamera(),material=new MeshStandardMaterial(),mesh=new Mesh(new BoxGeometry(),material);scene.add(mesh);
  const gl:any={shadowMap:{enabled:false,type:1},toneMapping:1,outputColorSpace:'srgb',localClippingEnabled:false};const initial=signature232(scene,camera,gl);
  mesh.position.x=5;mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.setDrawRange(0,3);material.opacity=.3;expect(signature232(scene,camera,gl)).toBe(initial);
  (material as any).defines={TEST_VARIANT:1};expect(signature232(scene,camera,gl)).not.toBe(initial);delete (material as any).defines;
  const attr=mesh.geometry.attributes.position;mesh.geometry.setAttribute('position',new BufferAttribute(new Float32Array(attr.array),3));expect(signature232(scene,camera,gl)).not.toBe(initial);
 });
 it('expected standard-to-native mount handoff discards old programs, shares deadline and finite queue count',()=>{
  let clock=0;const gate=createGate232(),session=new StartupLifetime232(gate,()=>clock,4,20),oldPoll=vi.fn(()=>false);
  session.queue(stamp(),true,()=>[{isReady:oldPoll}]);session.owner.poll(stamp());clock=8;
  const next={...stamp(),winner:'native-body',signature:'fresh-mounted-native'};
  expect(session.owner.poll(next)).toBe(false);expect(session.owner.phase).toBe('cancelled');session.fresh('actual mounted handoff');
  session.queue(next,true,()=>[{isReady:()=>true}]);expect(session.owner.poll(next)).toBe(true);expect(session.owner.bodyDraw(next)).toBe(true);expect(gate.draw?.winner).toBe('native-body');expect(oldPoll).toHaveBeenCalledTimes(1);expect(session.deadline).toBe(20);
  clock=20;expect(()=>session.check()).toThrow('lifetime expired');expect(gate.draw).toBeNull();
  const bounded=new StartupLifetime232(createGate232(),()=>0,4,20);for(let i=0;i<4;i++){bounded.queue({...stamp(),signature:String(i)},true,()=>[{isReady:()=>false}]);bounded.fresh('new mounted snapshot');}expect(()=>bounded.queue(stamp(),true,()=>[{isReady:()=>true}])).toThrow('queue count exhausted');
 });
 it('post-admission peer/world changes preserve local draw, but same-context restoration epoch cannot use cached ready',()=>{
  const gate=createGate232(),scene=new Scene(),camera=new PerspectiveCamera(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());scene.add(mesh);
  const ctx={isContextLost:()=>false},gl:any={getContext:()=>ctx,shadowMap:{enabled:false,type:1},toneMapping:1,outputColorSpace:'srgb',localClippingEnabled:false};
  provider.winner={uuid:mesh.uuid,generation:1,frameClock:3,effectiveVisible:true};gate.epoch=1;gate.draw={...stamp(),context:ctx,winner:mesh.uuid,signature:signature232(scene,camera,gl)};gate.admitted=true;
  scene.add(new Mesh(new BoxGeometry(),new MeshStandardMaterial()));expect(signature232(scene,camera,gl)).not.toBe(gate.draw.signature);expect(bodyReady232(gate,scene,camera,gl)).toBe(true);expect(retainedAdmission232(gate,1)).toBe(true);
  gate.epoch++;gate.draw=null;gate.admitted=false;expect(retainedAdmission232(gate,1)).toBe(false);expect(bodyReady232(gate,scene,camera,gl)).toBe(false);
  provider.winner=null;
 });
});
