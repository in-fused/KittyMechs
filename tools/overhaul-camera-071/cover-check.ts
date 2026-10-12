import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationMixer,PerspectiveCamera,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {prepareVisualEnvelope,createVisualEnvelopeSample,sampleVisualEnvelope} from '../../src/game/camera/visualEnvelope';
import {cameraContainsVisual} from '../../src/game/camera/framing';
import {cameraClearance} from '../../src/game/camera/clearance';
import {createObstructionOrbit071,resolveObstructionOrbit071} from '../../src/game/camera/obstructionOrbit071';
// Prepared, UNRUN. Root enforces an inclusive 10s process bound. Actual retained
// shipping geometry + native cover fixture; not reconstruction of069's district.
const result:Record<string,unknown>={status:'PENDING',scope:'Actual058E upright geometry, real Rapier bounded cover; not live069 reproduction or skin visibility qualification'};
let world:RAPIER.World|undefined;
try{
 const bytes=readFileSync('assets/source/overhaul-pounce-gait-058e/Pounce_Gait058E.glb');assert.equal(createHash('sha256').update(bytes).digest('hex'),'381f13348fa5a10b67c23be01844de50e89802738cb8ab13282267685644e7f9');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()),binAt=20+bytes.readUInt32LE(12);json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(binAt+8,binAt+8+bytes.readUInt32LE(binAt)).toString('base64');delete json.images;delete json.textures;delete json.materials;for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
 globalThis.ProgressEvent??=class extends Event{constructor(type:string){super(type);}} as typeof ProgressEvent;
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');const scene=gltf.scene;scene.scale.setScalar(.8);scene.rotation.y=Math.PI;scene.updateMatrixWorld(true);
 const binds:string[]=[];scene.traverse(o=>{if(o instanceof SkinnedMesh)binds.push(JSON.stringify([o.bindMatrix.elements,o.skeleton.boneInverses.map(m=>m.elements)]));});
 const envelope=prepareVisualEnvelope(scene),sample=createVisualEnvelopeSample(envelope),clip=gltf.animations.find(a=>a.name==='FelineUprightWalkLong');assert(clip);const mixer=new AnimationMixer(scene);mixer.clipAction(clip).play();mixer.setTime(.01666666753590107);scene.updateMatrixWorld(true);sampleVisualEnvelope(envelope,sample);
 const focus=sample.bounds.getCenter(new Vector3()),height=sample.bounds.max.y-sample.bounds.min.y,desired=focus.clone().add(new Vector3(0,height*.55,Math.max(7,height*2))),camera=new PerspectiveCamera(59,1.6,.1,850);camera.position.copy(desired);camera.lookAt(focus);assert(cameraContainsVisual(camera,sample.corners,new Vector3()),'UNOBSTRUCTED_ACTUAL_BODY_FIT');
 const anchors=['head','FL_upper','FR_upper'].map(n=>{const bone=scene.getObjectByName(n);assert(bone);return bone.getWorldPosition(new Vector3());});
 await RAPIER.init();world=new RAPIER.World({x:0,y:0,z:0});const wall=world.createCollider(RAPIER.ColliderDesc.cuboid(.8,height, .25).setTranslation(focus.x,focus.y,focus.z+2));world.step();const ball=new RAPIER.Ball(.245),rotation={x:0,y:0,z:0,w:1};
 const safe=cameraClearance(world,focus,desired);camera.position.set(safe.x,safe.y,safe.z);camera.lookAt(focus);assert(!cameraContainsVisual(camera,sample.corners,new Vector3()),'NATIVE_COVER_REPRO_COMPRESSES_BODY_VIEW');
 const state=createObstructionOrbit071(),rows:any[]=[];let normal=false;const dt=1/60;
 for(let frame=0;frame<300;frame++){
  if(frame===120){world.removeCollider(wall,true);world.step();normal=true;}
  const prior=camera.position.clone();if(normal){camera.position.lerp(desired,.2);camera.lookAt(focus);}
  const out=resolveObstructionOrbit071(state,{camera,focus,desired,corners:sample.corners,anchors,normalAdmitted:normal,dt,reset:frame===0,generation:1,life:1,height,
   clearance:(from,to)=>cameraClearance(world!,from,to),nativeEmpty:at=>!world!.intersectionWithShape(at,rotation,ball,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC),nativeSight:(from,to)=>{const delta=to.clone().sub(from),length=delta.length();return length>.01&&!world!.castRay(new RAPIER.Ray(from,delta.multiplyScalar(1/length)),length-.01,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);}});
  assert(!world.intersectionWithShape(camera.position,rotation,ball,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC),'EYE_INSIDE_NATIVE_COVER');assert(out.candidates<=10);assert(camera.position.distanceTo(prior)<=14*dt+.001||!out.active,'BOUNDED_ACTIVE_EYE_SPEED');
  if(frame===119){assert(out.contained&&!out.constrained,'FEASIBLE_OBSTRUCTION_VIEW_MUST_RECOVER_BODY');rows.push({phase:'obstructed',...out,position:camera.position.toArray()});}
  if(frame===299){assert(!out.active,'CLEAR_VIEW_HYSTERESIS_RETURN');rows.push({phase:'returned',...out,position:camera.position.toArray()});}
 }
 const after:string[]=[];scene.traverse(o=>{if(o instanceof SkinnedMesh)after.push(JSON.stringify([o.bindMatrix.elements,o.skeleton.boneInverses.map(m=>m.elements)]));});assert.deepEqual(after,binds,'CAMERA_MUST_PRESERVE_SOURCE_BINDS');Object.assign(result,{status:'PASS_REVIEW_REQUIRED',rows,geometryVertices:envelope.vertexCount,geometryCorners:sample.corners.length});
}catch(error){Object.assign(result,{status:'FIRST_FAILURE_STOP',error:String(error)});process.exitCode=1;}
finally{world?.free();writeFileSync('tools/overhaul-camera-071/cover-result.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));}
