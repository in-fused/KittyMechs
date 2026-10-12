import profiles from '../shared/building-grip-profiles.json' with {type:'json'};
import {describe,it,expect} from 'vitest';
import {readFileSync}from 'node:fs';
import {AnimationMixer,Bone,Group,Quaternion,SkinnedMesh,Vector3}from 'three';
import {GLTFLoader}from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder}from 'meshoptimizer';
import {texturelessGeometryGlb}from '../tools/textureless-geometry-glb';
import {MECHS,actorHullRadius}from '../shared/config';
import {buildingGripClawPose,buildingGripSources}from '../shared/buildingGrip';
import {poweredVaultPose}from '../shared/buildingVault';
import {clamp}from '../shared/math';
import {wallCycle,traversalClip,wallContact,wallPoseGap,WALL_CLING_PHASE,WALL_GAITS}from '../src/game/entities/felineMotion';
import {createAuthoredPose,restoreAuthoredPose,captureAuthoredPose,applyPawIK}from '../src/game/entities/pawContact';
import type {ActorState,ClimbState,EnemyRole}from '../shared/types';

describe('shipping traversal pose profile agrees with complete decoded rigs',()=>{
 for(const source of buildingGripSources)it(source.path,async()=>{
  const role=source.path.includes('Sentinel')?source.path.includes('Scout')?'scout':source.path.includes('Mortar')?'mortar':'anchor':undefined;
  const actor={chassis:source.chassis,bot:!!role,role:role as EnemyRole|undefined,position:{x:7,y:2.5,z:13}} as ActorState;
  const chassis=actor.bot?role==='anchor'?'bastion':role==='mortar'?'caracal':'lynx':actor.chassis,scale=actor.bot?role==='anchor'?1.05:role==='mortar'?.8:.65:MECHS[chassis].scale,depth=actor.bot?1:WALL_GAITS[chassis].depth;
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(readFileSync(source.path)),'');
  const root=new Group(),body=new Group();root.add(body);body.add(gltf.scene);body.scale.setScalar(scale);body.rotation.y=Math.PI;
  const point=new Vector3(),limbs=['FL','FR','HL','HR'].map(label=>{
   const upper=gltf.scene.getObjectByName(label+'_upper') as Bone,lower=gltf.scene.getObjectByName(label+'_lower') as Bone,paw=gltf.scene.getObjectByName(label+'_paw') as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
   gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const index=o.skeleton.bones.indexOf(paw);if(index<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex,weight=o.geometry.attributes.skinWeight;for(let i=0;i<pos.count;i++)if(idx.getX(i)===index&&weight.getX(i)===1){point.fromBufferAttribute(pos,i).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[index]);min.min(point);max.max(point);}});
   const corners:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.push(new Vector3(x,y,z));return{upper,lower,paw,corners};
  });
  const bones:Bone[]=[];gltf.scene.traverse(o=>{if(o instanceof Bone)bones.push(o);});const authored=createAuthoredPose(bones),mixer=new AnimationMixer(gltf.scene),actions=gltf.animations.map(clip=>{const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);return a;});
  const c={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};let compared=0;
  try{for(const phase of ['grab','cling','climb','mantle'] as const)for(const travel of [0,.08,.39,.95])for(const yaw of [0,.71])for(const shifted of [false,true]){
   const normal={x:Math.sin(yaw),y:0,z:Math.cos(yaw)},standoff=actorHullRadius(actor)+.09+.03;
   const state:ClimbState={anchor:'test',phase,startedAt:1,progress:travel,normal,contact:{x:actor.position.x-normal.x*standoff,y:actor.position.y+.4,z:actor.position.z-normal.z*standoff},top:4.3,base:0,height:12,gripMask:15,roofMask:0,mantleStage:phase==='mantle'?(travel<.39?'lift':'transfer'):null,mantleStageAt:phase==='mantle'?1:0},time=1.23;
   actor.position.y=1+travel*12;state.contact.y=actor.position.y+.4;root.position.set(actor.position.x,actor.position.y-1,actor.position.z);root.rotation.y=yaw;
   const cycle=wallCycle(chassis,scale,clamp((actor.position.y-1-state.base)/state.height,0,1),state.height,depth),sample=traversalClip(state,time,cycle),vault=poweredVaultPose(state,time),ledge=phase!=='grab'&&phase!=='mantle'?clamp((root.position.y-(state.top-1.5))/1.62,0,1):0,blend=clamp((time-state.startedAt)/.16,0,1),hold=phase==='cling'&&root.position.y<.15?1:blend*blend*(3-2*blend);
   restoreAuthoredPose(authored);for(const a of actions){const name=a.getClip().name,index=['FelineIdle','FelineAir','FelineGrab','FelineCling','FelineClimb','FelineMantle'].indexOf(name);let weight=index+8===sample.index?1:0,p=sample.phase;if((phase==='cling'||phase==='climb')&&(index===3||index===4)){weight=index+8===sample.index?hold:1-hold;p=index===4?cycle:WALL_CLING_PHASE;}if(state.mantleStage){weight=index===1?vault.air:index===5?vault.mantle:0;p=index===1?travel:vault.phase;}else if(index<2)weight=0;else if(index===5&&ledge>0){weight=ledge;p=0;}else weight*=1-ledge;a.enabled=true;a.time=Math.min(a.getClip().duration-.00001,p*a.getClip().duration);a.setEffectiveWeight(index>=0?weight:0);}
   mixer.update(0);captureAuthoredPose(authored);gltf.scene.updateWorldMatrix(true,true);const corrections=shifted?{wall:phase==='mantle'?[0,0,0,0]:[.02,-.02,.08,-.08],roof:phase==='mantle'?[.02,-.02,.08,-.08]:[0,0,0,0]}:undefined;const measured=buildingGripClawPose(actor,state,time,corrections);
   for(let i=0;i<4;i++){
    const limb=limbs[i];limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);limb.paw.getWorldQuaternion(c.pawRotation);const upper=c.hip.distanceTo(c.knee),lower=c.knee.distanceTo(c.paw);let pad=0,roofPad=0;for(const corner of limb.corners){c.from.copy(corner).applyMatrix4(limb.paw.matrixWorld).sub(c.paw);pad=Math.max(pad,-c.from.x*normal.x-c.from.z*normal.z);roofPad=Math.max(roofPad,-c.from.y);}pad+=.004;roofPad+=.004;
    const gap=(c.paw.x-state.contact.x)*normal.x+(c.paw.z-state.contact.z)*normal.z-pad,bodyDistance=(actor.position.x-state.contact.x)*normal.x+(actor.position.z-state.contact.z)*normal.z;
    if(phase!=='mantle'&&wallPoseGap(gap,bodyDistance,actorHullRadius(actor)+.09)>.045*scale){expect(measured.wall[i].eligible).toBe(false);continue;}
    const wallWeight=state.mantleStage?0:phase==='mantle'?sample.wall*clamp((bodyDistance-.45)/(scale*1.4),0,1):sample.wall;wallContact(c.paw,state.contact,normal,pad,wallWeight,c.target);
    if(phase==='mantle')c.target.y+=(state.top+roofPad-c.target.y)*(i<2?1:clamp((travel-.2)/.45,0,1))*(state.mantleStage?vault.roof:1);else c.target.y+=clamp(state.contact.y-(root.position.y+1.7*scale*depth),-.28*scale,.2*scale)*sample.wall;
    c.target.x+=normal.x*(corrections?.wall[i]??0);c.target.z+=normal.z*(corrections?.wall[i]??0);c.target.y+=corrections?.roof[i]??0;const requestedReach=c.hip.distanceTo(c.target)/(upper+lower);expect(measured.wall[i].targetReach).toBeCloseTo(requestedReach,7);
    const pawProfile=profiles.rigs.find(r=>r.path===source.path)!.paws[i];
    for(let claw=0;claw<3;claw++)for(let n=0;n<pawProfile.claws[claw].vertices.length;n++){point.fromArray(pawProfile.claws[claw].vertices[n]).applyMatrix4(limb.paw.matrixWorld).sub(c.paw).add(c.target);const q=measured.claws[i][claw].queryVertices[n];expect(point.distanceTo(new Vector3(q.x,q.y,q.z))).toBeLessThan(1e-6);}
    applyPawIK(limb.upper,limb.lower,limb.paw,c);limb.paw.getWorldPosition(c.paw);const reach=c.hip.distanceTo(c.paw)/(upper+lower);expect(measured.wall[i].reach).toBeCloseTo(reach,7);
    for(let claw=0;claw<3;claw++)for(let n=0;n<pawProfile.claws[claw].vertices.length;n++){point.fromArray(pawProfile.claws[claw].vertices[n]).applyMatrix4(limb.paw.matrixWorld);const q=measured.claws[i][claw].vertices[n];expect(point.distanceTo(new Vector3(q.x,q.y,q.z))).toBeLessThan(1e-6);}
    for(let n=0;n<8;n++){point.copy(limb.corners[n]).applyMatrix4(limb.paw.matrixWorld);const actual=measured.wall[i].corners[n];expect(point.distanceTo(new Vector3(actual.x,actual.y,actual.z))).toBeLessThan(1e-6);compared++;}
   }
  }expect(compared).toBeGreaterThan(100);}finally{mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}
 },20000);
});

