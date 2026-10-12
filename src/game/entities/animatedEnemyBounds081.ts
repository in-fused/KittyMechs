import {Frustum,Matrix4,SkinnedMesh,Sphere,Vector3,type Camera,type Object3D} from 'three';
import {prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007,type WeightedVisualEnvelope007} from '../camera/weightedVisualEnvelope007';
import type {VisualEnvelopeSample} from '../camera/visualEnvelope';

const diagnostics=new Map<string,AnimatedEnemyBounds081>();
export function registerEnemyBounds081(id:string,owner:AnimatedEnemyBounds081){diagnostics.set(id,owner);return()=>{if(diagnostics.get(id)===owner)diagnostics.delete(id);};}
/** Read-only plain snapshots. No vertex scans or native/world references. */
export function readEnemyBounds081(){return [...diagnostics].map(([actor,owner])=>({actor,...owner.read(),worldMin:[...owner.diagnostic.worldMin],worldMax:[...owner.diagnostic.worldMax]}));}
if(typeof window!=='undefined')Object.assign(window,{kittyEnemyBounds078:{read:readEnemyBounds081,audit:(actor:string,frameClock:number)=>diagnostics.get(actor)?.audit(frameClock)??{status:'OWNER_UNAVAILABLE'}}});

/** Geometry preparation visits ALL vertices/weights once. Each completed pose
 * costs bone-influence box corners, not vertices. Only exact normalized finite
 * nonnegative source weights are admitted here; every failure stays uncullable.
 * This helper never changes actor transforms, actions, geometry or retained skin binds.
 * It refreshes attached inverse caches through the standard renderer lifecycle. */
export class AnimatedEnemyBounds081 {
 readonly diagnostic={enabled:false,reason:null as string|null,firstFailure:null as string|null,frameClock:-1,frames:0,meshCount:0,vertexCount:0,boneCount:0,weightProof:'NOT_ADMITTED' as 'NOT_ADMITTED'|'ALL_VERTICES_EXACT_NONNEGATIVE_NORMALIZED',worldMin:[0,0,0],worldMax:[0,0,0],preparationMs:null as number|null,costSamples:0,sampledMs:0,maxSampleMs:0,lastSampleMs:0,perFrameVertexScans:0};
 private meshes:{mesh:SkinnedMesh;sphere:Sphere;previous:SkinnedMesh['boundingSphere']}[]=[];
 private envelope:WeightedVisualEnvelope007|null=null;
 private sample:VisualEnvelopeSample|null=null;
 private inverse=new Matrix4();private local=new Vector3();private center=new Vector3();
 private camera:Camera|null=null;private frustum=new Frustum();private projection=new Matrix4();
 constructor(private model:Object3D,private measure=false){
  const start=measure?performance.now():0;
  try{
   // Refresh ancestors first, then dispatch descendant updateMatrixWorld
   // overrides. Attached skins must refresh their world-inverse cache too.
   model.updateWorldMatrix(true,false);
   model.updateMatrixWorld(true);
   model.traverse(node=>{if(node instanceof SkinnedMesh){node.frustumCulled=false;this.meshes.push({mesh:node,sphere:new Sphere(),previous:node.boundingSphere});}});
   if(!this.meshes.length)throw Error('NO_ENEMY_SKINS');
   const envelope=prepareWeightedVisualEnvelope007(model);
   if(envelope.weightSumRanges.length!==this.meshes.length||envelope.weightSumRanges.some(r=>r.min!==1||r.max!==1))throw Error('SOURCE_WEIGHTS_NOT_EXACT_NORMALIZED');
   this.envelope=envelope;this.sample=createWeightedVisualEnvelopeSample007(envelope);
   Object.assign(this.diagnostic,{enabled:true,meshCount:this.meshes.length,vertexCount:envelope.vertexCount,boneCount:envelope.boneCount,weightProof:'ALL_VERTICES_EXACT_NONNEGATIVE_NORMALIZED'});
  }catch(error){this.failOpen(error);}
  if(measure)this.diagnostic.preparationMs=performance.now()-start;
 }
 private failOpen(error:unknown){
  const reason=String(error);this.diagnostic.enabled=false;this.diagnostic.reason=reason;this.diagnostic.firstFailure??=reason;
  for(const row of this.meshes){row.mesh.frustumCulled=false;row.mesh.boundingSphere=row.previous;}
  this.envelope=null;this.sample=null;
 }
 /** Call AFTER final mixer, IK, carrier and head/tail writes, before rendering.
  * Independent renderer camera passes use the resulting mesh-owned spheres. */
 update(frameClock:number,camera?:Camera){
  if(camera)this.camera=camera;
  if(frameClock===this.diagnostic.frameClock)return;
  this.diagnostic.frameClock=frameClock;this.diagnostic.frames++;
  if(!this.envelope||!this.sample)return;
  const timed=this.measure&&this.diagnostic.frames%16===0,start=timed?performance.now():0;
  try{
   // The renderer dispatches updateMatrixWorld; inherited updateWorldMatrix
   // alone bypasses SkinnedMesh attached-inverse cache maintenance.
   this.model.updateWorldMatrix(true,false);
   this.model.updateMatrixWorld(true);
   sampleWeightedVisualEnvelope007(this.envelope,this.sample);
   const bounds=this.sample.bounds;if(bounds.isEmpty())throw Error('EMPTY_COMPLETED_POSE_BOUND');
   bounds.getCenter(this.center);const worldRadius=bounds.min.distanceTo(bounds.max)/2;
   for(const row of this.meshes){
    this.inverse.copy(row.mesh.matrixWorld).invert();row.sphere.center.copy(this.center).applyMatrix4(this.inverse);let radius=0;
    for(const corner of this.sample.corners){this.local.copy(corner).applyMatrix4(this.inverse);radius=Math.max(radius,this.local.distanceTo(row.sphere.center));}
    const scale=row.mesh.matrixWorld.getMaxScaleOnAxis();
    // Three transforms spheres using max column scale, which can underbound
    // shear. Retain local-corner containment AND an explicitly sufficient
    // renderer world radius, independent of mesh affine scale/shear.
    row.sphere.radius=Math.max(radius,worldRadius/scale)+(1+radius+worldRadius/scale)*32*Number.EPSILON;
    if(!Number.isFinite(row.sphere.radius)||scale<=0||!Number.isFinite(row.sphere.center.x+row.sphere.center.y+row.sphere.center.z))throw Error('INVALID_LOCAL_POSE_SPHERE');
   }
   // Publish only after every skin passes. A partial bound never culls a model.
   for(const row of this.meshes){row.mesh.boundingSphere=row.sphere;row.mesh.frustumCulled=true;}
   this.diagnostic.worldMin[0]=bounds.min.x;this.diagnostic.worldMin[1]=bounds.min.y;this.diagnostic.worldMin[2]=bounds.min.z;
   this.diagnostic.worldMax[0]=bounds.max.x;this.diagnostic.worldMax[1]=bounds.max.y;this.diagnostic.worldMax[2]=bounds.max.z;
  }catch(error){this.failOpen(error);}
  if(timed){const ms=performance.now()-start;this.diagnostic.costSamples++;this.diagnostic.sampledMs+=ms;this.diagnostic.lastSampleMs=ms;this.diagnostic.maxSampleMs=Math.max(this.diagnostic.maxSampleMs,ms);}
 }
 read(){
  let visibleSkins=0,mainViewEligibleSkins=0;
  if(this.camera)this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse),this.camera.coordinateSystem,this.camera.reversedDepth);
  for(const row of this.meshes){let visible=true;for(let node:Object3D|null=row.mesh;node;node=node.parent)if(!node.visible){visible=false;break;}if(!visible)continue;visibleSkins++;
   // Never ask intersectsObject to manufacture a vertex-walk bound on failure.
   if(!row.mesh.frustumCulled||!this.camera||!row.mesh.boundingSphere||this.frustum.intersectsObject(row.mesh))mainViewEligibleSkins++;
  }
  return{...this.diagnostic,visibleSkins,mainViewEligibleSkins,mainViewSkippedSkins:visibleSkins-mainViewEligibleSkins,scope:'Main camera eligibility from completed bound/flags; not GPU submission or occlusion visibility'};
 }
 /** Debug observation only: one bounded ALL-vertex read of the requested
  * completed frame. No matrix/pose/skeleton updates or bound writes. */
 audit(frameClock:number){
  const start=performance.now();if(!this.diagnostic.enabled||frameClock!==this.diagnostic.frameClock)return{status:'FRAME_OR_BOUND_UNAVAILABLE',frameClock:this.diagnostic.frameClock,reason:this.diagnostic.reason};
  if(this.diagnostic.vertexCount>100000)return{status:'VERTEX_WORK_BOUND',vertices:this.diagnostic.vertexCount};
  const point=new Vector3(),worldPoint=new Vector3(),sphere=new Sphere();let checked=0;
  for(const row of this.meshes){if(!row.mesh.boundingSphere)return{status:'BOUND_UNAVAILABLE'};sphere.copy(row.mesh.boundingSphere).applyMatrix4(row.mesh.matrixWorld);const count=row.mesh.geometry.getAttribute('position').count;
   for(let i=0;i<count;i++){if(i%256===0&&performance.now()-start>12)return{status:'TIME_WORK_BOUND',checked,frameClock};row.mesh.getVertexPosition(i,point);worldPoint.copy(point).applyMatrix4(row.mesh.matrixWorld);if(!row.mesh.boundingSphere.containsPoint(point)||!sphere.containsPoint(worldPoint))return{status:'CONTAINMENT_FAILURE',mesh:row.mesh.name,vertex:i,checked,frameClock};checked++;}
  }
  return{status:'ALL_VERTICES_CONTAINED',checked,frameClock,elapsedMs:performance.now()-start,scope:'Current loaded Three double-precision vertices; separate CPU fixture checks Float32 palette arithmetic. No skin-pixel/contact claim'};
 }
}
