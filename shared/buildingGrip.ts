import {AnimationClip,AnimationMixer,Bone,Group,Quaternion,QuaternionKeyframeTrack,Vector3,VectorKeyframeTrack,type InterpolationModes} from 'three';
import profiles from './building-grip-profiles.json' with {type:'json'};
import {ACTOR_HEIGHT,MECHS,actorHullRadius} from './config';
import {clamp} from './math';
import {poweredVaultPose,type PoweredVaultState,type MantleBridgePlant,type MantleBridgeTorso} from './buildingVault';
import type {ActorState,Chassis,ClimbState,EnemyRole,Vec3} from './types';
import {solveKnee,traversalClip,wallContact,wallCycle,wallPoseGap,WALL_CLING_PHASE,WALL_GAITS} from '../src/game/entities/felineMotion';
import type {BuildingFace} from './buildingSurfaces';
import {overhaulCornerPawRequests,overhaulCornerHoldBlend,type OverhaulCornerChoices} from './overhaulCornerClimb';

export const GRIP_PAW_NAMES=['FL','FR','HL','HR'] as const;
export interface GripPatch {eligible:boolean;authored:boolean;reach:number;targetReach:number;points:Vec3[];queryPoints:Vec3[];queryCorners:Vec3[];corners:Vec3[];faceId?:string;cornerIndex?:0|1;queryPivot?:Vec3;}
export interface CornerGripContext {faces:readonly [BuildingFace,BuildingFace];choices?:OverhaulCornerChoices;}
/** World-space decoded cap metadata; finite geometry never certifies contact. */
export interface ClawCap {
  finiteFace:boolean; vertexCount:number; triangleCount:number; boundaryCount:number;
  vertexIndices:number[]; triangleIndices:number[]; boundaryEdges:number[];
  centroid:Vec3; normal:Vec3; planeSpread:number; directionDot:number; area:number;
}
export interface ClawPose {
  id:string; queryVertices:Vec3[]; vertices:Vec3[]; triangles:readonly (readonly number[])[];
  queryCap:ClawCap; cap:ClawCap; contactAdmitted:false;
}
export interface GripPose {wall:GripPatch[];roof:GripPatch[];claws:ClawPose[][];clawsSampled:boolean;}
/** Decoded nearest-face classification only, never a ray/support tolerance. */
export const CLAW_FACE_QUANTUM=1e-5;
export function createClawCap(vertexCapacity:number,triangleCapacity:number):ClawCap{return{finiteFace:false,vertexCount:0,triangleCount:0,boundaryCount:0,vertexIndices:Array(vertexCapacity).fill(0),triangleIndices:Array(triangleCapacity).fill(0),boundaryEdges:Array(triangleCapacity*6).fill(0),centroid:{x:0,y:0,z:0},normal:{x:0,y:0,z:0},planeSpread:0,directionDot:0,area:0};}
/** Select actual triangles on the nearest supporting face. Edge/vertex-only
 * sets stay invalid; components and inter-claw gaps are never filled. */
export function selectClawCap(vertices:readonly Vec3[],triangles:readonly (readonly number[])[],normal:Vec3,scale:number,out:ClawCap):ClawCap{
  out.finiteFace=false;out.vertexCount=out.triangleCount=out.boundaryCount=0;out.area=out.planeSpread=out.directionDot=0;
  out.centroid.x=out.centroid.y=out.centroid.z=out.normal.x=out.normal.y=out.normal.z=0;
  if(!Number.isFinite(scale)||scale<=0||Math.abs(Math.hypot(normal.x,normal.y,normal.z)-1)>1e-6)return out;
  let nearest=Infinity;for(const v of vertices){const n=v.x*normal.x+v.y*normal.y+v.z*normal.z;if(!Number.isFinite(n))return out;nearest=Math.min(nearest,n);}
  let highest=nearest;const tolerance=CLAW_FACE_QUANTUM*scale;
  for(let i=0;i<vertices.length;i++){const v=vertices[i],n=v.x*normal.x+v.y*normal.y+v.z*normal.z;if(n-nearest<=tolerance){out.vertexIndices[out.vertexCount++]=i;out.centroid.x+=v.x;out.centroid.y+=v.y;out.centroid.z+=v.z;highest=Math.max(highest,n);}}
  out.planeSpread=highest-nearest;if(out.vertexCount<3)return out;
  out.centroid.x/=out.vertexCount;out.centroid.y/=out.vertexCount;out.centroid.z/=out.vertexCount;
  for(let i=0;i<triangles.length;i++){
    const t=triangles[i],a=vertices[t[0]],b=vertices[t[1]],c=vertices[t[2]];
    if(!a||!b||!c)return out;
    let outside=false;for(let k=0;k<3;k++){const v=vertices[t[k]];if(v.x*normal.x+v.y*normal.y+v.z*normal.z-nearest>tolerance)outside=true;}if(outside)continue;
    const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz);
    if(length<=1e-12||-(nx*normal.x+ny*normal.y+nz*normal.z)/length<.95)continue;
    out.triangleIndices[out.triangleCount++]=i;out.area+=length/2;out.normal.x+=nx;out.normal.y+=ny;out.normal.z+=nz;
  }
  if(!out.triangleCount||out.area<1e-10*scale*scale)return out;
  // Retain actual oriented cap perimeter, not a manufactured padded rectangle.
  for(let i=0;i<out.triangleCount;i++){const t=triangles[out.triangleIndices[i]];for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3];let interior=false;for(let j=0;j<out.triangleCount;j++){const u=triangles[out.triangleIndices[j]];for(let n=0;n<3;n++)if(u[n]===b&&u[(n+1)%3]===a)interior=true;}if(!interior){out.boundaryEdges[out.boundaryCount++]=a;out.boundaryEdges[out.boundaryCount++]=b;}}}
  const n=Math.hypot(out.normal.x,out.normal.y,out.normal.z);if(n<=0)return out;out.normal.x/=n;out.normal.y/=n;out.normal.z/=n;out.directionDot=-(out.normal.x*normal.x+out.normal.y*normal.y+out.normal.z*normal.z);
  // A finite cap must be one closed convex perimeter of its actual triangles.
  // Reject disconnected/concave/extra near-edge vertices rather than inventing
  // a convex filled patch that differs from the decoded face topology.
  if(out.boundaryCount!==out.vertexCount*2||out.boundaryCount<6)return out;
  for(let i=0;i<out.vertexCount;i++){const index=out.vertexIndices[i];let incoming=0,outgoing=0;for(let n=0;n<out.boundaryCount;n+=2){if(out.boundaryEdges[n]===index)outgoing++;if(out.boundaryEdges[n+1]===index)incoming++;}if(incoming!==1||outgoing!==1)return out;}
  for(let i=0;i<out.boundaryCount;i+=2){const a=vertices[out.boundaryEdges[i]],b=vertices[out.boundaryEdges[i+1]],ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z;for(let j=0;j<out.vertexCount;j++){const c=vertices[out.vertexIndices[j]],vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z,side=(uy*vz-uz*vy)*out.normal.x+(uz*vx-ux*vz)*out.normal.y+(ux*vy-uy*vx)*out.normal.z;if(side< -1e-10*scale*scale)return out;}}
  out.finiteFace=out.directionDot>=.95;return out;
}

const v=()=>new Vector3();
function floats(encoded:string):Float32Array {const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),out=new Float32Array(bytes.length/4);for(let i=0;i<out.length;i++)out[i]=view.getFloat32(i*4,true);return out;}
function patch():GripPatch{return{eligible:false,authored:false,reach:0,targetReach:0,queryPivot:{x:0,y:0,z:0},points:Array.from({length:5},()=>({x:0,y:0,z:0})),queryPoints:Array.from({length:5},()=>({x:0,y:0,z:0})),queryCorners:Array.from({length:8},()=>({x:0,y:0,z:0})),corners:Array.from({length:8},()=>({x:0,y:0,z:0}))};}
function rig(key:Chassis|EnemyRole){
  const data=profiles.rigs.find(r=>r.key===key)!;
  const root=new Group(),body=new Group(),model=new Group();root.add(body);body.add(model);body.scale.setScalar(data.scale);body.rotation.y=Math.PI;
  const bones=new Map(data.bones.map(b=>{const bone=new Bone();bone.name=b.name;bone.position.fromArray(b.position);bone.quaternion.fromArray(b.rotation);bone.scale.fromArray(b.scale);return[b.name,bone];}));
  for(const b of data.bones)(b.parent?bones.get(b.parent)!:model).add(bones.get(b.name)!);
  const clips=data.clips.map(c=>new AnimationClip(c.name,c.duration,c.tracks.map(t=>t.kind==='quaternion'?new QuaternionKeyframeTrack(t.name,floats(t.timesLE),floats(t.valuesLE),t.interpolation as InterpolationModes):new VectorKeyframeTrack(t.name,floats(t.timesLE),floats(t.valuesLE),t.interpolation as InterpolationModes))));
  const mixer=new AnimationMixer(model),actions=clips.map(c=>{const a=mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);return a;});
  const pose=data.bones.map(b=>({bone:bones.get(b.name)!,rotation:new Quaternion().fromArray(b.rotation)}));
  const limbs=data.paws.map(p=>({upper:bones.get(p.name+'_upper')!,lower:bones.get(p.name+'_lower')!,paw:bones.get(p.name+'_paw')!,corners:[] as Vector3[]}));
  for(let i=0;i<limbs.length;i++){const p=data.paws[i];for(const x of [p.min[0],p.max[0]])for(const y of [p.min[1],p.max[1]])for(const z of [p.min[2],p.max[2]])limbs[i].corners.push(new Vector3(x,y,z));}
  const claws=data.paws.map(p=>p.claws.map(claw=>({local:claw.vertices.map(vertex=>new Vector3().fromArray(vertex)),output:{id:claw.id,triangles:claw.triangles,queryVertices:claw.vertices.map(()=>({x:0,y:0,z:0})),vertices:claw.vertices.map(()=>({x:0,y:0,z:0})),queryCap:createClawCap(claw.vertices.length,claw.triangles.length),cap:createClawCap(claw.vertices.length,claw.triangles.length),contactAdmitted:false as const}})));
  return{root,body,model,mixer,actions,pose,limbs,claws,output:{wall:Array.from({length:4},patch),roof:Array.from({length:4},patch),claws:claws.map(p=>p.map(c=>c.output)),clawsSampled:false},c:{hip:v(),knee:v(),paw:v(),target:v(),joint:v(),axis:v(),pole:v(),from:v(),to:v(),cornerOffsets:Array.from({length:8},v),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()},clip:{index:10,phase:0,wall:0,roof:0},vault:{air:0,mantle:1,phase:0,wall:0,roof:0}};
}
// Four immutable-identity rigs; every evaluation overwrites pooled output.
// Callers must consume receipts before another evaluation, never retain them.
const rigs=new Map<Chassis|EnemyRole,ReturnType<typeof rig>>();
function writePatch(points:Vec3[],corners:readonly Vec3[],normal:Vec3,roof:boolean){
  let loT=Infinity,hiT=-Infinity,loY=Infinity,hiY=-Infinity,loX=Infinity,hiX=-Infinity,loZ=Infinity,hiZ=-Infinity,loN=Infinity;
  for(const c of corners){const t=c.x*-normal.z+c.z*normal.x;loT=Math.min(loT,t);hiT=Math.max(hiT,t);loY=Math.min(loY,c.y);hiY=Math.max(hiY,c.y);loX=Math.min(loX,c.x);hiX=Math.max(hiX,c.x);loZ=Math.min(loZ,c.z);hiZ=Math.max(hiZ,c.z);loN=Math.min(loN,c.x*normal.x+c.z*normal.z);}
  const center=points[0];center.x=(loX+hiX)/2;center.y=(loY+hiY)/2;center.z=(loZ+hiZ)/2;
  if(roof){center.y=loY;for(let i=0;i<4;i++){const q=points[i+1];q.x=i&1?hiX:loX;q.z=i&2?hiZ:loZ;q.y=loY;}}
  else{const delta=loN-center.x*normal.x-center.z*normal.z;center.x+=normal.x*delta;center.z+=normal.z*delta;for(let i=0;i<4;i++){const q=points[i+1],t=i&1?hiT:loT;q.x=normal.x*loN-normal.z*t;q.z=normal.z*loN+normal.x*t;q.y=i&2?hiY:loY;}}
}
/** Exact shipping clip channels, current carrier and fixed-length IK. No skin
 * allocation, GLTF loading or terrain fallback during authority ticks. */
export function buildingGripPose(actor:Pick<ActorState,'chassis'|'position'|'bot'|'role'>,state:ClimbState,time:number,adjustments?:{wall:readonly number[];roof:readonly number[]},includeClaws=false,corner?:CornerGripContext):GripPose{
  const key=actor.bot?actor.role??'scout':actor.chassis,chassis=actor.bot?actor.role==='anchor'?'bastion':actor.role==='mortar'?'caracal':'lynx':actor.chassis;
  let r=rigs.get(key);if(!r){r=rig(key);rigs.set(key,r);}const {root,body,model,actions,c}=r,scale=actor.bot?actor.role==='anchor'?1.05:actor.role==='mortar'?.8:.65:MECHS[chassis].scale,depth=actor.bot?1:WALL_GAITS[chassis].depth;
  r.output.clawsSampled=includeClaws;for(const paw of r.claws)for(const claw of paw){claw.output.queryCap.finiteFace=false;claw.output.cap.finiteFace=false;claw.output.queryCap.vertexCount=claw.output.cap.vertexCount=claw.output.queryCap.triangleCount=claw.output.cap.triangleCount=claw.output.queryCap.boundaryCount=claw.output.cap.boundaryCount=0;}
  root.position.set(actor.position.x,actor.position.y-ACTOR_HEIGHT,actor.position.z);root.rotation.y=Math.atan2(state.normal.x,state.normal.z);body.position.y=0;body.rotation.set(0,Math.PI,0);
  const height=state.height,base=state.base;
  const cycle=wallCycle(chassis,scale,clamp((actor.position.y-ACTOR_HEIGHT-base)/height,0,1),height,depth);
  traversalClip(state,time,cycle,r.clip);
  const stage='mantleStage' in state?state as ClimbState&PoweredVaultState:undefined;
  if(stage?.mantleStage)poweredVaultPose(stage,time,r.vault);
  const ledge=state.phase!=='grab'&&state.phase!=='mantle'?clamp((root.position.y-(state.top-1.5))/1.62,0,1):0;
  const elapsed=Math.max(0,time-state.startedAt),blend=state.phase==='cling'||state.phase==='climb'?clamp(elapsed/.16,0,1):1;
  const hold=state.phase==='cling'&&(actor.position.y-ACTOR_HEIGHT-base)<.15?1:blend*blend*(3-2*blend);
  for(const p of r.pose)p.bone.quaternion.copy(p.rotation);
  for(let i=0;i<actions.length;i++){
    const a=actions[i],index=i+8;let weight=index===r.clip.index?1:0,phase=r.clip.phase;
    if((state.phase==='cling'||state.phase==='climb')&&(index===11||index===12)){weight=index===r.clip.index?hold:1-hold;phase=index===12?cycle:WALL_CLING_PHASE;}
    if(state.corner&&(index===11||index===12)){const cornerHold=overhaulCornerHoldBlend(state.corner,time);weight=weight*(1-cornerHold)+(index===11?cornerHold:0);}
    // Array order is Idle,Air,Grab,Cling,Climb,Mantle.
    if(stage?.mantleStage){weight=i===1?r.vault.air:i===5?r.vault.mantle:0;phase=i===1?clamp(state.progress,0,1):r.vault.phase;}
    else if(i<2){weight=0;}else if(i===5&&ledge>0){weight=ledge;phase=0;}else weight*=1-ledge;
    a.enabled=true;a.time=Math.min(a.getClip().duration-.00001,phase*a.getClip().duration);a.setEffectiveWeight(weight);
  }
  r.mixer.update(0);for(const p of r.pose)p.rotation.copy(p.bone.quaternion);model.updateWorldMatrix(true,true);
  for(let i=0;i<4;i++){
    const limb=r.limbs[i],wall=r.output.wall[i],roof=r.output.roof[i];wall.eligible=false;roof.eligible=false;wall.authored=false;roof.authored=false;wall.faceId=undefined;wall.cornerIndex=undefined;
    limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);limb.paw.getWorldQuaternion(c.pawRotation);
    const upper=c.hip.distanceTo(c.knee),lower=c.knee.distanceTo(c.paw);let pad=0,roofPad=0;
    for(const corner of limb.corners){c.from.copy(corner).applyMatrix4(limb.paw.matrixWorld).sub(c.paw);pad=Math.max(pad,-c.from.x*state.normal.x-c.from.z*state.normal.z);roofPad=Math.max(roofPad,-c.from.y);}pad+=.004;roofPad+=.004;
    const gap=(c.paw.x-state.contact.x)*state.normal.x+(c.paw.z-state.contact.z)*state.normal.z-pad;
    const bodyDistance=(actor.position.x-state.contact.x)*state.normal.x+(actor.position.z-state.contact.z)*state.normal.z;
    if(state.phase!=='mantle'&&wallPoseGap(gap,bodyDistance,buildingGripStandoff(actor))>.045*scale)continue;
    const wallWeight=stage?.mantleStage?0:state.phase==='mantle'?r.clip.wall*clamp((bodyDistance-.45)/(scale*1.4),0,1):r.clip.wall;
    wallContact(c.paw,state.contact,state.normal,pad,wallWeight,c.target);
    let wallNormal=state.normal;
    if(corner&&state.phase!=='mantle'){
      for(let n=0;n<8;n++)c.cornerOffsets[n].copy(limb.corners[n]).applyMatrix4(limb.paw.matrixWorld).sub(c.paw);
      const requests=overhaulCornerPawRequests(corner.faces,c.paw,c.cornerOffsets),request=corner.choices?requests.find(q=>q.index===corner.choices![i]):requests[0];
      if(!request)continue;c.target.set(request.target.x,request.target.y,request.target.z);wallNormal=request.face.normal;wall.faceId=request.face.id;wall.cornerIndex=request.index;
    }
    if(state.phase==='mantle'){const weight=(i<2?1:clamp((state.progress-.2)/.45,0,1))*(stage?.mantleStage?r.vault.roof:1);c.target.y+=(state.top+roofPad-c.target.y)*weight;}
    else c.target.y+=clamp(state.contact.y-(root.position.y+1.7*scale*depth),-.28*scale,.2*scale)*r.clip.wall;
    const wallShift=adjustments?.wall[i]??0,roofShift=adjustments?.roof[i]??0;
    c.target.x+=wallNormal.x*wallShift;c.target.z+=wallNormal.z*wallShift;c.target.y+=roofShift;
    wall.targetReach=roof.targetReach=c.hip.distanceTo(c.target)/(upper+lower);
    Object.assign(wall.queryPivot!,{x:c.target.x,y:c.target.y,z:c.target.z});Object.assign(roof.queryPivot!,wall.queryPivot!);
    wall.authored=wallWeight>.001;roof.authored=state.phase==='mantle'&&(!stage?.mantleStage||r.vault.roof>.001);
    for(let n=0;n<8;n++){c.from.copy(limb.corners[n]).applyMatrix4(limb.paw.matrixWorld).sub(c.paw).add(c.target);wall.queryCorners[n].x=roof.queryCorners[n].x=c.from.x;wall.queryCorners[n].y=roof.queryCorners[n].y=c.from.y;wall.queryCorners[n].z=roof.queryCorners[n].z=c.from.z;}
    writePatch(wall.queryPoints,wall.queryCorners,wallNormal,false);writePatch(roof.queryPoints,roof.queryCorners,state.normal,true);
    if(includeClaws)for(const claw of r.claws[i]){for(let n=0;n<claw.local.length;n++){c.from.copy(claw.local[n]).applyMatrix4(limb.paw.matrixWorld).sub(c.paw).add(c.target);const q=claw.output.queryVertices[n];q.x=c.from.x;q.y=c.from.y;q.z=c.from.z;}selectClawCap(claw.output.queryVertices,claw.output.triangles,wallNormal,scale,claw.output.queryCap);}

    solveKnee(c.hip,c.knee,c.target,upper,lower,c.joint,c.axis,c.pole);
    c.from.subVectors(c.knee,c.hip).normalize();c.to.subVectors(c.joint,c.hip).normalize();c.rotation.setFromUnitVectors(c.from,c.to);limb.upper.getWorldQuaternion(c.world);limb.upper.parent!.getWorldQuaternion(c.parent).invert();limb.upper.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));limb.upper.updateWorldMatrix(false,true);
    limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);c.from.subVectors(c.paw,c.knee).normalize();c.to.subVectors(c.target,c.knee).normalize();c.rotation.setFromUnitVectors(c.from,c.to);limb.lower.getWorldQuaternion(c.world);limb.lower.parent!.getWorldQuaternion(c.parent).invert();limb.lower.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));limb.lower.updateWorldMatrix(false,true);limb.paw.parent!.getWorldQuaternion(c.parent).invert();limb.paw.quaternion.copy(c.parent.multiply(c.pawRotation));limb.paw.updateWorldMatrix(false,false);
    limb.paw.getWorldPosition(c.paw);wall.reach=roof.reach=c.hip.distanceTo(c.paw)/(upper+lower);
    for(let n=0;n<8;n++){c.from.copy(limb.corners[n]).applyMatrix4(limb.paw.matrixWorld);wall.corners[n].x=roof.corners[n].x=c.from.x;wall.corners[n].y=roof.corners[n].y=c.from.y;wall.corners[n].z=roof.corners[n].z=c.from.z;}
    writePatch(wall.points,wall.corners,wallNormal,false);writePatch(roof.points,roof.corners,state.normal,true);
    if(includeClaws)for(const claw of r.claws[i]){for(let n=0;n<claw.local.length;n++){c.from.copy(claw.local[n]).applyMatrix4(limb.paw.matrixWorld);const q=claw.output.vertices[n];q.x=c.from.x;q.y=c.from.y;q.z=c.from.z;}selectClawCap(claw.output.vertices,claw.output.triangles,wallNormal,scale,claw.output.cap);}

    wall.eligible=wall.reach<=.98&&wall.targetReach<=.98&&wall.authored;roof.eligible=roof.reach<=.98&&roof.targetReach<=.98&&roof.authored;
  }
  return r.output;
}
export function buildingGripMaskCount(mask:number):number{return(mask&1)+((mask>>1)&1)+((mask>>2)&1)+((mask>>3)&1);}
export const buildingGripSources=profiles.rigs.map(({chassis,path,sha256})=>({chassis,path,sha256}));
export function buildingGripStandoff(actor:Pick<ActorState,'chassis'|'bot'|'role'>):number{return actorHullRadius(actor)+.09;}


/** Opt-in geometry preparation; old full-paw evaluators do not pay per-vertex
 * transforms until this API is requested. All returned objects are pooled. */
export function buildingGripClawPose(actor:Pick<ActorState,'chassis'|'position'|'bot'|'role'>,state:ClimbState,time:number,adjustments?:{wall:readonly number[];roof:readonly number[]}):GripPose{return buildingGripPose(actor,state,time,adjustments,true);}

export interface MantleBridgeSource {weights:number[];phases:number[];plants:MantleBridgePlant[];}
export interface MantleBridgeLimb {paw:number;hip:Vec3;endpoint:Vec3;rotation:[number,number,number,number];offsets:Vec3[];upper:number;lower:number;patch:GripPatch;endpointError:number;cornerError:number;}
export interface MantleBridgePose {limbs:MantleBridgeLimb[];}
// Isolated candidate rigs leave ordinary decoder pose/history untouched.
const mantleBridgeRigs=new Map<Chassis,ReturnType<typeof rig>>();
/** Capture the actual admitted source posture, not an invented upright start. */
export function captureMantleBridgeSource(actor:Pick<ActorState,'chassis'|'position'|'bot'|'role'>,state:ClimbState,time:number):MantleBridgeSource {
  const pose=buildingGripPose(actor,state,time),r=rigs.get(actor.chassis)!;
  if(actor.bot)throw new Error('The bounded mantle candidate owns only player chassis');
  const plants:MantleBridgePlant[]=[];
  for(let i=0;i<4;i++)if((state.gripMask|state.roofMask)&(1<<i)){
    const surface=state.roofMask&(1<<i)?'roof':'wall',p=pose[surface][i],target={...p.queryPivot!};
    if(!p.eligible)throw new Error('Cannot retain an ineligible source footprint');
    plants.push({paw:i,surface,faceId:state.anchor,target,rotation:r.limbs[i].paw.getWorldQuaternion(new Quaternion()).toArray(),offsets:p.corners.map(c=>({x:c.x-target.x,y:c.y-target.y,z:c.z-target.z}))});
  }
  return{weights:r.actions.map(a=>a.getEffectiveWeight()),phases:r.actions.map(a=>a.time/a.getClip().duration),plants};
}
/** Sample one original torso blend and exact fixed-length IK. Eligibility here
 * means solved geometry only: the caller must still prove all native owners. */
export function mantleBridgePose(actor:Pick<ActorState,'chassis'|'position'|'bot'|'role'>,state:ClimbState,source:MantleBridgeSource,torso:MantleBridgeTorso,plants:readonly MantleBridgePlant[]):MantleBridgePose {
  if(actor.bot)throw new Error('The bounded mantle candidate owns only player chassis');
  let r=mantleBridgeRigs.get(actor.chassis);if(!r){r=rig(actor.chassis);mantleBridgeRigs.set(actor.chassis,r);}
  const data=profiles.rigs.find(p=>p.key===actor.chassis)!,{root,body,model,c}=r;
  root.position.set(actor.position.x,actor.position.y-ACTOR_HEIGHT,actor.position.z);root.rotation.y=Math.atan2(state.normal.x,state.normal.z);body.rotation.set(0,Math.PI,0);
  for(let i=0;i<data.bones.length;i++){const b=data.bones[i],bone=r.pose[i].bone;bone.position.fromArray(b.position);bone.quaternion.fromArray(b.rotation);bone.scale.fromArray(b.scale);}
  for(let i=0;i<r.actions.length;i++){
    const a=r.actions[i],target=i===3?1-torso.mantle:i===5?torso.mantle:0;
    a.enabled=true;a.setEffectiveWeight(source.weights[i]*torso.source+target*(1-torso.source));
    const targetPhase=i===5?torso.phase:WALL_CLING_PHASE,phase=source.phases[i]*torso.source+targetPhase*(1-torso.source);
    a.time=Math.min(a.getClip().duration-.00001,phase*a.getClip().duration);
  }
  r.mixer.update(0);model.updateWorldMatrix(true,true);
  const limbs:MantleBridgeLimb[]=[];
  for(let i=0;i<4;i++){
    const limb=r.limbs[i],plant=plants.find(p=>p.paw===i),p=patch();
    limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);limb.paw.getWorldQuaternion(c.pawRotation);
    const hip={x:c.hip.x,y:c.hip.y,z:c.hip.z},upper=c.hip.distanceTo(c.knee),lower=c.knee.distanceTo(c.paw);
    const offsets=limb.corners.map(corner=>{const q=corner.clone().applyMatrix4(limb.paw.matrixWorld).sub(c.paw);return{x:q.x,y:q.y,z:q.z};});
    c.target.set(plant?.target.x??c.paw.x,plant?.target.y??c.paw.y,plant?.target.z??c.paw.z);
    if(plant)c.pawRotation.fromArray(plant.rotation);
    p.targetReach=c.hip.distanceTo(c.target)/(upper+lower);Object.assign(p.queryPivot!,{x:c.target.x,y:c.target.y,z:c.target.z});p.authored=!!plant;p.faceId=plant?.faceId;
    for(let n=0;n<8;n++){const offset=plant?.offsets[n]??offsets[n];p.queryCorners[n]={x:c.target.x+offset.x,y:c.target.y+offset.y,z:c.target.z+offset.z};}
    writePatch(p.queryPoints,p.queryCorners,state.normal,plant?.surface==='roof');
    if(plant){
      solveKnee(c.hip,c.knee,c.target,upper,lower,c.joint,c.axis,c.pole);
      c.from.subVectors(c.knee,c.hip).normalize();c.to.subVectors(c.joint,c.hip).normalize();c.rotation.setFromUnitVectors(c.from,c.to);limb.upper.getWorldQuaternion(c.world);limb.upper.parent!.getWorldQuaternion(c.parent).invert();limb.upper.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));limb.upper.updateWorldMatrix(false,true);
      limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);c.from.subVectors(c.paw,c.knee).normalize();c.to.subVectors(c.target,c.knee).normalize();c.rotation.setFromUnitVectors(c.from,c.to);limb.lower.getWorldQuaternion(c.world);limb.lower.parent!.getWorldQuaternion(c.parent).invert();limb.lower.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));limb.lower.updateWorldMatrix(false,true);limb.paw.parent!.getWorldQuaternion(c.parent).invert();limb.paw.quaternion.copy(c.parent.multiply(c.pawRotation));limb.paw.updateWorldMatrix(false,false);
    }
    limb.paw.getWorldPosition(c.paw);p.reach=c.hip.distanceTo(c.paw)/(upper+lower);
    for(let n=0;n<8;n++){c.from.copy(limb.corners[n]).applyMatrix4(limb.paw.matrixWorld);p.corners[n]={x:c.from.x,y:c.from.y,z:c.from.z};}writePatch(p.points,p.corners,state.normal,plant?.surface==='roof');
    const endpointError=Math.hypot(c.paw.x-p.queryPivot!.x,c.paw.y-p.queryPivot!.y,c.paw.z-p.queryPivot!.z),cornerError=Math.max(...p.corners.map((v,n)=>Math.hypot(v.x-p.queryCorners[n].x,v.y-p.queryCorners[n].y,v.z-p.queryCorners[n].z)));
    p.eligible=!!plant&&p.targetReach<=.98&&p.reach<=.98&&endpointError<1e-5&&cornerError<1e-5;
    limbs.push({paw:i,hip,endpoint:{x:c.paw.x,y:c.paw.y,z:c.paw.z},rotation:c.pawRotation.toArray(),offsets,upper,lower,patch:p,endpointError,cornerError});
  }
  return{limbs};
}
