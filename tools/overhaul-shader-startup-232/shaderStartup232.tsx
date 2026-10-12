import {useLayoutEffect,useRef} from 'react';
import {useFrame,useThree,useStore,type RenderCallback} from '@react-three/fiber';
import type {Camera,Material,Mesh,Object3D,Scene,WebGLRenderer} from 'three';
import {runtime} from '../../src/game/runtime';
import {hasCompletedCameraVisual044,inspectCameraVisual222} from '../../src/game/camera/visualRegistry';

export type Stamp232={localId:string;generation:number;context:object;quality:string;signature:string;winner:string};
export type Event232={at:number;kind:string;detail?:unknown};
export type Program232={isReady:()=>boolean};
export interface Gate232 {epoch:number;mounted:boolean;admitted:boolean;draw:Stamp232|null;events:Event232[];fatal:string|null}
export const createGate232=():Gate232=>({epoch:0,mounted:false,admitted:false,draw:null,events:[],fatal:null});
export const retainedAdmission232=(gate:Gate232,epoch:number|null)=>gate.admitted&&gate.epoch===epoch;
const now=()=>performance.now();
const label=(signature:string)=>{let hash=2166136261;for(let i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619);return {chars:signature.length,hash:(hash>>>0).toString(16),scope:'DIAGNOSTIC_ONLY_FULL_STRING_EQUALITY_IS_GUARD'};};
const receipt=(stamp:Stamp232)=>({...stamp,context:undefined,signature:label(stamp.signature)});
function record(gate:Gate232,kind:string,detail?:unknown){gate.events.push({at:now(),kind,detail});if(gate.events.length>240)gate.events.shift();}
const equal=(a:Stamp232,b:Stamp232)=>a.context===b.context&&a.localId===b.localId&&a.generation===b.generation&&a.quality===b.quality&&a.signature===b.signature&&a.winner===b.winner;
// Process-local object identity; not a geometry/pose surrogate or public handle.
const identities=new WeakMap<object,number>();let nextIdentity=1;
const identity=(v:object)=>{let n=identities.get(v);if(!n){n=nextIdentity++;identities.set(v,n);}return n;};

/** Frame-driven controller: no internal timer, uniforms/attributes or draw.
 * Cancellation retires this instance; a new deployment owns a new instance. */
export class Preparation232 {
 phase:'waiting'|'polling'|'prepared'|'drawn'|'cancelled'|'error'='waiting';
 stamp:Stamp232|null=null;private programs:Program232[]=[];private started=0;
 constructor(private gate:Gate232,private clock=now,private limitMs=20_000){}
 private emit(kind:string,detail?:unknown){this.gate.events.push({at:this.clock(),kind,detail});if(this.gate.events.length>240)this.gate.events.shift();}
 prepare(stamp:Stamp232,khr:boolean,queue:()=>Program232[]){
  if(this.phase!=='waiting')throw new Error('232 preparation already owned');
  this.started=this.clock();this.stamp=stamp;this.emit('warmup-start',receipt(stamp));
  this.emit('KHR-availability',{available:khr,scope:khr?'COMPLETION_STATUS_KHR_POLL':'COMPATIBLE_SYNC_FIRST_USE_RISK_NO_ASYNC_GAIN'});
  this.emit('prepare-start');
  try {this.programs=queue();if(!this.programs.length||this.programs.some(p=>typeof p?.isReady!=='function'))throw new Error('232 current program API unavailable');this.phase='polling';this.emit('prepare-end',{programs:this.programs.length});}
  catch(error){this.fail(error);throw error;}
 }
 poll(current:Stamp232){
  if(this.phase==='cancelled'||this.phase==='error'||this.phase==='waiting')return false;
  if(!this.stamp||!equal(this.stamp,current)){this.emit('stale-signature',{previous:this.stamp&&receipt(this.stamp),current:receipt(current)});this.cancel('current identity/signature changed');return false;}
  if(this.clock()-this.started>=this.limitMs){const error=new Error('232 bounded shader preparation expired');this.fail(error);throw error;}
  if(this.phase==='prepared'||this.phase==='drawn')return true;
  try{if(!this.programs.every(p=>p.isReady()))return false;this.phase='prepared';this.emit('poll-complete');return true;}catch(error){this.fail(error);throw error;}
 }
 bodyDraw(current:Stamp232){if(this.phase!=='prepared'||!this.stamp||!equal(this.stamp,current))return false;this.gate.draw={...current};this.phase='drawn';this.emit('first-body-draw',{...receipt(current),scope:'CURRENT_BODY_DRAW_SUBMISSION_NOT_GPU_OR_PIXELS'});return true;}
 cancel(reason:string){if(this.phase==='cancelled'||this.phase==='error')return;this.phase='cancelled';this.gate.draw=null;this.emit('cancel',{reason});}
 fail(error:unknown){this.phase='error';this.gate.draw=null;this.gate.fatal=error instanceof Error?error.message:String(error);this.emit('error',this.gate.fatal);}
}

/** Preserve the owner's exact existing callback and calling convention. */
export function witness232(mesh:Mesh,current:(args:Parameters<Mesh['onAfterRender']>)=>Stamp232|null,prepared:Preparation232){
 const original=mesh.onAfterRender;
 const wrapped:Mesh['onAfterRender']=function(this:Mesh,...args){original.apply(this,args);if(prepared.phase==='prepared'){const stamp=current(args);if(stamp)prepared.bodyDraw(stamp);}};
 mesh.onAfterRender=wrapped;
 return ()=>{if(mesh.onAfterRender===wrapped)mesh.onAfterRender=original;};
}

/** Program variants and attached object identities, never poses/uniform values.
 * Full tree is read once per startup visual callback, only while draw is owned. */
export function signature232(scene:Scene,camera:Camera,gl:WebGLRenderer){
 const rows:unknown[]=[];
 const texture=(v:any)=>v?.isTexture?[v.uuid,v.mapping,v.colorSpace,v.channel]:null;
 scene.traverse(o=>{
  const row:any={id:o.uuid,parent:o.parent?.uuid,type:o.type,visible:o.visible,layers:o.layers.mask,castShadow:o.castShadow,receiveShadow:o.receiveShadow};
  const m=o as Mesh;
  if(m.isMesh||(o as any).isPoints||(o as any).isLine||(o as any).isSprite){
   // Streaming weather/pose data and draw ranges are not program variants.
   // Identity/layout changes remain fenced; no vertex values are rewritten.
   const g=m.geometry;row.geometry=g&&[g.uuid,g.index&&[identity(g.index),g.index.count],g.groups,Object.entries(g.attributes).map(([k,a])=>[k,identity(a),a.itemSize,a.count,a.normalized,a.array.constructor.name]),Object.entries(g.morphAttributes).map(([k,attributes])=>[k,attributes.map(a=>[identity(a),a.count])])];
   row.skin=(m as any).skeleton?.uuid;row.instanced=(m as any).isInstancedMesh;
   row.materials=(Array.isArray(m.material)?m.material:[m.material]).map((material:Material)=>{
    const v=material as any,out:any={id:v.uuid,type:v.type,version:v.version,defines:v.defines,key:v.customProgramCacheKey()};
    for(const key of ['side','transparent','alphaTest','alphaHash','vertexColors','flatShading','fog','wireframe','toneMapped','premultipliedAlpha','dithering','precision','depthPacking','clipping','clipIntersection','clipShadows','sizeAttenuation','sheen','clearcoat','transmission','anisotropy','dispersion'])out[key]=v[key];
    out.clippingPlanes=v.clippingPlanes?.length??0;
    for(const key of Object.keys(v).sort())if(v[key]?.isTexture)out[key]=texture(v[key]);
    return out;
   });
  }
  if((o as any).isLight)row.light=[(o as any).isLight,o.type,(o as any).castShadow,(o as any).shadow?.mapSize?.x,(o as any).shadow?.mapSize?.y];
  rows.push(row);
 });
 return JSON.stringify({objects:rows,environment:texture(scene.environment),background:texture(scene.background),fog:scene.fog?.constructor.name,override:scene.overrideMaterial?.uuid,camera:[camera.uuid,camera.type,camera.layers.mask],renderer:[gl.shadowMap.enabled,gl.shadowMap.type,gl.toneMapping,gl.outputColorSpace,gl.localClippingEnabled]});
}

export function MountedScene232({gate}:{gate:Gate232}){useLayoutEffect(()=>{gate.mounted=true;record(gate,'scene-mounted');return()=>{gate.mounted=false;gate.draw=null;record(gate,'scene-unmounted');};},[gate]);return null;}
export function bodyReady232(gate:Gate232,scene:Scene,camera:Camera,gl:WebGLRenderer){
 const draw=gate.draw,winner=inspectCameraVisual222(runtime.localId,scene).winningProvider;
 return !!draw&&draw.context===gl.getContext()&&!gl.getContext().isContextLost()&&draw.localId===runtime.localId&&draw.generation===runtime.generation&&!!winner&&winner.uuid===draw.winner&&winner.generation===runtime.generation&&winner.effectiveVisible&&winner.frameClock>=0;
}

/** One bounded startup lifetime. A stale queue never donates readiness to its
 * replacement; count/deadline are shared across expected mount handoffs. */
export class StartupLifetime232 {
 owner:Preparation232;queues=0;readonly deadline:number;
 constructor(private gate:Gate232,private clock=now,readonly maxQueues=4,limitMs=20_000){this.deadline=clock()+limitMs;this.owner=new Preparation232(gate,clock,limitMs);}
 check(){if(this.clock()>=this.deadline){const error=new Error('232 startup lifetime expired');this.owner.fail(error);throw error;}}
 fresh(reason:string){this.owner.cancel(reason);this.check();this.owner=new Preparation232(this.gate,this.clock,this.deadline-this.clock());}
 queue(stamp:Stamp232,khr:boolean,programs:()=>Program232[]){this.check();if(this.queues>=this.maxQueues){const error=new Error('232 finite preparation queue count exhausted');this.owner.fail(error);throw error;}this.queues++;this.owner.prepare(stamp,khr,programs);}
 close(reason:string){this.owner.cancel(reason);}
}

/** The exact pinned R3F subscription used by useFrame provides a temporary
 * positive-priority lease. The lightweight negative-priority monitor can rearm
 * it synchronously before automatic rendering, without remounting physics. */
export function ShaderStartup232({gate,quality}:{gate:Gate232;quality:string}){
 const store=useStore(),{gl}=useThree(),lifetime=useRef<StartupLifetime232|null>(null),lease=useRef<(()=>void)|null>(null),restore=useRef<(()=>void)[]>([]),identityRef=useRef<unknown[]>([]),lost=useRef(false),contextEpoch=useRef(0);
 const callback=useRef<RenderCallback>(()=>{});
 const retiring=()=>{for(const undo of restore.current.splice(0))undo();};
 const release=()=>{lease.current?.();lease.current=null;};
 const arm=(identity:unknown[],reason:string)=>{
  lifetime.current?.close(reason);retiring();gate.epoch++;gate.draw=null;gate.admitted=false;gate.fatal=null;
  identityRef.current=identity;lifetime.current=new StartupLifetime232(gate);record(gate,'deployment-armed',{localId:runtime.localId,generation:runtime.generation,quality,reason});
  if(!lease.current){const internal=store.getState().internal;if(internal.priority!==0)throw new Error('232 competing LOW render owner');lease.current=internal.subscribe(callback,1,store);}
 };
 const deployment=()=>[runtime.localId,runtime.generation,store.getState().gl,store.getState().gl.getContext(),quality,contextEpoch.current];
 callback.current=({gl,scene,camera})=>{
  const session=lifetime.current;if(!session)return;
  if(store.getState().internal.priority!==1)throw new Error('232 competing active LOW render owner');
  if(gate.fatal)throw new Error(gate.fatal);
  if(gate.admitted){retiring();release();record(gate,'render-owner-released');return;}
  session.check();
  if(lost.current||gl.getContext().isContextLost())return;
  const provider=inspectCameraVisual222(runtime.localId,scene).winningProvider;
  const root=provider&&scene.getObjectByProperty('uuid',provider.uuid);
  if(!gate.mounted||!hasCompletedCameraVisual044(runtime.localId,runtime.generation)||!provider||provider.generation!==runtime.generation||!provider.effectiveVisible||provider.frameClock<0||!root){
   if(session.owner.phase!=='waiting'){retiring();session.fresh('mounted current owner unavailable');}return;
  }
  const current:Stamp232={localId:runtime.localId,generation:runtime.generation,context:gl.getContext(),quality,signature:signature232(scene,camera,gl),winner:root.uuid};
  if(session.owner.phase==='waiting'){
   session.queue(current,!!gl.extensions.get('KHR_parallel_shader_compile'),()=>{
    const materials=gl.compile(scene,camera),programs=new Set<Program232>();
    for(const material of materials){const data=gl.properties.get(material) as any;if(!(data.programs instanceof Map))throw new Error('232 pinned material program map absent');for(const program of data.programs.values())programs.add(program);}
    return [...programs];
   });
   const prepared=session.owner;
   root.traverse(o=>{const mesh=o as Mesh;if(mesh.isMesh&&mesh.geometry?.attributes.position)restore.current.push(witness232(mesh,args=>{
    const active=inspectCameraVisual222(runtime.localId,scene).winningProvider;
    let attached=false;for(let p:Object3D|null=mesh;p;p=p.parent){if(!p.visible)return null;if(p===root)attached=true;}
    return args[0]===gl&&args[1]===scene&&args[2]===camera&&attached&&!lost.current&&gl.getContext()===current.context&&runtime.localId===current.localId&&runtime.generation===current.generation&&active?.uuid===current.winner&&active.generation===current.generation&&active.effectiveVisible&&signature232(scene,camera,gl)===current.signature?current:null;
   },prepared));});
   if(!restore.current.length){const error=new Error('232 winning body has no drawable meshes');prepared.fail(error);throw error;}
  }
  if(!session.owner.poll(current)){if(session.owner.phase==='cancelled'){retiring();session.fresh('fresh mounted signature required');}return;}
  if(session.owner.phase==='drawn')return; // SceneReady admits before this lease retires.
  const started=now();record(gate,'full-draw-start');
  try{gl.render(scene,camera);record(gate,'full-draw-end',{durationMs:now()-started});}catch(error){session.owner.fail(error);retiring();throw error;}
 };
 useLayoutEffect(()=>{
  lost.current=false;arm(deployment(),'mounted/StrictMode new owner');
  const onLost=()=>{lost.current=true;contextEpoch.current++;arm(deployment(),'context lost: obsolete preparation cancelled');record(gate,'context-lost');};
  const onRestored=()=>{lost.current=false;contextEpoch.current++;arm(deployment(),'actual context restored');record(gate,'context-restored');};
  gl.domElement.addEventListener('webglcontextlost',onLost);gl.domElement.addEventListener('webglcontextrestored',onRestored);
  if(typeof window!=='undefined')window.__shaderStartup232={scope:'PRIVATE_LOW_NO_POST_PROGRAM_PREPARATION_DRAW_SUBMISSION_ONLY',read:()=>({epoch:gate.epoch,mounted:gate.mounted,admitted:gate.admitted,fatal:gate.fatal,queues:lifetime.current?.queues,draw:gate.draw&&receipt(gate.draw),events:gate.events.map(e=>({...e}))})};
  return()=>{lifetime.current?.close('layout owner unmounted/StrictMode cleanup');lifetime.current=null;retiring();release();gl.domElement.removeEventListener('webglcontextlost',onLost);gl.domElement.removeEventListener('webglcontextrestored',onRestored);};
 },[gl,gate,quality,store]);
 useFrame(()=>{const current=deployment();if(current.length!==identityRef.current.length||current.some((v,i)=>v!==identityRef.current[i]))arm(current,'actual deployment identity changed');},-99);
 return null;
}
export function admitBody232(gate:Gate232,scene:Scene,camera:Camera,gl:WebGLRenderer){if(!bodyReady232(gate,scene,camera,gl))return false;if(!gate.admitted){gate.admitted=true;record(gate,'211-local-visual-admitted',{localId:runtime.localId,generation:runtime.generation});}return true;}
declare global {interface Window {__shaderStartup232?:{scope:string;read:()=>unknown}}}
