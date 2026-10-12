import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { AnimationMixer, Bone, Group, Matrix4, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import { MECHS } from '../shared/config';
import { applyPawIK, clearPawAnchor, clearPawObstruction, createGroundSettle, createPawAnchor, createPawProbe, groundContactAllowed, includeGroundSettle, PAW_PROFILES, pawFootprint, pawReadyForCrouch, pawSole, plantedPawTarget, probeGroundPaw, resetGroundSettle, sampleStaticPaw, settleCarrier, surfacePresent } from '../src/game/entities/pawContact';

beforeAll(async()=>{await RAPIER.init();});
const corners=()=>{const result:Vector3[]=[];for(const x of [-.12,.12])for(const y of [-.1,.1])for(const z of [-.22,.22])result.push(new Vector3(x,y,z));return result;};
const setup=()=>{const world=new RAPIER.World({x:0,y:-9.8,z:0}),probe=createPawProbe(),anchor=createPawAnchor();pawFootprint(corners(),new Matrix4(),new Vector3(),probe);return {world,probe,anchor};};
const box=(world:RAPIER.World,x:number,y:number,z:number,hx:number,hy:number,hz:number)=>world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z));
describe('static feline paw contact',()=>{
  it('samples actual ground, roofs and bounded steps without catching an overhead deck',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,4,.1,4);box(world,0,5.9,0,2,.1,2);box(world,2,.05,0,.4,.05,.4);world.step();
    sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);expect(anchor.surface.valid).toBe(true);expect(anchor.surface.height).toBeCloseTo(0);expect(anchor.surface.casts).toBe(5);
    sampleStaticPaw(world,probe,anchor.surface,0,0,6,1);expect(anchor.surface.height).toBeCloseTo(6);
    sampleStaticPaw(world,probe,anchor.surface,2,0,0,1);expect(anchor.surface.valid).toBe(true);expect(anchor.surface.height).toBeCloseTo(.1);
    sampleStaticPaw(world,probe,anchor.surface,0,0,3,1);expect(anchor.surface.valid).toBe(false);world.free();
  });
  it('rejects unsupported corners, discontinuities and an underside within ray range',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,.16,.1,.25);world.step();
    sampleStaticPaw(world,probe,anchor.surface,.1,0,0,1);expect(anchor.surface.valid).toBe(false);
    box(world,2,.2,0,1,.05,1);world.step();sampleStaticPaw(world,probe,anchor.surface,2,0,0,1);expect(anchor.surface.valid).toBe(false);world.free();
  });
  it('filters sensors, other actors, dynamic objects and disabled support',()=>{
    const {world,probe,anchor}=setup(),floor=box(world,0,-.1,0,4,.1,4);world.createCollider(RAPIER.ColliderDesc.cuboid(1,.05,1).setTranslation(0,.15,0).setSensor(true));
    for(const desc of [RAPIER.RigidBodyDesc.dynamic(),RAPIER.RigidBodyDesc.kinematicPositionBased()]){const body=world.createRigidBody(desc.setTranslation(0,.2,0));world.createCollider(RAPIER.ColliderDesc.cuboid(1,.05,1),body);}world.step();
    sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);expect(anchor.surface.valid).toBe(true);expect(anchor.surface.colliders[0]).toBe(floor);
    floor.setEnabled(false);expect(surfacePresent(anchor.surface)).toBe(false);world.free();
  });
  it('invalidates destroyed and unloaded stationary anchors before the next probe',()=>{
    const {world,probe,anchor}=setup(),floor=box(world,0,-.1,0,4,.1,4);world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);expect(surfacePresent(anchor.surface)).toBe(true);
    world.removeCollider(floor,true);expect(surfacePresent(anchor.surface)).toBe(false);world.free();
  });
  it('rejects a five-centimeter half-paw step and measures final sole corners without clipping',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,4,.1,4);box(world,.5,.025,0,.44,.025,.8);world.step();
    const root=new Group(),upper=new Bone(),lower=new Bone(),paw=new Bone();root.add(upper);upper.add(lower);lower.add(paw);root.position.y=.05;upper.position.y=.9;lower.position.set(.25,-.4,0);paw.position.set(-.25,-.4,0);root.updateWorldMatrix(true,true);const shape=corners();
    const c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())};
    pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,c.paw.x,c.paw.z,.05,1);expect(anchor.surface.valid).toBe(false);
    // Include a previously planted lower-plane anchor, not only fresh admission.
    anchor.planted=true;anchor.weight=1;anchor.position.set(0,.104,0);
    const sole=pawSole(shape,paw.matrixWorld,c.paw,anchor.surface.normal,probe),reach=c.hip.distanceTo(c.knee)+c.knee.distanceTo(c.paw);
    plantedPawTarget(anchor,c.paw,c.hip,sole,reach,1,1/60,1,PAW_PROFILES.pounce,c.target);expect(anchor.releasing).toBe(true);expect(c.target.y).toBeCloseTo(c.paw.y,8);applyPawIK(upper,lower,paw,c);root.updateWorldMatrix(true,true);
    for(const p of shape.filter(v=>v.y<0)){const actual=p.clone().applyMatrix4(paw.matrixWorld),ray=new RAPIER.Ray({x:actual.x,y:.2,z:actual.z},{x:0,y:-1,z:0}),hit=world.castRay(ray,1,false);expect(hit).not.toBeNull();expect(.2-hit!.timeOfImpact-actual.y).toBeLessThan(.00001);}world.free();
  });
  it('retains sloped support normals, while rejecting steep faces',()=>{
    for(const angle of [.2,1]){const {world,probe,anchor}=setup();const q=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),angle);world.createCollider(RAPIER.ColliderDesc.cuboid(3,.1,3).setTranslation(0,-.1/Math.cos(angle),0).setRotation(q));world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);
      expect(anchor.surface.valid).toBe(angle===.2);if(anchor.surface.valid)expect(anchor.surface.normal.x).toBeCloseTo(-Math.sin(angle),4);world.free();}
  });
  it('holds world anchors and fades turns/reversals fully before replanting',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,4,.1,4);world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);
    const paw=new Vector3(0,.1,0),hip=new Vector3(0,.8,0),out=new Vector3();for(let i=0;i<10;i++)plantedPawTarget(anchor,paw,hip,.1,1,1,1/60,1,PAW_PROFILES.pounce,out);
    expect(anchor.weight).toBe(1);paw.x=.1;plantedPawTarget(anchor,paw,hip,.1,1,1,1/60,1,PAW_PROFILES.pounce,out);expect(out.x).toBeCloseTo(0);
    paw.x=.5;plantedPawTarget(anchor,paw,hip,.1,1,1,1/60,1,PAW_PROFILES.pounce,out);expect(anchor.releasing).toBe(true);expect(anchor.position.x).toBe(0);expect(anchor.weight).toBeGreaterThan(.8);
    for(let i=0;i<8;i++)plantedPawTarget(anchor,paw,hip,.1,1,1,1/60,1,PAW_PROFILES.pounce,out);expect(anchor.planted).toBe(false);expect(anchor.weight).toBe(0);world.free();
  });
  it('suppresses the entire form, air, death, climb and retraction windows',()=>{
    const allowed=(time=2,stance=-100,detach=-100,alive=true,grounded=true,climbing=false,weight=0)=>groundContactAllowed(alive,grounded,climbing,weight,time,stance,.7,detach,.3);
    expect(allowed()).toBe(true);for(const time of [0,.1,.699])expect(allowed(time,0)).toBe(false);for(const time of [0,.1,.299])expect(allowed(time,-100,0)).toBe(false);
    expect(allowed(2,-100,-100,false)).toBe(false);expect(allowed(2,-100,-100,true,false)).toBe(false);expect(allowed(2,-100,-100,true,true,true)).toBe(false);expect(allowed(2,-100,-100,true,true,false,.2)).toBe(false);
    const anchor=createPawAnchor();anchor.weight=1;anchor.planted=true;clearPawAnchor(anchor);expect(anchor.weight).toBe(0);expect(anchor.surface.valid).toBe(false);
  });
  it('permits carrier lowering only after reacquired full support and before any swing/replant',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,4,.1,4);world.step();sampleStaticPaw(world,probe,anchor.surface,0,0,0,1);const paw=new Vector3(0,.104,0),hip=new Vector3(0,.8,0),target=new Vector3();
    expect(pawReadyForCrouch(anchor,1)).toBe(false);plantedPawTarget(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce,target);expect(pawReadyForCrouch(anchor,1)).toBe(false);
    for(let i=0;i<5;i++)plantedPawTarget(anchor,paw,hip,.104,1,1,1/60,1,PAW_PROFILES.pounce,target);expect(pawReadyForCrouch(anchor,1)).toBe(true);expect(pawReadyForCrouch(anchor,.9)).toBe(false);anchor.releasing=true;expect(pawReadyForCrouch(anchor,1)).toBe(false);clearPawAnchor(anchor);expect(pawReadyForCrouch(anchor,1)).toBe(false);world.free();
  });
  it('bounds slope settling by complete sole clearance and resets it on missing support or air',()=>{
    const receipt=createGroundSettle();receipt.count=4;receipt.supports=2;receipt.clearance=.1;expect(settleCarrier(receipt,0,1,true,4,1/60,.5)).toBeCloseTo(-.5/60);
    expect(settleCarrier(receipt,0,1,false,4,1/60,.5)).toBe(0);receipt.valid=false;expect(settleCarrier(receipt,-.1,1,true,4,1/60,.5)).toBeCloseTo(-.1+.5/60);receipt.valid=true;receipt.clearance=-.02;expect(settleCarrier(receipt,-.1,1,true,4,1/60,.5)).toBeCloseTo(-.1+.5/60);receipt.clearance=5;expect(settleCarrier(receipt,-.18,1,true,4,1/60,.5)).toBe(-.18);receipt.count=3;expect(settleCarrier(receipt,-.1,1,true,4,1/60,.5)).toBeCloseTo(-.1+.5/60);
  });
  it('releases an invalid carrier receipt continuously while rigid paws clear a newly raised corner',()=>{
    const {world,probe,anchor}=setup();box(world,0,-.1,0,4,.1,4);world.step();const root=new Group(),carrier=new Group(),upper=new Bone(),lower=new Bone(),paw=new Bone();root.position.y=.14;root.add(carrier);carrier.add(upper);upper.add(lower);lower.add(paw);upper.position.y=.9;lower.position.set(.25,-.4,0);paw.position.set(-.25,-.4,0);carrier.position.y=-.14;root.updateWorldMatrix(true,true);const shape=corners(),receipt=createGroundSettle();receipt.count=4;receipt.supports=3;receipt.valid=false;anchor.planted=true;anchor.weight=1;anchor.position.set(0,.104,0);box(world,.5,.025,0,.44,.025,.8);world.step();let offset=-.14;
    for(let frame=0;frame<20;frame++){const next=settleCarrier(receipt,offset,1,true,4,1/60,.5);expect(Math.abs(next-offset)).toBeLessThan(.008334);offset=next;carrier.position.y=offset;upper.quaternion.identity();lower.quaternion.identity();paw.quaternion.identity();root.updateWorldMatrix(true,true);
      const c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,0,0,.14,1);expect(anchor.surface.valid).toBe(false);const sole=pawSole(shape,paw.matrixWorld,c.paw,new Vector3(0,1,0),probe);plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,1,1/60,1,PAW_PROFILES.pounce,c.target);clearPawObstruction(anchor.surface,c.paw,sole,sole,c.target);applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,9);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,9);
      for(const point of shape.filter(v=>v.y<0)){const actual=point.clone().applyMatrix4(paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:actual.x,y:.5,z:actual.z},{x:0,y:-1,z:0}),1,false);expect(hit).not.toBeNull();expect(.5-hit!.timeOfImpact-actual.y).toBeLessThan(.00001);}
    }expect(offset).toBe(0);expect(anchor.planted).toBe(false);world.free();
  });
  it('refreshes the actual uphill footprint before an almost-faded shipping paw releases its stale ceiling',async()=>{
    const def=MECHS.caracal,profile=PAW_PROFILES.caracal,bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
    const root=new Group(),carrier=new Group();root.add(carrier);carrier.add(gltf.scene);carrier.scale.setScalar(def.scale);carrier.rotation.y=Math.PI;
    const mixer=new AnimationMixer(gltf.scene),action=mixer.clipAction(gltf.animations.find(c=>c.name==='FelineTurnLeft')!);action.play();action.paused=true;action.time=.6*action.getClip().duration;mixer.update(0);root.updateWorldMatrix(true,true);
    const upper=gltf.scene.getObjectByName('FR_upper') as Bone,lower=gltf.scene.getObjectByName('FR_lower') as Bone,paw=gltf.scene.getObjectByName('FR_paw') as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),point=new Vector3();
    gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const b=o.skeleton.bones.indexOf(paw);if(b<0)return;const positions=o.geometry.attributes.position,indices=o.geometry.attributes.skinIndex;
      for(let i=0;i<positions.count;i++){if(indices.getX(i)!==b)continue;point.set(positions.getX(i),positions.getY(i),positions.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[b]);min.min(point);max.max(point);}});
    const shape:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])shape.push(new Vector3(x,y,z));
    const probe=createPawProbe(),normal=new Vector3(-.07,1,0).normalize(),world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1/normal.y,0).setRotation(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),normal)));world.step();
    paw.getWorldPosition(point);const vertical=pawSole(shape,paw.matrixWorld,point,new Vector3(0,1,0),probe);root.position.set(.6-point.x,vertical+.025-point.y,-point.z);root.updateWorldMatrix(true,true);
    const rest=[upper.quaternion.clone(),lower.quaternion.clone(),paw.quaternion.clone()];
    const measure=(fresh:boolean)=>{
      upper.quaternion.copy(rest[0]);lower.quaternion.copy(rest[1]);paw.quaternion.copy(rest[2]);root.updateWorldMatrix(true,true);
      const c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),anchor=createPawAnchor();
      pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,0,0,root.position.y,def.scale,profile);expect(anchor.surface.valid).toBe(true);
      anchor.position.set(0,anchor.surface.height+vertical,0);anchor.planted=true;anchor.releasing=true;anchor.weight=.0445;anchor.nextProbe=10;
      const oldCeiling=anchor.surface.ceiling;
      if(fresh){expect(probeGroundPaw(world,probe,anchor,shape,paw.matrixWorld,c.paw,root.position.y,def.scale,profile,1,1/60,0)).toBe(5);expect(anchor.surface.ceiling-oldCeiling).toBeCloseTo(.042,5);}
      const sole=pawSole(shape,paw.matrixWorld,c.paw,anchor.surface.normal,probe);plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,0,1/60,def.scale,profile,c.target);
      expect(anchor.weight).toBe(0);expect(anchor.surface.valid).toBe(false);clearPawObstruction(anchor.surface,c.paw,sole,vertical,c.target);applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);
      expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,6);expect(c.knee.distanceTo(paw.getWorldPosition(c.paw))).toBeCloseTo(b,6);
      let penetration=0;for(const corner of shape){const actual=corner.clone().applyMatrix4(paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:actual.x,y:actual.y+.5,z:actual.z},{x:0,y:-1,z:0}),1,false);expect(hit).not.toBeNull();penetration=Math.max(penetration,.5-hit!.timeOfImpact);}
      return penetration;
    };
    expect(measure(false)).toBeGreaterThan(.02);expect(measure(true)).toBeLessThan(.00001);
    // A regular held anchor still waits for the scheduled probe; the fix does
    // not turn all planted contact into per-frame queries.
    const held=createPawAnchor();paw.getWorldPosition(point);held.position.copy(point);pawFootprint(shape,paw.matrixWorld,point,probe);sampleStaticPaw(world,probe,held.surface,point.x,point.z,root.position.y,def.scale,profile);expect(held.surface.valid).toBe(true);held.planted=true;held.weight=1;held.nextProbe=10;
    expect(probeGroundPaw(world,probe,held,shape,paw.matrixWorld,paw.getWorldPosition(point),root.position.y,def.scale,profile,1,1/60,1)).toBe(0);
    world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  });
  it('measures actual post-IK drift and sole clearance while preserving bone lengths',()=>{
    const group=new Group(),upper=new Bone(),lower=new Bone(),paw=new Bone();group.add(upper);upper.add(lower);lower.add(paw);upper.position.y=.9;lower.position.set(.25,-.4,0);paw.position.set(-.25,-.4,0);group.updateWorldMatrix(true,true);
    const c={hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()},probe=createPawProbe(),shape=corners(),normal=new Vector3(0,1,0);let maxSlip=0,maxSole=0;
    for(let i=0;i<240;i++){upper.quaternion.identity();lower.quaternion.identity();paw.quaternion.identity();group.position.x=Math.sin(i*.02)*.15;group.position.y=-Math.abs(Math.sin(i*.03))*.12;group.rotation.y=i*.005;group.updateWorldMatrix(true,true);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);paw.getWorldQuaternion(c.pawRotation);const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);c.target.set(0,.104,0);applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);
      expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,9);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,9);maxSlip=Math.max(maxSlip,Math.hypot(c.paw.x,c.paw.z));maxSole=Math.max(maxSole,Math.abs(c.paw.y-pawSole(shape,paw.matrixWorld,c.paw,normal,probe)));}
    expect(maxSlip).toBeLessThan(1e-8);expect(maxSole).toBeLessThan(1e-8);
  });
  it('keeps actual shipping paws finite, planted and fixed-length across seven rigs',async()=>{
    const files=[...Object.values(MECHS).map(m=>[m.model,m.scale] as const),['Sentinel_Scout',.65],['Sentinel_Mortar',.8],['Sentinel_Anchor',1.05]] as const;
    let cases=0,maxDrift=0,maxSoleError=0;
    for(const [file,scale] of files){const bytes=readFileSync(`public/assets/models/${file}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');const group=new Group();group.scale.setScalar(scale);group.add(gltf.scene);const mixer=new AnimationMixer(gltf.scene),probe=createPawProbe(),world=new RAPIER.World({x:0,y:-9.8,z:0});box(world,0,-.1,0,10,.1,10);world.step();let idlePlants=0;
      for(const clipName of ['FelineIdle','FelineWalk','FelineTrot','FelineGallop']){mixer.stopAllAction();const action=mixer.clipAction(gltf.animations.find(c=>c.name===clipName)!);action.play();
        for(const t of [.1,.35,.6]){mixer.setTime(t*action.getClip().duration);group.updateWorldMatrix(true,true);
          for(const prefix of ['FL','FR','HL','HR']){const upper=gltf.scene.getObjectByName(`${prefix}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${prefix}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${prefix}_paw`) as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),p=new Vector3();
            gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const bone=o.skeleton.bones.indexOf(paw);if(bone<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;for(let v=0;v<pos.count;v++){if(idx.getX(v)!==bone)continue;p.set(pos.getX(v),pos.getY(v),pos.getZ(v)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[bone]);min.min(p);max.max(p);}});
            const bounds:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])bounds.push(new Vector3(x,y,z));
            const c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())};const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),sole=pawSole(bounds,paw.matrixWorld,c.paw,new Vector3(0,1,0),probe);
            if(clipName==='FelineIdle'){
              const anchor=createPawAnchor();pawFootprint(bounds,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,c.paw.x,c.paw.z,0,scale);
              for(let n=0;n<10;n++)plantedPawTarget(anchor,c.paw,c.hip,sole,a+b,1,1/60,scale,PAW_PROFILES.pounce,c.target);
              if(anchor.planted&&anchor.weight>.99)idlePlants++;
            }
            // Preserve authored swing height: probe a nearby supported plane,
            // not an impossible command to pull every lifted paw to the floor.
            c.target.copy(c.paw);c.target.y-=.015*scale;const plane=c.target.y-sole,expected=c.target.clone(),reachable=c.hip.distanceTo(c.target)<(a+b)*.98;applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);
            expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,6);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,6);expect(c.paw.toArray().every(Number.isFinite)).toBe(true);
            if(reachable){maxDrift=Math.max(maxDrift,c.paw.distanceTo(expected));maxSoleError=Math.max(maxSoleError,Math.abs(c.paw.y-pawSole(bounds,paw.matrixWorld,c.paw,new Vector3(0,1,0),probe)-plane));}else expect(c.paw.distanceTo(expected)).toBeLessThan(.016);cases++;
          }
        }
      }expect(idlePlants,`${file} real-floor support`).toBeGreaterThanOrEqual(6);world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
    expect(cases).toBe(336);expect(maxDrift).toBeLessThan(.00001);expect(maxSoleError).toBeLessThan(.00001);
  });
  it('acquires real sloped support for all four shipping chassis despite KCC floor lift',async()=>{
    const normal=new Vector3(-.04,1,-.06).normalize();
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){const def=MECHS[chassis],profile=PAW_PROFILES[chassis],bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');
      const root=new Group(),carrier=new Group();root.position.y=.105;root.add(carrier);carrier.add(gltf.scene);carrier.scale.setScalar(def.scale);carrier.rotation.set(Math.atan2(normal.z,normal.y),Math.PI,Math.atan2(normal.x,normal.y));root.updateWorldMatrix(true,true);
      const limbs=['FL','FR','HL','HR'].map(prefix=>{const upper=gltf.scene.getObjectByName(`${prefix}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${prefix}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${prefix}_paw`) as Bone,min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),p=new Vector3();gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const b=o.skeleton.bones.indexOf(paw);if(b<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;for(let i=0;i<pos.count;i++){if(idx.getX(i)!==b)continue;p.set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[b]);min.min(p);max.max(p);}});const shape:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])shape.push(new Vector3(x,y,z));return {upper,lower,paw,shape,anchor:createPawAnchor(),rest:[upper.quaternion.clone(),lower.quaternion.clone(),paw.quaternion.clone()]};});
      const world=new RAPIER.World({x:0,y:-9.8,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1/normal.y,0).setRotation(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),normal)));world.step();const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='FelineIdle')!).play();const probe=createPawProbe(),receipt=createGroundSettle();let offset=0;
      for(let frame=0;frame<120;frame++){for(const l of limbs){l.upper.quaternion.copy(l.rest[0]);l.lower.quaternion.copy(l.rest[1]);l.paw.quaternion.copy(l.rest[2]);}mixer.setTime(frame/60);carrier.position.y=offset;root.updateWorldMatrix(true,true);resetGroundSettle(receipt);
        for(const limb of limbs){const p=limb.paw.getWorldPosition(new Vector3());pawFootprint(limb.shape,limb.paw.matrixWorld,p,probe);sampleStaticPaw(world,probe,limb.anchor.surface,limb.anchor.planted?limb.anchor.position.x:p.x,limb.anchor.planted?limb.anchor.position.z:p.z,.105,def.scale,profile);includeGroundSettle(receipt,limb.anchor,p,pawSole(limb.shape,limb.paw.matrixWorld,p,probe.up.set(0,1,0),probe),1);}
        offset=settleCarrier(receipt,offset,def.scale,true,4,1/60,.3+profile.settle*.01);carrier.position.y=offset;root.updateWorldMatrix(true,true);
        for(const limb of limbs){const c={hip:limb.upper.getWorldPosition(new Vector3()),knee:limb.lower.getWorldPosition(new Vector3()),paw:limb.paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:limb.paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),sole=pawSole(limb.shape,limb.paw.matrixWorld,c.paw,normal,probe);if(limb.anchor.planted&&!limb.anchor.releasing)limb.anchor.position.y=limb.anchor.surface.height+sole;plantedPawTarget(limb.anchor,c.paw,c.hip,sole,a+b,1,1/60,def.scale,profile,c.target);applyPawIK(limb.upper,limb.lower,limb.paw,c);limb.upper.getWorldPosition(c.hip);limb.lower.getWorldPosition(c.knee);limb.paw.getWorldPosition(c.paw);expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,6);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,6);
          for(const point of limb.shape){const actual=point.clone().applyMatrix4(limb.paw.matrixWorld),ray=new RAPIER.Ray({x:actual.x,y:actual.y+.5,z:actual.z},{x:0,y:-1,z:0}),hit=world.castRay(ray,1,false);expect(hit).not.toBeNull();expect(.5-hit!.timeOfImpact).toBeLessThan(.00001);}
        }
      }
      expect(offset,chassis).toBeLessThan(-.025);expect(limbs.filter(l=>l.anchor.weight>.99&&!l.anchor.releasing).length,chassis).toBeGreaterThanOrEqual(3);world.free();mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
  });
  it('clears a newly raised half-step through continuous release for all sixteen shipping player paws',async()=>{
    for(const chassis of ['pounce','bastion','lynx','caracal'] as const){const def=MECHS[chassis],bytes=readFileSync(`public/assets/models/${def.model}.glb`),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');const root=new Group(),carrier=new Group();root.add(carrier);carrier.add(gltf.scene);carrier.scale.setScalar(def.scale);carrier.rotation.y=Math.PI;root.updateWorldMatrix(true,true);
      for(const prefix of ['FL','FR','HL','HR']){const upper=gltf.scene.getObjectByName(`${prefix}_upper`) as Bone,lower=gltf.scene.getObjectByName(`${prefix}_lower`) as Bone,paw=gltf.scene.getObjectByName(`${prefix}_paw`) as Bone,rest=[upper.quaternion.clone(),lower.quaternion.clone(),paw.quaternion.clone()],min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),p=new Vector3();gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const b=o.skeleton.bones.indexOf(paw);if(b<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex;for(let i=0;i<pos.count;i++){if(idx.getX(i)!==b)continue;p.set(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[b]);min.min(p);max.max(p);}});const shape:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])shape.push(new Vector3(x,y,z));const probe=createPawProbe(),anchor=createPawAnchor(),receipt=createGroundSettle(),world=new RAPIER.World({x:0,y:-9.8,z:0});box(world,0,-.1,0,10,.1,10);
        root.position.y=0;carrier.position.y=0;root.updateWorldMatrix(true,true);paw.getWorldPosition(p);const sole=pawSole(shape,paw.matrixWorld,p,new Vector3(0,1,0),probe);let offset=-.12*def.scale;root.position.y=-offset-p.y+sole;carrier.position.y=offset;root.updateWorldMatrix(true,true);paw.getWorldPosition(p);box(world,p.x+.31,.025,p.z,.3,.025,1);world.step();receipt.count=4;receipt.supports=3;receipt.valid=false;const rate=.3+PAW_PROFILES[chassis].settle*.01;
        for(let frame=0;frame<30;frame++){const next=settleCarrier(receipt,offset,def.scale,true,4,1/60,rate);expect(Math.abs(next-offset)).toBeLessThanOrEqual(rate*def.scale/60+1e-10);offset=next;carrier.position.y=offset;upper.quaternion.copy(rest[0]);lower.quaternion.copy(rest[1]);paw.quaternion.copy(rest[2]);root.updateWorldMatrix(true,true);const c={hip:upper.getWorldPosition(new Vector3()),knee:lower.getWorldPosition(new Vector3()),paw:paw.getWorldPosition(new Vector3()),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:paw.getWorldQuaternion(new Quaternion())},a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);pawFootprint(shape,paw.matrixWorld,c.paw,probe);sampleStaticPaw(world,probe,anchor.surface,c.paw.x,c.paw.z,root.position.y,def.scale,PAW_PROFILES[chassis]);expect(anchor.surface.valid).toBe(false);const verticalSole=pawSole(shape,paw.matrixWorld,c.paw,new Vector3(0,1,0),probe);c.target.copy(c.paw);clearPawObstruction(anchor.surface,c.paw,verticalSole,verticalSole,c.target);applyPawIK(upper,lower,paw,c);upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);expect(c.hip.distanceTo(c.knee)).toBeCloseTo(a,6);expect(c.knee.distanceTo(c.paw)).toBeCloseTo(b,6);
          for(const corner of shape){const actual=corner.clone().applyMatrix4(paw.matrixWorld),hit=world.castRay(new RAPIER.Ray({x:actual.x,y:actual.y+.5,z:actual.z},{x:0,y:-1,z:0}),1,false);expect(hit).not.toBeNull();expect(.5-hit!.timeOfImpact,`${chassis}/${prefix} frame${frame}`).toBeLessThan(.00001);}
        }expect(offset).toBe(0);world.free();upper.quaternion.copy(rest[0]);lower.quaternion.copy(rest[1]);paw.quaternion.copy(rest[2]);
      }
    }
  });
});
