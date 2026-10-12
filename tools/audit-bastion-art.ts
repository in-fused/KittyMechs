/** Actual decoded art geometry, poses, sole bounds and post-IK floor evidence. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnimationMixer, AnimationUtils, Bone, Group, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import RAPIER from '@dimforge/rapier3d-compat';
import { createUprightMotion, uprightPawSupport, pawSupport } from '../src/game/entities/felineMotion';
import { applyPawIK, captureAuthoredPose, clearPawObstruction, createAuthoredPose, createPawAnchor, createPawProbe, PAW_PROFILES, pawSole, plantedPawTarget, probeGroundPaw, restoreAuthoredPose } from '../src/game/entities/pawContact';
import { texturelessGeometryGlb } from './textureless-geometry-glb';
const folder='assets/source/bastion-art-v1',path=process.argv[2]??`${folder}/Bastion_Quadruped.optimized-candidate.glb`;
function geometryOnly(path:string){return texturelessGeometryGlb(readFileSync(path));}
await RAPIER.init();await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),old=await loader.parseAsync(geometryOnly(`${folder}/approved-Bastion_Quadruped.glb`),''),gltf=await loader.parseAsync(geometryOnly(path),'');
const point=new Vector3();
function bounds(scene:Group,paw:Bone){
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
  scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const bone=o.skeleton.bones.indexOf(paw);if(bone<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;
    for(let i=0;i<pos.count;i++){if(idx.getX(i)!==bone)continue;point.set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[bone]);min.min(point);max.max(point);}
  });return{min,max};
}
let pawDelta=0;const pawRows=[];
for(const label of ['FL','FR','HL','HR']){
  const before=bounds(old.scene,old.scene.getObjectByName(label+'_paw') as Bone),after=bounds(gltf.scene,gltf.scene.getObjectByName(label+'_paw') as Bone);
  for(const edge of ['min','max'] as const)for(const axis of ['x','y','z'] as const)pawDelta=Math.max(pawDelta,Math.abs(before[edge][axis]-after[edge][axis]));
  pawRows.push({label,min:after.min.toArray(),max:after.max.toArray()});
}assert.equal(pawDelta,0,'Decoded shipping sole bounds changed');
const root=new Group(),body=new Group();root.add(body);body.add(gltf.scene);body.rotation.y=Math.PI;body.scale.setScalar(.95);root.updateWorldMatrix(true,true);
const limbs=['FL','FR','HL','HR'].map(label=>{
  const paw=gltf.scene.getObjectByName(label+'_paw') as Bone,{min,max}=bounds(gltf.scene,paw),corners=[];
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.push(new Vector3(x,y,z));
  return {label,paw,corners,upper:gltf.scene.getObjectByName(label+'_upper') as Bone,lower:gltf.scene.getObjectByName(label+'_lower') as Bone};
});
const bones=[...limbs.flatMap(l=>[l.upper,l.lower,l.paw]),gltf.scene.getObjectByName('head') as Bone,...Array.from({length:5},(_,i)=>gltf.scene.getObjectByName('tail_'+i) as Bone)],authored=createAuthoredPose(bones),mixer=new AnimationMixer(gltf.scene);
const all=gltf.animations.map(clip=>{const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);return a;});
let standaloneSamples=0,vertexSamples=0;
for(const action of all)for(const phase of [0,.125,.25,.5,.75,.875,1]){
  restoreAuthoredPose(authored);all.forEach(a=>a.setEffectiveWeight(a===action?1:0));action.time=Math.min(action.getClip().duration-.000001,phase*action.getClip().duration);mixer.update(0);captureAuthoredPose(authored);root.updateWorldMatrix(true,true);
  gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point);assert.ok(point.toArray().every(Number.isFinite));vertexSamples++;}});standaloneSamples++;
}
all.forEach(a=>a.setEffectiveWeight(0));
const baseNames=['Idle','WalkLong','Stride','TurnLeft','TurnRight'],bases=baseNames.map(name=>all.find(a=>a.getClip().name===`FelineUpright${name}`)!);
const reference=gltf.animations.find(a=>a.name==='FelineUprightCombatBase')!,reactions=['Pulse','Missile','Ability','Hit'].map(name=>{const clip=gltf.animations.find(a=>a.name===`FelineUpright${name}`)!.clone();AnimationUtils.makeClipAdditive(clip,0,reference,60);const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);return a;});
const world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));world.step();
const probe=createPawProbe(),up=new Vector3(0,1,0),c={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};
let cornerCase:unknown=null;let anchoredFeet=0,maxAnchoredReach=0;let feet=0,minCorner=Infinity,maxSegmentError=0,maxCasts=0,maxReach=0;
for(const mix of [[0,1,.15],[1,2,.5],[2,3,.5],[3,4,.5]] as const)for(const turnOffset of [0,.23,.5])for(const phase of [0,.12,.25,.46,.48,.5,.72,.96])for(let response=-1;response<8;response++){
  const [left,right,weight]=mix,pose=createUprightMotion();pose.phase=phase;pose.turn.phase=(phase+turnOffset)%1;pose.idle=pose.walk=pose.stride=0;
  for(const [index,w] of [[left,1-weight],[right,weight]]){if(index===0)pose.idle=w;else if(index===1)pose.walk=w;else if(index===2)pose.stride=w;else{pose.turn.weight+=w;pose.turn.left=index===3?1:0;}}
  if(left===3&&right===4){pose.turn.weight=1;pose.turn.left=1-weight;}
  if(pose.turn.weight>0&&pose.turn.weight<1){pose.walk/=1-pose.turn.weight;pose.stride/=1-pose.turn.weight;}
  restoreAuthoredPose(authored);bases.forEach((a,i)=>{a.time=(i>=3?pose.turn.phase:phase)*a.getClip().duration;a.setEffectiveWeight(i===left?1-weight:i===right?weight:0);});
  reactions.forEach((a,i)=>{a.time=(response%2===0?.2:.6)*a.getClip().duration;a.setEffectiveWeight(response>=0&&i===Math.floor(response/2)?1:0);});mixer.update(0);captureAuthoredPose(authored);root.updateWorldMatrix(true,true);
  for(const l of limbs.filter(l=>l.label[0]==='H')){
    const anchor=createPawAnchor(),support=uprightPawSupport('bastion',l.label,pose);l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);l.paw.getWorldQuaternion(c.pawRotation);const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),sole=pawSole(l.corners,l.paw.matrixWorld,c.paw,up,probe);
    maxCasts=Math.max(maxCasts,probeGroundPaw(world,probe,anchor,l.corners,l.paw.matrixWorld,c.paw,0,.95,PAW_PROFILES.bastion,0,1/60,support));
    plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,support,1/60,.95,PAW_PROFILES.bastion,c.target);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(l.upper,l.lower,l.paw,c);
    l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);maxSegmentError=Math.max(maxSegmentError,Math.abs(c.hip.distanceTo(c.knee)-a),Math.abs(c.knee.distanceTo(c.paw)-b));const reach=c.hip.distanceTo(c.paw)/(a+b);maxReach=Math.max(maxReach,reach);if(anchor.planted){anchoredFeet++;maxAnchoredReach=Math.max(maxAnchoredReach,reach);}
    if(support===0)assert.equal(anchor.planted,false);
    for(const corner of l.corners){point.copy(corner).applyMatrix4(l.paw.matrixWorld);const hit=world.castRay(new RAPIER.Ray({x:point.x,y:point.y+.5,z:point.z},{x:0,y:-1,z:0}),1,false);assert.ok(hit,JSON.stringify({mix,turnOffset,phase,response,label:l.label,point:point.toArray(),target:c.target.toArray(),support}));if(hit.timeOfImpact-.5<minCorner){minCorner=hit.timeOfImpact-.5;cornerCase={mix,turnOffset,phase,response,label:l.label,support,point:point.toArray(),target:c.target.toArray()};}}
    feet++;
  }
}
const uprightFeet=feet;
all.forEach(a=>a.setEffectiveWeight(0));reactions.forEach(a=>a.setEffectiveWeight(0));
const quadNames=['Idle','Walk','Trot','Gallop','TurnLeft','TurnRight'],quadBases=quadNames.map(name=>all.find(a=>a.getClip().name===`Feline${name}`)!);
const quadReference=gltf.animations.find(a=>a.name==='FelineCombatBase')!,quadReactions=['Pulse','Missile','Ability','Hit'].map(name=>{const clip=gltf.animations.find(a=>a.name===`Feline${name}`)!.clone();AnimationUtils.makeClipAdditive(clip,0,quadReference,60);const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);return a;});
for(const mix of [[0,1,.5],[1,2,.5],[2,3,.5],[1,4,.5],[4,5,.5]] as const)for(const turnOffset of [0,.23,.5])for(const phase of [0,.12,.25,.46,.48,.5,.72,.96])for(let response=-1;response<8;response++){
  const [left,right,weight]=mix,weights={idle:0,walk:0,trot:0,gallop:0,air:0},turn={phase:(phase+turnOffset)%1,weight:0,left:1};
  for(const [index,w] of [[left,1-weight],[right,weight]]){if(index===0)weights.idle=w;else if(index===1)weights.walk=w;else if(index===2)weights.trot=w;else if(index===3)weights.gallop=w;else{turn.weight+=w;turn.left=index===4?1:0;}}
  if(left===4&&right===5){turn.weight=1;turn.left=1-weight;}
  restoreAuthoredPose(authored);quadBases.forEach((a,i)=>{a.time=(i>=4?turn.phase:phase)*a.getClip().duration;a.setEffectiveWeight(i===left?1-weight:i===right?weight:0);});
  quadReactions.forEach((a,i)=>{a.time=(response%2===0?.2:.6)*a.getClip().duration;a.setEffectiveWeight(response>=0&&i===Math.floor(response/2)?1:0);});mixer.update(0);captureAuthoredPose(authored);root.updateWorldMatrix(true,true);
  for(const l of limbs){
    const anchor=createPawAnchor(),support=pawSupport('bastion',l.label,phase,weights,false,turn);l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);l.paw.getWorldQuaternion(c.pawRotation);const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),sole=pawSole(l.corners,l.paw.matrixWorld,c.paw,up,probe);
    maxCasts=Math.max(maxCasts,probeGroundPaw(world,probe,anchor,l.corners,l.paw.matrixWorld,c.paw,0,.95,PAW_PROFILES.bastion,0,1/60,support));
    plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,support,1/60,.95,PAW_PROFILES.bastion,c.target);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(l.upper,l.lower,l.paw,c);
    l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);maxSegmentError=Math.max(maxSegmentError,Math.abs(c.hip.distanceTo(c.knee)-a),Math.abs(c.knee.distanceTo(c.paw)-b));const reach=c.hip.distanceTo(c.paw)/(a+b);maxReach=Math.max(maxReach,reach);if(anchor.planted){anchoredFeet++;maxAnchoredReach=Math.max(maxAnchoredReach,reach);}
    if(support===0)assert.equal(anchor.planted,false);
    for(const corner of l.corners){point.copy(corner).applyMatrix4(l.paw.matrixWorld);const hit=world.castRay(new RAPIER.Ray({x:point.x,y:point.y+.5,z:point.z},{x:0,y:-1,z:0}),1,false);assert.ok(hit);if(hit.timeOfImpact-.5<minCorner){minCorner=hit.timeOfImpact-.5;cornerCase={mix,turnOffset,phase,response,label:l.label,support,point:point.toArray(),target:c.target.toArray()};}}
    feet++;
  }
}
console.log({feet,minCorner,maxSegmentError,maxReach,maxCasts,cornerCase});
if(!(minCorner>.0039&&maxSegmentError<2e-6&&maxAnchoredReach<.98&&anchoredFeet>0&&maxCasts<=5))writeFileSync(`${folder}/rejected-floor-composition-draft.json`,JSON.stringify({feet,minCorner,maxSegmentError,maxReach,maxCasts,cornerCase,method:'First expanded quad flat floor probe; unsupported full combat poses not yet adjudicated against actual Actor gates/carrier. Retained without weakening assertions.'},null,2));
assert.ok(minCorner>.0039&&maxSegmentError<2e-6&&maxAnchoredReach<.98&&anchoredFeet>0&&maxCasts<=5);
world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
const result={passed:true,pawDelta,paws:pawRows,standaloneSamples,vertexSamples,mixedFeet:feet,uprightFeet,quadrupedFeet:feet-uprightFeet,anchoredFeet,maxAnchoredReach,minCorner,maxSegmentError,maxReach,maxCasts,method:'Actual optimized candidate and approved baseline decoded bounds;224 standalone32clip poses finite; independent turn/gait phases and full-weight combat additives,1728 upright hind feet and4320 quadruped feet on real Rapier floor,production rigidIK+whole-paw clearance. Mathematical same-component affine envelope proof is separate; Fresh admitted anchors retain the .98 reach gate; maximum all-pose reach includes unchanged unplanted authored limbs and is compared to baseline separately. Terrain/carrier/traversal/aim/core production qualification remains independent critic scope.'};
writeFileSync(`${folder}/${resolve(path)===resolve(`${folder}/approved-Bastion_Quadruped.glb`)?'baseline-pose-receipt':resolve(path)===resolve('public/assets/models/Bastion_Quadruped.glb')?'shipping-pose-receipt':'candidate-pose-receipt'}.json`,JSON.stringify(result,null,2));console.log(result);
