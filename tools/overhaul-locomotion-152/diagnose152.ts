import {writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationMixer,AnimationUtils,Group,Vector3} from 'three';
import manifest from '../../src/game/entities/identity57Runtime121Manifest.json';
import {loadRig143} from '../overhaul-locomotion-143/load-rig143';
import {LocomotionTasks143,offGaits143,selectedGaits143,solveBodyLoad143} from './candidate-locomotionTasks143';
import {selectedFootfalls123,type AuthoredGait123} from '../../src/game/entities/authoredFootfalls123';
import {createGroundSupport067} from '../../src/game/entities/groundSupport067';
import {angleLerp} from '../../shared/math';
import {OwnedCharacterMotion} from '../../shared/ownedCharacterMotion';

await RAPIER.init();
const evidence:unknown[]=[];
for(const rig of ['OFF25','ON57'] as const){
 const path=rig==='OFF25'?'public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb':'public'+manifest.publicURL;
 const {model,clips:raw}=await loadRig143(path),native=new Group(),mount=new Group();native.add(mount);mount.add(model);mount.rotation.y=Math.PI;mount.scale.setScalar(.8);
 const catalog:Record<string,{measuredGait?:AuthoredGait123;duration?:number}>=rig==='OFF25'?offGaits143(raw,.8):manifest.clips;
 const clips=raw.map(c=>{if(c.name!=='FelineTransitionArc106')return c;const a=c.clone();AnimationUtils.makeClipAdditive(a,manifest.clips.FelineTransitionBase106.sampleInterval.start*60,raw.find(x=>x.name==='FelineTransitionBase106')!,60);return a;});
 const mixer=new AnimationMixer(model),actions=new Map(clips.map(c=>{const a=mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);return[c.name,a] as const;}));
 const world=new RAPIER.World({x:0,y:0,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(0,-.1,0));
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,0));
 const collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(1.3-.12,1.75-.12,.12).setTranslation(0,.3,0).setFriction(.1),body),motion=new OwnedCharacterMotion(RAPIER,()=>[{id:'147-fixture',life:1,body,collider}]);
 const controller=world.createCharacterController(.02),owner=new LocomotionTasks143(model,createGroundSupport067(world,RAPIER,()=>0),clips,rig==='OFF25'?.98:1);
 let phase=0,vz=0,yaw=0,lastZ=0;const dt=1/60;
 const o=owner as any,originalClear=o.clear.bind(o);let failedSnapshot:unknown=null;
 // Fixture-only instrumentation preserves the exact private requests before
 // the rejected152 owner clears them. It does not alter production admission.
 o.clear=()=>{if(owner.diagnostic.firstFailure143&&!failedSnapshot){failedSnapshot={rootPosition:native.position.toArray(),rootYaw:yaw,body:structuredClone(owner.diagnostic.bodyTask143),feet:o.feet.map((f:any)=>{const target=f.hit?.point??f.task,r=o.request(f,target,f.hit?.normal??new Vector3(0,1,0),!!f.hit);return {limb:f.name,policy:f.policy,source:f.source.toArray(),task:f.task.toArray(),anchor:f.hit?.point.toArray()??null,support:f.hit?.lease??null,hip:r.hip.toArray(),end:r.end.toArray(),minimum:r.minimum,maximum:r.maximum,horizontalSquared:(r.hip.x-r.end.x)**2+(r.hip.z-r.end.z)**2,distance:r.hip.distanceTo(r.end),singleBodyLoad:solveBodyLoad143([r],0)};})};}originalClear();};
 const samples:unknown[]=[];
 for(let tick=0;tick<180;tick++){
  const reverse=tick>=90,target=reverse?7.6:-7.6;
  vz+=(target-vz)*(1-Math.exp(-dt*11));yaw=angleLerp(yaw,reverse?Math.PI:0,1-Math.exp(-dt*10));
  motion.beginStep();motion.computeColliderMovement(controller,collider,{x:0,y:0,z:vz*dt},RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);const move=controller.computedMovement(),p=body.translation();body.setNextKinematicTranslation({x:p.x+move.x,y:p.y+move.y,z:p.z+move.z});motion.endStep();world.step();
  const position=body.translation();native.position.set(position.x,position.y-1,position.z);native.rotation.y=yaw;owner.restoreSource();mount.position.set(0,0,0);
  const selected=selectedGaits143(Math.abs(vz),7.6,0),distance=Math.abs(position.z-lastZ),sign=Math.sign((position.z-lastZ)*-Math.cos(yaw));lastZ=position.z;
  const stride=selected.reduce((s,c)=>s+c.weight*catalog[c.name].measuredGait!.nativeDistancePerCycle,0);phase=((phase+sign*distance/stride)%1+1)%1;
  for(const a of actions.values())a.setEffectiveWeight(0);for(const c of selected){const g=catalog[c.name].measuredGait!,a=actions.get(c.name)!;a.time=g.cycleStart!+phase*(g.cycleEnd!-g.cycleStart!);a.setEffectiveWeight(c.weight);}
  mixer.update(0);model.updateWorldMatrix(true,true);const footfalls=selectedFootfalls123(actions,catalog);
  owner.step({time:tick*dt,frameClock:tick,life:1,reset:tick===0,grounded:true,eligible:true,stance:0,phase,footfalls,rootPosition:native.position,rootYaw:yaw},mount,selected.map(c=>({...c,time:actions.get(c.name)!.time})));
  samples.push({tick,reverse,vz,yaw,phase,position:native.position.toArray(),selected,footfalls,body:structuredClone(owner.diagnostic.bodyTask143),feet:structuredClone(owner.diagnostic.feet),failure:owner.diagnostic.firstFailure143});
  if(owner.diagnostic.firstFailure143)break;
 }
 evidence.push({rig,path,samples,failedSnapshot});owner.dispose();mixer.stopAllAction();world.free();
}
writeFileSync('tools/overhaul-locomotion-152/candidate-native-heading152.json',JSON.stringify({provenance:'ACTUAL_DECODED_RIG_RAPIER_FIXED_FLOOR_NATIVE_HEADING_VELOCITY_LAWS_NOT_PUBLIC146_REPLAY',evidence},null,2));
console.log(JSON.stringify(evidence.map((r:any)=>({rig:r.rig,lastTick:r.samples.at(-1).tick,failure:r.samples.at(-1).failure,failedSnapshot:r.failedSnapshot})),null,2));

