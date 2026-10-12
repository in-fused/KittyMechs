import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationMixer,PerspectiveCamera,Vector3} from 'three';
import {loadRig250} from '../overhaul-grounded-motion-253/load-rig250';
import {prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007} from '../../src/game/camera/weightedVisualEnvelope007';
import {createPlayerOrbit280,resolvePlayerOrbit280} from './playerOrbit280';
import {usableLayout280,projection280,type Rect280} from './usablePlayfield280';
await RAPIER.init();const {model,clips}=await loadRig250('assets/source/overhaul-feline-animation-264/Pounce_Feline264.glb');model.scale.setScalar(.8);model.updateMatrixWorld(true);const envelope=prepareWeightedVisualEnvelope007(model),sample=createWeightedVisualEnvelopeSample007(envelope),mixer=new AnimationMixer(model),world=new RAPIER.World({x:0,y:0,z:0}),rows:any[]=[];
// Observed opaque panel footprint in original277 full1440x900 guest failurePNG,
// with CSS ::before -14/-16 included. Smaller desktop fixture follows same CSS.
const fixture=(w:number,h:number):Rect280[]=>[{name:'mech-status ::before',left:14,top:h-194,right:316,bottom:h-41},{name:'weapons-hud ::before',left:w-306,top:h-245,right:w-14,bottom:h-39},{name:'mission/environment',left:30,top:28,right:306,bottom:155},{name:'topright',left:w-180,top:27,right:w-28,bottom:155},{name:'controls',left:w*.28,top:h-28,right:w*.72,bottom:h-18},{name:'debug',left:20,top:155,right:345,bottom:224}];
try{
 for(const [width,height] of [[1440,900],[1024,720]]){
  const layout=usableLayout280(width,height,fixture(width,height));assert(layout.rect,'nonempty desktop usable region');
  for(const name of ['FelineWalk','FelineUprightStride']){mixer.stopAllAction();const clip=clips.find(c=>c.name===name)!;mixer.clipAction(clip).play();mixer.update(.23);model.updateMatrixWorld(true);model.traverse((o:any)=>{if(o.isSkinnedMesh)o.skeleton.update();});sampleWeightedVisualEnvelope007(envelope,sample);const focus=sample.bounds.getCenter(new Vector3());
   for(const yaw of [0,Math.PI/2,2.6])for(const pitch of [-.5,0,.55]){const camera=new PerspectiveCamera(59,width/height,.1,850),state=createPlayerOrbit280();camera.position.copy(focus).add(new Vector3(0,2,8));camera.lookAt(focus);const result=resolvePlayerOrbit280(state,{camera,world,focus,corners:sample.corners,yaw,pitch,preferred:6,dt:1/60,reset:true,generation:1,life:1,usable:layout}),p=projection280(camera,sample.corners,layout,new Vector3());rows.push({width,height,name,yaw,pitch,result:{...result},projection:p,worldBounds:{min:sample.bounds.min.toArray(),max:sample.bounds.max.toArray()}});assert.equal(result.projectedBody,true,`${width}/${name}/${yaw}/${pitch} usable projection`);assert.equal(p.blockedBy.length,0);assert(p.heightFraction>=.16&&p.areaFraction>=.015);assert(result.radius<=9,'bounded additional radius, no extreme pullback');}
  }
 }
 const layout=usableLayout280(1440,900,[{name:'full-screen modal',left:0,top:0,right:1440,bottom:900}]);assert.equal(layout.rect,null);assert.equal(projection280(new PerspectiveCamera(),sample.corners,layout,new Vector3()).pass,false);
 const blocked=new RAPIER.World({x:0,y:0,z:0});blocked.createCollider(RAPIER.ColliderDesc.cuboid(30,30,30));const camera=new PerspectiveCamera(59,1440/900,.1,850),focus=sample.bounds.getCenter(new Vector3());camera.position.set(1,2,4);const before=camera.position.clone(),result=resolvePlayerOrbit280(createPlayerOrbit280(),{camera,world:blocked,focus,corners:sample.corners,yaw:0,pitch:0,preferred:6,dt:1/60,reset:true,generation:4,life:2,usable:usableLayout280(1440,900,fixture(1440,900))});assert.equal(camera.position.distanceTo(before),0,'native obstructed sphere/path does not move camera');assert.equal(result.nativeEmpty,false);blocked.free();
 await writeFile('tools/overhaul-player-camera-280/geometry280.json',JSON.stringify({writer:'CLOSED',status:'SCOPED_CPU_GEOMETRY_PASS',rows,fixtureProvenance:'Saved277 failure-guest PNG opaque HUD footprints plus retained CSS; DOM cached layout/browser pixels UNRUN',sourceGeometry:'Actual264 numerical fixture and weighted complete envelope at .8 scale; not actualGLTFLoader or runtime composer',modalRejected:true,nativeObstructionPreserved:true,contactQualified:false,qualityApproved:false},null,2));
 console.log(JSON.stringify({status:'SCOPED_CPU_GEOMETRY_PASS',cases:rows.length,maxRadius:Math.max(...rows.map(r=>r.result.radius)),minimumArea:Math.min(...rows.map(r=>r.projection.areaFraction))}));
}finally{world.free();mixer.stopAllAction();mixer.uncacheRoot(model);}
