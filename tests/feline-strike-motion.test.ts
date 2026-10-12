import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {AnimationMixer,Bone,Quaternion,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import {MECHS} from '../shared/config';
import type {Chassis,FelineStrikeState} from '../shared/types';
import {FELINE_STRIKE_BONES,FELINE_STRIKE_ENTRY,applyFelineStrikeMotion,bindFelineStrikeRig,createFelineStrikePose,restoreFelineStrikeRig,sampleFelineStrikeMotion} from '../src/game/entities/felineStrikeMotion';
const chassis:Chassis[]=['pounce','bastion','lynx','caracal'];
const action=(kind:FelineStrikeState['kind']='pounce'):FelineStrikeState=>({id:17,life:4,kind,acceptedAt:10,stage:'flight',stageAt:10,endsAt:11,direction:{x:0,y:-.3,z:-1},side:1});
const sample=(key:Chassis,clock:FelineStrikeState|null,time:number)=>sampleFelineStrikeMotion(key,clock,time,{life:4},createFelineStrikePose());
describe('accepted feline strike presentation clocks',()=>{
  it('has four distinct bounded compositions for each accepted action kind',()=>{
    for(const kind of ['pounce','tackle','dive'] as const){const poses=chassis.map(c=>sample(c,action(kind),10.3));expect(new Set(poses.map(p=>JSON.stringify(p.rotations))).size).toBe(4);
      for(const pose of poses){expect(pose.weight).toBe(1);expect(Math.abs(pose.bodyPitch)).toBeLessThanOrEqual(.2);expect(Math.abs(pose.bodyRoll)).toBeLessThanOrEqual(.1);
        for(const r of Object.values(pose.rotations))expect([r.x,r.y,r.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=.4)).toBe(true);
      }
    }
  });
  it('samples acceptance and stage clocks continuously, ending at the exact authority terminal',()=>{
    for(const key of chassis){const clock=action(),entry=FELINE_STRIKE_ENTRY[key];expect(sample(key,clock,10).weight).toBe(0);expect(sample(key,clock,10+entry).weight).toBeCloseTo(1,10);
      const at=10+entry*.5,recovery={...clock,stage:'recovery' as const,stageAt:at,endsAt:at+.4},flight=sample(key,clock,at),start=sample(key,recovery,at);
      expect(start.weight).toBeCloseTo(flight.weight,12);expect(start.rotations).toEqual(flight.rotations);
      expect(sample(key,recovery,at+.2).weight).toBeCloseTo(start.weight*.5,10);expect(sample(key,recovery,recovery.endsAt).weight).toBe(0);expect(sample(key,recovery,recovery.endsAt).actionId).toBeNull();
      expect(sample(key,clock,clock.endsAt).weight).toBe(0);
    }
  });
  it('late join and stopped display clocks produce the same pose without playback restart or frame integration',()=>{
    for(const key of chassis){const clock=action('dive'),early=sample(key,clock,10.2),late=sample(key,clock,10.2);expect(late).toEqual(early);
      const out=createFelineStrikePose();sampleFelineStrikeMotion(key,clock,10.2,{life:4},out);const receipt=JSON.stringify(out);
      for(let i=0;i<40;i++)sampleFelineStrikeMotion(key,clock,10.2,{life:4},out);expect(JSON.stringify(out)).toBe(receipt);
      const recovery={...clock,stage:'recovery' as const,stageAt:10.5,endsAt:10.9};expect(sample(key,recovery,10.7)).toEqual(sample(key,recovery,10.7));
    }
  });
  it('clears a reused output on life reset, authoritative cancellation, interruption and invalid/future clocks',()=>{
    const out=createFelineStrikePose(),clock=action();
    const assertCleared=()=>{expect(out.weight).toBe(0);expect(out.actionId).toBeNull();expect(Object.values(out.rotations).every(r=>r.x===0&&r.y===0&&r.z===0)).toBe(true);};
    for(const [state,time,context] of [[null,10.3,{life:4}],[clock,10.3,{life:5}],[clock,10.3,{life:4,interrupted:true}],[clock,9,{life:4}],[{...clock,endsAt:NaN},10.3,{life:4}]] as const){
      sampleFelineStrikeMotion('pounce',clock,10.3,{life:4},out);expect(out.weight).toBe(1);sampleFelineStrikeMotion('pounce',state,time,context,out);assertCleared();
    }
  });
  it('keeps the authoritative lead side stable and mirrors asymmetric glide/guard composition',()=>{
    for(const key of ['bastion','lynx'] as const){const left=sample(key,{...action(),side:1},10.3),right=sample(key,{...action(),side:-1},10.3);
      expect(left.bodyRoll).toBeCloseTo(-right.bodyRoll,12);expect(left.rotations.FL_upper.x).not.toBe(left.rotations.FR_upper.x);expect(left.rotations.FL_upper.x).toBe(right.rotations.FR_upper.x);expect(left.rotations.FR_upper.x).toBe(right.rotations.FL_upper.x);
    }
  });
});
describe('actual shipping rig procedural adapter',()=>{
  for(const key of chassis)it(`${key}: binds shipping bones, composes local rotations, restores without changing segments/scale/translation`,async()=>{
    const bytes=readFileSync(`public/assets/models/${MECHS[key].model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
    const air=gltf.animations.find(clip=>clip.name==='FelineAir')!;expect(air).toBeDefined();const mixer=new AnimationMixer(gltf.scene),airAction=mixer.clipAction(air);airAction.play();airAction.paused=true;airAction.time=air.duration*.25;mixer.update(0);
    const rig=bindFelineStrikeRig(gltf.scene),pose=sample(key,action(),10.3),baseline=new Map(rig.bones.map(b=>[b.name,{rotation:b.bone.quaternion.clone(),position:b.bone.position.clone(),scale:b.bone.scale.clone()}]));
    expect(rig.bones.map(b=>b.name)).toEqual(FELINE_STRIKE_BONES);gltf.scene.updateWorldMatrix(true,true);
    const lengths=()=>['FL','FR','HL','HR'].flatMap(p=>{const upper=gltf.scene.getObjectByName(`${p}_upper`)!,lower=gltf.scene.getObjectByName(`${p}_lower`)!,paw=gltf.scene.getObjectByName(`${p}_paw`)!;return[upper.getWorldPosition(new Vector3()).distanceTo(lower.getWorldPosition(new Vector3())),lower.getWorldPosition(new Vector3()).distanceTo(paw.getWorldPosition(new Vector3()))];});
    const before=lengths();applyFelineStrikeMotion(rig,pose);gltf.scene.updateWorldMatrix(true,true);const after=lengths();after.forEach((length,i)=>expect(length).toBeCloseTo(before[i],6));
    expect(rig.bones.some(b=>b.bone.quaternion.angleTo(baseline.get(b.name)!.rotation)>.01)).toBe(true);
    expect(()=>applyFelineStrikeMotion(rig,pose)).toThrow();
    for(const b of rig.bones){expect(b.bone.position).toEqual(baseline.get(b.name)!.position);expect(b.bone.scale).toEqual(baseline.get(b.name)!.scale);expect(Math.abs(b.bone.quaternion.length()-1)).toBeLessThan(.000001);}
    restoreFelineStrikeRig(rig);for(const b of rig.bones)expect(b.bone.quaternion.toArray()).toEqual(baseline.get(b.name)!.rotation.toArray());
    // A fresh authored pose can replace the prior one without procedural residue.
    const chest=rig.bones.find(b=>b.name==='chest')!;chest.bone.quaternion.copy(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.2));const authored=chest.bone.quaternion.clone();
    applyFelineStrikeMotion(rig,pose);restoreFelineStrikeRig(rig);expect(chest.bone.quaternion.toArray()).toEqual(authored.toArray());
    applyFelineStrikeMotion(rig,createFelineStrikePose());expect(rig.applied).toBe(false);
    expect(gltf.scene.getObjectByName('FL_paw')).toBeInstanceOf(Bone);
  });
});

describe('shipping core baseline preservation',()=>{
  for(const key of ['pounce','bastion','lynx'] as const)it(`${key}: preserves actual authored core rotations in all three strike modes`,async()=>{
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(readFileSync(`public/assets/models/${MECHS[key].model}.glb`)),'');
    const mixer=new AnimationMixer(gltf.scene),rig=bindFelineStrikeRig(gltf.scene);
    for(const kind of ['pounce','dive','tackle'] as const)for(const phase of [.25,.75]){
      mixer.stopAllAction();const clip=gltf.animations.find(c=>c.name===(kind==='tackle'?'FelineUprightAir':'FelineAir'))!;expect(clip).toBeDefined();
      const clipAction=mixer.clipAction(clip);clipAction.play();clipAction.paused=true;clipAction.time=clip.duration*phase;mixer.update(0);gltf.scene.updateMatrixWorld(true);
      const core=rig.bones.filter(b=>['pelvis','spine','chest','head'].includes(b.name));
      const baseline=core.map(b=>({local:b.bone.quaternion.toArray(),world:b.bone.getWorldQuaternion(new Quaternion()).toArray()}));
      const pose=sample(key,{...action(),kind},10.3);expect(pose.weight).toBeGreaterThan(0);expect(pose.bodyPitch).toBe(0);expect(pose.bodyRoll).toBe(0);
      applyFelineStrikeMotion(rig,pose);gltf.scene.updateMatrixWorld(true);
      core.forEach((b,i)=>{expect(b.bone.quaternion.toArray()).toEqual(baseline[i].local);b.bone.getWorldQuaternion(new Quaternion()).toArray().forEach((v,j)=>expect(v).toBeCloseTo(baseline[i].world[j],12));});
      expect(rig.bones.some(b=>b.name.endsWith('_upper')&&Math.abs(pose.rotations[b.name].x)>0)).toBe(true);restoreFelineStrikeRig(rig);
    }
  });
});
