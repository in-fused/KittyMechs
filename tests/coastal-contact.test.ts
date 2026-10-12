import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { AnimationClip, AnimationMixer, Bone, Group, Matrix4, Quaternion, QuaternionKeyframeTrack, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import { ACTOR_HEIGHT, CHASSIS, MECHS } from '../shared/config';
import { Simulation } from '../shared/simulation';
import { emptyInput } from '../shared/types';
import { terrainHeight } from '../shared/world';
import { applyPawIK, capturePawLeasePose, preparePawLease, captureAuthoredPose, clearPawObstruction, createAuthoredPose, createGroundSettle, createPawAnchor, createPawProbe, envelopePresent, includeGroundSettle, PAW_PROFILES, pawFootprint, pawSole, plantedPawTarget, probeGroundPaw, resetGroundSettle, restoreAuthoredPose, sampleStaticPaw, settleCarrier } from '../src/game/entities/pawContact';

beforeAll(async()=>{await RAPIER.init();});
function footprint(){const corners:Vector3[]=[];for(const x of [-.12,.12])for(const y of [-.1,.1])for(const z of [-.22,.22])corners.push(new Vector3(x,y,z));return corners;}
describe('complete coastal support and authored pose isolation',()=>{
  it('does not accumulate limb, head or tail corrections when the mixer holds an unchanged pose',()=>{
    const root=new Group(),bones=['upper','lower','paw','head','tail'].map(name=>{const b=new Bone();b.name=name;root.add(b);return b;});
    const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.2),clip=new AnimationClip('held',1,bones.map(b=>new QuaternionKeyframeTrack(`${b.name}.quaternion`,[0,1],[...rotation.toArray(),...rotation.toArray()]))),mixer=new AnimationMixer(root),action=mixer.clipAction(clip).play();action.paused=true;const pose=createAuthoredPose([...bones,bones[0]]),correction=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.3);
    expect(pose.length).toBe(5);
    for(let frame=0;frame<120;frame++){restoreAuthoredPose(pose);mixer.update(1/60);captureAuthoredPose(pose);for(const bone of bones){expect(bone.quaternion.angleTo(rotation)).toBeLessThan(1e-7);bone.quaternion.premultiply(correction);expect(bone.quaternion.angleTo(correction.clone().multiply(rotation))).toBeLessThan(1e-7);}}
    mixer.stopAllAction();mixer.uncacheRoot(root);
  });
  it('fits continuous triangle seams within the unchanged all-five residual bound, but rejects steps and degenerate footprints',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0});
    // A shallow continuous V across two triangle planes: the center triangle
    // alone mispredicts a corner by 2.4mm, while the whole footprint fits safely.
    const vertices=new Float32Array([-1,.01,-1,-1,.01,1,0,0,-1,0,0,1,1,.01,-1,1,.01,1]);
    world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,new Uint32Array([0,1,2,2,1,3,2,3,4,4,3,5])));world.step();
    const anchor=createPawAnchor(),probe=createPawProbe();pawFootprint(footprint(),new Matrix4(),new Vector3(),probe);sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);
    expect(anchor.surface.envelope).toBe(true);expect(anchor.surface.valid).toBe(true);expect(anchor.surface.casts).toBe(5);expect(Math.abs(anchor.surface.height-anchor.surface.centerHeight)).toBeLessThan(.002);
    for(let i=0;i<5;i++){const p=i?probe.footprint[i-1]:new Vector3(),floor=anchor.surface.height-(anchor.surface.normal.x*p.x+anchor.surface.normal.z*p.z)/anchor.surface.normal.y;
      expect(Math.abs(floor-probe.heights[i])).toBeLessThanOrEqual(.002);expect(floor+.004-probe.heights[i]).toBeGreaterThanOrEqual(.002);}
    const body=world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.025,1).setTranslation(.31,.025,0));world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,.05,1);expect(anchor.surface.envelope).toBe(true);expect(anchor.surface.valid).toBe(false);
    world.removeCollider(body,true);expect(envelopePresent(anchor.surface)).toBe(false);expect(anchor.surface.normal.toArray()).toEqual([0,1,0]);expect(anchor.surface.ceiling).toBe(-Infinity);
    probe.footprint.forEach(p=>p.set(0,0,0));sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);expect(anchor.surface.envelope).toBe(true);expect(anchor.surface.valid).toBe(false);world.free();
  });
  it('uses the real downhill search capacity without accepting overhead, missing or dynamic support',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),anchor=createPawAnchor(),probe=createPawProbe();pawFootprint(footprint(),new Matrix4(),new Vector3(),probe);
    const floor=world.createCollider(RAPIER.ColliderDesc.cuboid(1,.1,1).setTranslation(0,-.43,0));world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,.95,PAW_PROFILES.bastion);expect(anchor.surface.valid).toBe(true);expect(anchor.surface.height).toBeCloseTo(-.33);
    floor.setSensor(true);expect(envelopePresent(anchor.surface)).toBe(false);floor.setSensor(false);floor.setTranslation({x:0,y:.33,z:0});world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,.95,PAW_PROFILES.bastion);expect(anchor.surface.envelope).toBe(false);
    world.removeCollider(floor,true);const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());world.createCollider(RAPIER.ColliderDesc.cuboid(1,.1,1).setTranslation(0,-.1,0),body);world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,.95,PAW_PROFILES.bastion);expect(anchor.surface.envelope).toBe(false);world.free();
  });
  it('queries the actual fading sole before final release, rather than the old anchored floor',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,2).setTranslation(0,-.1,0));world.createCollider(RAPIER.ColliderDesc.cuboid(1,.025,2).setTranslation(1.3,.025,0));world.step();
    function measure(fresh:boolean){
      const root=new Group(),upper=new Bone(),lower=new Bone(),paw=new Bone();root.position.set(.6,.004,0);root.add(upper);upper.add(lower);lower.add(paw);upper.position.y=.9;lower.position.set(.25,-.4,0);paw.position.set(-.25,-.4,0);root.updateWorldMatrix(true,true);
      const probe=createPawProbe(),anchor=createPawAnchor(),shape=footprint(),c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);
      pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);expect(anchor.surface.valid).toBe(true);anchor.position.set(0,.104,0);anchor.planted=true;anchor.weight=.5;anchor.nextProbe=10;capturePawLeasePose(anchor,new Vector3(0,.904,0),anchor.position,a,b);preparePawLease(anchor,c.paw,c.hip,.104,a+b,0,1/60,1,PAW_PROFILES.pounce);
      if(fresh){expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,c.paw,0,1,PAW_PROFILES.pounce,1,1/60,0)).toBe(5);expect(anchor.surface.height).toBeCloseTo(.05);}
      const sole=pawSole(shape,paw.matrixWorld,c.paw,probe.up.set(0,1,0),probe);plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,0,1/60,1,PAW_PROFILES.pounce,c.target);if(fresh)expect(anchor.surface.x).toBeCloseTo(c.target.x,9);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(upper,lower,paw,c);
      upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,9);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,9);let penetration=0;
      for(const corner of shape){const p=corner.clone().applyMatrix4(paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:p.x,y:p.y+.5,z:p.z},{x:0,y:-1,z:0}),2,false);expect(hit).not.toBeNull();penetration=Math.max(penetration,.5-hit!.timeOfImpact);}return penetration;
    }
    expect(measure(false)).toBeGreaterThan(.04);expect(measure(true)).toBeLessThan(.00001);world.free();
  });
  it('refreshes a moving unplanted shipping paw and rotated corners before its scheduled query',async()=>{
    const def=MECHS.lynx,bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),''),root=new Group(),carrier=new Group();root.add(carrier);carrier.add(gltf.scene);carrier.scale.setScalar(def.scale);carrier.rotation.y=Math.PI;root.updateWorldMatrix(true,true);
    const upper=gltf.scene.getObjectByName('FL_upper') as Bone,lower=gltf.scene.getObjectByName('FL_lower') as Bone,paw=gltf.scene.getObjectByName('FL_paw') as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),point=new Vector3();
    gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const bone=o.skeleton.bones.indexOf(paw);if(bone<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;for(let i=0;i<pos.count;i++){if(idx.getX(i)!==bone)continue;point.set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[bone]);min.min(point);max.max(point);}});
    const shape:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])shape.push(new Vector3(x,y,z));const rest=createAuthoredPose([upper,lower,paw]),probe=createPawProbe(),world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));world.createCollider(RAPIER.ColliderDesc.cuboid(2,.003,2).setTranslation(2.5,.003,0));world.step();
    paw.getWorldPosition(point);const vertical=pawSole(shape,paw.matrixWorld,point,probe.up.set(0,1,0),probe);root.position.set(1.1-point.x,vertical-point.y,-point.z);root.updateWorldMatrix(true,true);
    function measure(fresh:boolean){restoreAuthoredPose(rest);root.updateWorldMatrix(true,true);const anchor=createPawAnchor(),c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,0,0,root.position.y,def.scale,PAW_PROFILES.lynx);expect(anchor.surface.valid).toBe(true);anchor.nextProbe=2;expect(anchor.planted).toBe(false);expect(anchor.weight).toBe(0);
      if(fresh){expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,c.paw,root.position.y,def.scale,PAW_PROFILES.lynx,1,1/60,1)).toBe(5);expect(anchor.surface.x).toBeCloseTo(c.paw.x,9);expect(anchor.surface.height).toBeCloseTo(.006);}
      const sole=pawSole(shape,paw.matrixWorld,c.paw,probe.up.set(0,1,0),probe);plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,1,1/60,def.scale,PAW_PROFILES.lynx,c.target);if(!fresh)expect(anchor.planted).toBe(false);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,7);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,7);let overlap=0;
      for(const corner of shape){const p=corner.clone().applyMatrix4(paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:p.x,y:p.y+.5,z:p.z},{x:0,y:-1,z:0}),2,false);expect(hit).not.toBeNull();overlap=Math.max(overlap,.5-hit!.timeOfImpact);}return overlap;
    }
    expect(measure(false)).toBeGreaterThan(.0015);expect(measure(true)).toBeLessThan(.00001);
    restoreAuthoredPose(rest);root.updateWorldMatrix(true,true);const anchor=createPawAnchor();paw.getWorldPosition(point);expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,point,root.position.y,def.scale,PAW_PROFILES.lynx,2,1/60,0)).toBe(5);expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,point,root.position.y,def.scale,PAW_PROFILES.lynx,2.001,1/60,0)).toBe(0);
    const position=point.clone();root.rotation.y=.35;root.updateWorldMatrix(true,true);paw.getWorldPosition(point);root.position.x+=position.x-point.x;root.position.z+=position.z-point.z;root.updateWorldMatrix(true,true);paw.getWorldPosition(point);expect(point.x).toBeCloseTo(position.x,9);expect(point.z).toBeCloseTo(position.z,9);expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,point,root.position.y,def.scale,PAW_PROFILES.lynx,2.002,1/60,0)).toBe(5);world.free();
  });
  it('acquires sustained fixed-length contact on the actual coastal endpoint after an above-ground authority drop',async()=>{
    for(const chassis of CHASSIS){
      const seed=7734,x=-141.096704,z=-26.898108,world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp'),actor=sim.addActor('coast','Coast',chassis,false,{x,y:terrainHeight(x,z,seed)+ACTOR_HEIGHT+1.5,z});
      for(let frame=0;frame<180;frame++){sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1});sim.step(1/60);}expect(actor.grounded).toBe(true);
      const def=MECHS[chassis],profile=PAW_PROFILES[chassis],bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
      const root=new Group(),carrier=new Group();root.add(carrier);carrier.add(gltf.scene);carrier.scale.setScalar(def.scale);
      const limbs=['FL','FR','HL','HR'].map(prefix=>{
        const upper=gltf.scene.getObjectByName(`${prefix}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${prefix}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${prefix}_paw`) as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),p=new Vector3();gltf.scene.updateWorldMatrix(true,true);
        gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const bone=o.skeleton.bones.indexOf(paw);if(bone<0)return;const positions=o.geometry.attributes.position,indices=o.geometry.attributes.skinIndex;for(let i=0;i<positions.count;i++){if(indices.getX(i)!==bone)continue;p.set(positions.getX(i),positions.getY(i),positions.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[bone]);min.min(p);max.max(p);}});
        const corners:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.push(new Vector3(x,y,z));return {upper,lower,paw,corners,anchor:createPawAnchor(),up:new Vector3(0,1,0).applyQuaternion(paw.getWorldQuaternion(new Quaternion()).invert()),strong:0};
      });
      const mixer=new AnimationMixer(gltf.scene),action=mixer.clipAction(gltf.animations.find(c=>c.name==='FelineIdle')!).play();action.paused=true;
      const authored=createAuthoredPose(limbs.flatMap(l=>[l.upper,l.lower,l.paw])),probe=createPawProbe(),receipt=createGroundSettle(),normal=new Vector3(),c={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};let offset=0,pitch=0,roll=0,maxCorner=0,maxSegment=0,maxSlip=0;
      for(let frame=0;frame<240;frame++){
        sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1});sim.step(1/60);root.position.set(actor.position.x,actor.position.y-ACTOR_HEIGHT,actor.position.z);root.rotation.y=actor.yaw;
        restoreAuthoredPose(authored);mixer.update(1/60);captureAuthoredPose(authored);normal.set(0,0,0);let count=0;for(const l of limbs)if(envelopePresent(l.anchor.surface)){normal.add(l.anchor.surface.normal);count++;}
        if(count===4)normal.normalize();else normal.set(0,1,0);const blend=1-Math.exp(-profile.settle/60);pitch+=(Math.atan2(normal.z,normal.y)-pitch)*blend;roll+=(Math.atan2(normal.x,normal.y)-roll)*blend;carrier.rotation.set(pitch,Math.PI,roll);carrier.position.y=offset;root.updateWorldMatrix(true,true);resetGroundSettle(receipt);let casts=0;
        for(const l of limbs){l.paw.getWorldPosition(c.paw);casts+=probeGroundPaw(world,probe,l.anchor,l.corners,l.paw.matrixWorld,c.paw,root.position.y,def.scale,profile,frame/60,1/60,1);includeGroundSettle(receipt,l.anchor,c.paw,pawSole(l.corners,l.paw.matrixWorld,c.paw,probe.up.set(0,1,0),probe),1);}expect(casts).toBeLessThanOrEqual(20);
        const next=settleCarrier(receipt,offset,def.scale,true,4,1/60,.3+profile.settle*.01);expect(Math.abs(next-offset)).toBeLessThanOrEqual((.3+profile.settle*.01)*def.scale/60+1e-10);offset=next;carrier.position.y=offset;root.updateWorldMatrix(true,true);
        for(const l of limbs){l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);l.paw.getWorldQuaternion(c.pawRotation);const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),g=l.anchor;
          if(g.surface.valid&&g.weight>0){probe.up.copy(l.up).applyQuaternion(c.pawRotation).normalize();probe.rotation.setFromUnitVectors(probe.up,g.surface.normal);const angle=probe.rotation.angleTo(c.rotation.identity());if(angle>.26){c.rotation.copy(probe.rotation);probe.rotation.identity().slerp(c.rotation,.26/angle);}c.rotation.identity().slerp(probe.rotation,g.weight);c.pawRotation.premultiply(c.rotation);l.paw.parent!.getWorldQuaternion(c.parent).invert();l.paw.quaternion.copy(c.parent.multiply(c.pawRotation));l.paw.updateWorldMatrix(false,false);}
          const sole=pawSole(l.corners,l.paw.matrixWorld,c.paw,g.surface.normal,probe);if(g.planted&&g.surface.valid&&!g.releasing)g.position.y=g.surface.height+sole;plantedPawTarget(g,c.paw,c.hip,sole,a+b,1,1/60,def.scale,profile,c.target);clearPawObstruction(g.surface,c.paw,sole,pawSole(l.corners,l.paw.matrixWorld,c.paw,probe.up.set(0,1,0),probe),c.target);applyPawIK(l.upper,l.lower,l.paw,c);
          l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);maxSegment=Math.max(maxSegment,Math.abs(c.hip.distanceTo(c.knee)-a),Math.abs(c.knee.distanceTo(c.paw)-b));
          if(frame>120&&g.surface.valid&&g.weight>=.9&&!g.releasing){l.strong++;maxSlip=Math.max(maxSlip,Math.hypot(c.paw.x-g.position.x,c.paw.z-g.position.z));}if(!g.surface.valid)expect(g.planted&&!g.releasing&&g.weight>.9).toBe(false);
          for(const corner of l.corners){const p=corner.clone().applyMatrix4(l.paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:p.x,y:p.y+.5,z:p.z},{x:0,y:-1,z:0}),3,false,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);expect(hit).not.toBeNull();maxCorner=Math.max(maxCorner,.5-hit!.timeOfImpact);}
        }
      }
      expect(limbs.filter(l=>l.strong>=90).length,`${chassis} coastal sustained plants`).toBeGreaterThanOrEqual(2);expect(offset).toBeLessThan(-.05);expect(maxSegment).toBeLessThan(.000001);expect(maxSlip).toBeLessThan(.035);expect(maxCorner).toBeLessThan(.0001);sim.dispose();world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
  });
});
