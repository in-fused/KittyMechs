import {Camera,Object3D,SkinnedMesh,Vector3,type WebGLRenderer} from 'three';
import type {GroundSupport067} from '../../src/game/entities/groundSupport067';
import type {SkinSole164} from '../../src/game/entities/sourceCoordination164';

type Frame246={camera:Camera;root:Object3D;providerOwned:()=>boolean;clock:number;time:number;generation:number;life:number;reset:boolean;visible:boolean;diagnostic:any};
const limbs=['FL','FR','HL','HR'] as const;
/** Observation only. Current argmin is a normal-clearance witness, never a
 * retained material point, planted anchor, tangential-slip or force proof. */
export function observeContact246(model:Object3D,soles:SkinSole164,support:GroundSupport067,diagnostic:any){
 const meshes:SkinnedMesh[]=[];model.traverse(o=>{if(o instanceof SkinnedMesh)meshes.push(o);});
 let frame:Frame246|null=null,last=-Infinity,identity='',disposed=false;
 const drawn=new Set<SkinnedMesh>(),previous=new Map<string,{time:number;point:Vector3;lease:string}>();
 const old=meshes.map(mesh=>({mesh,callback:mesh.onAfterRender}));
 const clear=(reason:string)=>{previous.clear();diagnostic.grounded246={status:'INACTIVE',reason,contactQualified:false};};
 const sample=()=>{
  const f=frame!;last=f.clock;const start=performance.now();
  const observation:any={status:'OBSERVED_CURRENT_MAIN_RENDER',frameClock:f.clock,presentationTime:f.time,generation:f.generation,life:f.life,mainCameraUUID:f.camera.uuid,providerOwned:true,drawnSkinMeshes:drawn.size,root:{uuid:f.root.uuid,position:f.root.position.toArray(),quaternion:f.root.quaternion.toArray(),worldMatrix:f.root.matrixWorld.toArray()},modelWorldMatrix:model.matrixWorld.toArray(),sourceBodyWorldMatrix:model.parent?.matrixWorld.toArray()??null,phase:f.diagnostic.phase,stance:f.diagnostic.stance,visualYaw:f.diagnostic.visualYaw,activeClips:f.diagnostic.activeClips,placement:f.diagnostic.placement,contactQualified:false,policy:'PASSIVE_FULL_PAD_NORMAL_AND_CURRENT_FIXED_SCENE_SUPPORT',tangentialMaterialWitness:false,feet:[]};
  diagnostic.grounded246=observation;
  try{
   // Draw has already updated the attached mesh inverse and bone worlds.
   // This refreshes cached affine maps only; it never evaluates or poses bones.
   soles.beginPose(false);support.begin(f.clock,f.time,f.life);
   const shape=f.diagnostic.placement?.nativeShape,half=shape?.halfHeight,border=shape?.borderRadius;
   observation.probeBasis={halfHeight:half,borderRadius:border,meaning:'native dimensions bound read-only search; no floor authorization'};
   if(!Number.isFinite(half)||half<=0||!Number.isFinite(border)||border<=0){observation.status='UNKNOWN';observation.reason='NO_VALID_NATIVE_SEARCH_DIMENSIONS';previous.clear();return;}
   for(const limb of limbs){
    const semantic=f.diagnostic.sourceTasks?.feet?.find((v:any)=>v.limb===limb),pivot=model.getObjectByName(limb+'_paw')?.getWorldPosition(new Vector3());
    const low=soles.minimum(limb,new Vector3(),new Vector3(0,1,0));
    const hit=support.probe(low.world,half+border,2*(half+border));
    const foot:any={limb,sourceRoles:semantic?.roles??null,sourceLoaded:semantic?.sourceLoaded??null,finalRole:semantic?.role??null,desiredSourceLift:semantic?.desiredHeight??null,sourcePlaneGap:semantic?.finalPadGap??null,wholePadVertices:low.vertices,lowestWorld:low.world.toArray(),fkPawWorld:pivot?.toArray()??null,supportStatus:'UNKNOWN',normalGap:null,fkPawVelocityProxy:null,velocityIsMaterialSlip:false};observation.feet.push(foot);
    if(!hit||!support.validate(hit.lease)){foot.reason=support.diagnostic.lastReason;previous.delete(limb);continue;}
    const minimum=soles.minimum(limb,hit.point,hit.normal),lease=JSON.stringify(hit.lease);
    Object.assign(foot,{supportStatus:'CURRENT_FIXED_CLIENT_SCENE',surfacePoint:hit.point.toArray(),surfaceNormal:hit.normal.toArray(),lease:{...hit.lease},normalGap:minimum.gap,normalArgminWorld:minimum.world.toArray()});
    const prior=previous.get(limb),elapsed=prior?f.time-prior.time:0;
    if(pivot&&prior&&prior.lease===lease&&elapsed>0)foot.fkPawVelocityProxy=pivot.clone().sub(prior.point).divideScalar(elapsed).toArray();
    if(pivot)previous.set(limb,{time:f.time,point:pivot.clone(),lease});
   }
   observation.supportFrame={...support.diagnostic};
  }catch(error){observation.status='UNKNOWN';observation.reason=String(error);previous.clear();}
  finally{observation.costMs=performance.now()-start;}
 };
 for(const {mesh,callback} of old)mesh.onAfterRender=function(renderer:WebGLRenderer,scene,camera,geometry,material,group){
  callback.call(this,renderer,scene,camera,geometry,material,group);
  if(disposed||!frame||!frame.visible||!frame.root.visible||!frame.providerOwned()||camera!==frame.camera||renderer.getRenderTarget()!==null)return;
  drawn.add(mesh);if(drawn.size===meshes.length&&frame.clock-last>=.1)sample();
 };
 return {
  inactive(reason:string){frame=null;drawn.clear();clear(reason);},
  frame(next:Frame246){
   frame=next;drawn.clear();const key=next.generation+':'+next.life;
   if(key!==identity||next.reset){identity=key;previous.clear();last=-Infinity;}
   if(!next.visible||next.diagnostic.mode!=='ordinary'||next.diagnostic.status!=='source'||!next.diagnostic.sourceTasks){frame=null;clear('NO_VISIBLE_ORDINARY_SOURCE_POSE');}
  },
  dispose(){disposed=true;frame=null;for(const {mesh,callback} of old)mesh.onAfterRender=callback;clear('DISPOSED');}
 };
}
