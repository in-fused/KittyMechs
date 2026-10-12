import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import {readFileSync,writeFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationMixer,AnimationUtils,Bone,Group,Quaternion,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {ACTOR_RADII,MECHS,UPRIGHT_HEIGHT} from '../shared/config';
import {createUprightMotion,uprightPawSupport} from '../src/game/entities/felineMotion';
import {applyPawIK,captureAuthoredPose,clearPawObstruction,createAuthoredPose,createPawAnchor,createPawProbe,PAW_PROFILES,pawSole,plantedPawTarget,probeGroundPaw,restoreAuthoredPose} from '../src/game/entities/pawContact';

describe('composed upright whole-paw clearance',()=>{
  it('retracts actual mixed/additive soles onto a real fixed floor without stretching or planting released feet',async()=>{
    await RAPIER.init();let samples=0,rawBelow=0,minFinal=Infinity,maxSegments=0,maxCasts=0,minCore=Infinity,maxCoreHeight=0,maxCoreRadius=0,coreSamples=0;
    const point=new Vector3(),up=new Vector3(0,1,0);
    const c={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){
      const def=MECHS[chassis],bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
      const root=new Group(),body=new Group();root.add(body);body.add(gltf.scene);body.rotation.y=Math.PI;body.scale.setScalar(def.scale);root.updateWorldMatrix(true,true);
      const limbs=['HL','HR'].map(label=>{
        const upper=gltf.scene.getObjectByName(`${label}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${label}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${label}_paw`) as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
        gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const b=o.skeleton.bones.indexOf(paw);if(b<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;
          for(let i=0;i<pos.count;i++){if(idx.getX(i)!==b)continue;point.set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[b]);min.min(point);max.max(point);}
        });
        const corners:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.push(new Vector3(x,y,z));
        return {label,upper,lower,paw,corners};
      });
      const authored=createAuthoredPose(limbs.flatMap(l=>[l.upper,l.lower,l.paw])),mixer=new AnimationMixer(gltf.scene),baseNames=['Idle','WalkLong','Stride','TurnLeft','TurnRight'];
      const core: {mesh:SkinnedMesh;vertices:number[]}[]=[];
      gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const ids=new Set(o.skeleton.bones.map((b,i)=>['pelvis','spine','chest','head','weapon_L','weapon_R','launcher'].includes(b.name)?i:-1)),vertices:number[]=[];const indices=o.geometry.attributes.skinIndex;for(let i=0;i<indices.count;i++)if(ids.has(indices.getX(i)))vertices.push(i);core.push({mesh:o,vertices});});
      const bases=baseNames.map(name=>{const action=mixer.clipAction(gltf.animations.find(a=>a.name===`FelineUpright${name}`)!);action.play();action.paused=true;action.setEffectiveWeight(0);return action;});
      const reference=gltf.animations.find(a=>a.name==='FelineUprightCombatBase')!;
      const reactions=['Pulse','Missile','Ability','Hit'].map(name=>{const clip=gltf.animations.find(a=>a.name===`FelineUpright${name}`)!.clone();AnimationUtils.makeClipAdditive(clip,0,reference,60);const action=mixer.clipAction(clip);action.play();action.paused=true;action.setEffectiveWeight(0);return action;});
      const world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));world.step();const probe=createPawProbe();
      for(const mixture of [[0,1,.15],[1,2,.5],[2,3,.5],[3,4,.5]] as const)for(const turnOffset of [0,.23,.5])for(const phase of [0,.12,.25,.46,.48,.5,.72,.96])for(let response=-1;response<8;response++){
        const [left,right,weight]=mixture,pose=createUprightMotion();pose.phase=phase;pose.turn.phase=(phase+turnOffset)%1;pose.idle=pose.walk=pose.stride=0;
        for(const [index,w] of [[left,1-weight],[right,weight]]){if(index===0)pose.idle=w;else if(index===1)pose.walk=w;else if(index===2)pose.stride=w;else{pose.turn.weight+=w;pose.turn.left=index===3?1:0;}}
        if(left===3&&right===4){pose.turn.weight=1;pose.turn.left=1-weight;}
        // Turn mixtures are already flattened action weights here; normalize
        // gait proportions for the production support helper's turn factor.
        if(pose.turn.weight>0&&pose.turn.weight<1){pose.walk/=1-pose.turn.weight;pose.stride/=1-pose.turn.weight;}
        restoreAuthoredPose(authored);
        bases.forEach((a,index)=>{a.enabled=true;a.time=(index>=3?pose.turn.phase:phase)*a.getClip().duration;a.setEffectiveWeight(index===left?1-weight:index===right?weight:0);});
        reactions.forEach((a,index)=>{a.enabled=true;a.time=(response%2===0?.2:.6)*a.getClip().duration;a.setEffectiveWeight(response>=0&&index===Math.floor(response/2)?1:0);});
        mixer.update(0);captureAuthoredPose(authored);root.updateWorldMatrix(true,true);
        for(const limb of limbs){
          const anchor=createPawAnchor(),support=uprightPawSupport(chassis,limb.label,pose);limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);limb.paw.getWorldQuaternion(c.pawRotation);
          const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),sole=pawSole(limb.corners,limb.paw.matrixWorld,c.paw,up,probe);
          for(const corner of limb.corners){point.copy(corner).applyMatrix4(limb.paw.matrixWorld);if(point.y<-.001)rawBelow++;}
          maxCasts=Math.max(maxCasts,probeGroundPaw(world,probe,anchor,limb.corners,limb.paw.matrixWorld,c.paw,0,def.scale,PAW_PROFILES[chassis],0,1/60,support));
          plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,support,1/60,def.scale,PAW_PROFILES[chassis],c.target);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(limb.upper,limb.lower,limb.paw,c);
          limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);maxSegments=Math.max(maxSegments,Math.abs(c.hip.distanceTo(c.knee)-a),Math.abs(c.knee.distanceTo(c.paw)-b));
          expect(c.hip.distanceTo(c.paw)/(a+b)).toBeLessThan(.98);if(support===0)expect(anchor.planted).toBe(false);
          for(const corner of limb.corners){point.copy(corner).applyMatrix4(limb.paw.matrixWorld);const hit=world.castRay(new RAPIER.Ray({x:point.x,y:point.y+.5,z:point.z},{x:0,y:-1,z:0}),1,false);expect(hit).not.toBeNull();minFinal=Math.min(minFinal,hit!.timeOfImpact-.5);}
          samples++;
        }
        // Includes cosmetic vertices carried by central bones: a conservative
        // shipping floor/core check, distinct from source-tagged admission.
        root.updateWorldMatrix(true,true);
        let caseFloor=Infinity,caseHeight=0,caseRadius=0;
        for(const row of core){row.mesh.skeleton.update();for(const index of row.vertices){row.mesh.getVertexPosition(index,point);point.applyMatrix4(row.mesh.matrixWorld);caseFloor=Math.min(caseFloor,point.y);caseHeight=Math.max(caseHeight,point.y);caseRadius=Math.max(caseRadius,Math.hypot(point.x,point.z));coreSamples++;}}
        expect(caseFloor).toBeGreaterThan(0);expect(caseHeight).toBeLessThan(UPRIGHT_HEIGHT);expect(caseRadius).toBeLessThan(ACTOR_RADII[chassis]);minCore=Math.min(minCore,caseFloor);maxCoreHeight=Math.max(maxCoreHeight,caseHeight);maxCoreRadius=Math.max(maxCoreRadius,caseRadius);
      }
      world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
    expect(samples).toBe(6912);expect(rawBelow).toBeGreaterThan(100);expect(maxCasts).toBeLessThanOrEqual(5);expect(minFinal).toBeGreaterThan(.0039);expect(maxSegments).toBeLessThan(.000002);
    if(process.env.KITTYMECH_CONTACT_RECEIPT)writeFileSync(process.env.KITTYMECH_CONTACT_RECEIPT,JSON.stringify({samples,rawBelow,minFinal,maxSegments,maxCasts,minCore,maxCoreHeight,maxCoreRadius,coreSamples,method:'actual four shipping GLBs; 4 mixed base poses x3 independent turn offsets x8 gait phases x9 additive states x2 hind paws; real fixed Rapier floor; production single five-ray prepass, planted target, obstruction retraction and rigid IK; independent final8corner rays and all central-bone vertices incl cosmetics; no carrier/aim/authority trajectory qualification'},null,2));
  },60000);
});
