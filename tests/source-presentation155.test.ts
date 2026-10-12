import {afterAll,describe,expect,it,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import {AnimationMixer,Bone,Group,LoopOnce,Vector3} from 'three';
import manifest from '../src/game/entities/identity57Runtime121Manifest.json';
import {loadRig143} from '../tools/overhaul-locomotion-143/load-rig143';
import {Identity57Runtime005} from '../src/game/entities/identity57Runtime005';
import {offGaits143,LocomotionTasks143} from '../src/game/entities/locomotionTasks143';
import {SOURCE_POLICY154,advanceSourceTravel154,sourcePose154,unsupportedSourceAction154,type SourceCatalog154} from '../src/game/entities/sourcePresentation154';
import {publicFelineSelected008,updateTemporaryFeline154,forgetTemporaryFeline154,readFelinePrototype008,fallbackFeline008,resetFelineFallback008} from '../src/game/entities/publicFelinePrototype008';
import {registerCameraVisual,completeCameraVisual,hasCompletedCameraVisual044,cameraVisual} from '../src/game/camera/visualRegistry';
import {prepareVisualEnvelope} from '../src/game/camera/visualEnvelope';
import {prepareWeightedVisualEnvelope007,weightedCameraProvider007} from '../src/game/camera/weightedVisualEnvelope007';
import {runtime} from '../src/game/runtime';
import type {ActorState} from '../shared/types';
import type {RenderActorFrame} from '../src/game/entities/renderTimeline';
import type {GroundSupport067} from '../src/game/entities/groundSupport067';
import {createGroundSupport067} from '../src/game/entities/groundSupport067';
import {SourceCoordination155,sourceCyclePhase155} from '../src/game/entities/sourceCoordination155';
import {SkinnedMesh} from 'three';
const settings=vi.hoisted(()=>({felinePrototype:true}));
vi.mock('../src/state/store',()=>({useGameStore:{getState:()=>({settings})}}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
const cases154:unknown[]=[];
afterAll(()=>writeFileSync('tools/overhaul-locomotion-155/source-cases155.json',JSON.stringify({provenance:'ACTUAL_DECODED_SOURCE_FK_NO_BROWSER_NATIVE_CONTACT_OR_QUALITY_CERTIFICATE',cases:cases154},null,2)));
function state():ActorState{return {id:'source154',name:'Source',chassis:'pounce',bot:false,position:{x:0,y:1,z:0},velocity:{x:0,y:0,z:0},yaw:0,aimYaw:0,aimPitch:0,hp:220,maxHp:220,grounded:true,jumpEpoch:1,stance:'quadruped',stanceChangedAt:-100,climb:null,pair:null,strike:null,pulseAt:-100,rocketAt:-100,hurtAt:-100,diedAt:-100,downed:null,climbDetachedAt:-100} as ActorState;}
function frame(s:ActorState,time:number,distance=.06,yaw=s.yaw,reset=false):RenderActorFrame{return {state:s,time,distance,yaw,reset,position:{...s.position},velocity:{...s.velocity},grounded:s.grounded,climb:s.climb,strike:s.strike,climbProgress:0,angularDistance:0};}
function limbs(model:Group){return ['FL','FR','HL','HR'].map(n=>({upper:model.getObjectByName(n+'_upper') as Bone,lower:model.getObjectByName(n+'_lower') as Bone,paw:model.getObjectByName(n+'_paw') as Bone}));}
const samples=[[1,.03,0,0],[3,.08,0,0],[6,.12,.5,0],[4,-.08,1.5,0],[2,.04,Math.PI,0],[0,0,Math.PI,0],[3,.06,Math.PI,.2],[3,.06,Math.PI,.5],[3,.06,Math.PI,.8],[3,.06,Math.PI,1],[3,.06,Math.PI,.6],[3,-.06,Math.PI,.2],[2,.04,Math.PI,0]];
describe('155 actual source checkpoint lifecycle regression',()=>{
 it('real decoded both-rig heading, event alignment and current native-plane mount through start/stop/reverse/strafe/R/reset',async()=>{
  const R=(await import('@dimforge/rapier3d-compat')).default;await R.init();const world=new R.World({x:0,y:-9.81,z:0});const floor=world.createCollider(R.ColliderDesc.cuboid(30,.1,30).setTranslation(0,-.18,0));world.step();
  const support=createGroundSupport067(world,R,()=>155);let clock=0;
  for(const rig of ['ON57','OFF25']){
   const {model,clips}=await loadRig143(rig==='ON57'?'public'+manifest.publicURL:'public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb'),root=new Group(),body=new Group();root.add(body);body.add(model);body.scale.setScalar(.8);body.rotation.y=Math.PI;
   const coordinator=new SourceCoordination155(model,clips),catalog:SourceCatalog154=rig==='ON57'?manifest.clips as SourceCatalog154:offGaits143(clips,.8),mixer=new AnimationMixer(model),actions=new Map(clips.map(c=>{const a=mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);return [c.name,a] as const;}));
   const all:{mesh:SkinnedMesh;index:number;rest:Vector3;limb:string}[]=[];
   model.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const p=o.geometry.getAttribute('position'),ix=o.geometry.getAttribute('skinIndex'),w=o.geometry.getAttribute('skinWeight');for(let i=0;i<p.count;i++)for(const limb of ['FL','FR','HL','HR']){let owned=0;for(let j=0;j<4;j++){const b=o.skeleton.bones[ix.getComponent(i,j)];if(b&&(b.name===limb+'_paw'||b.name.startsWith(limb+'_digit_')||b.name.startsWith(limb+'_claw_')))owned+=w.getComponent(i,j);}if(owned>.99)all.push({mesh:o,index:i,rest:new Vector3().fromBufferAttribute(p,i),limb});}});
   let phase=0,lastYaw=0,maxSubsetMiss=0;const translation=new Vector3();
   for(let i=0;i<240;i++){
    clock+=1/60;const stance=i<80?0:i<120?(i-80)/40:i<160?1:i<200?1-(i-160)/40:0,speed=i<20||i>=220?0:i<60?3:5;
    const nativeYaw=i<40?0:i<80?Math.PI:i<160?Math.PI/2:0,dx=speed?-.02*Math.sin(nativeYaw):0,dz=speed?-.02*Math.cos(nativeYaw):0;translation.x+=dx;translation.z+=dz;
    // Actual body-centre/hull lower-boundary composition from saved154 native
    // geometry: s.y=.94, local hull centre .3+.6*stance, halfHeight1.18+.6*stance.
    const centerY=.94,hullY=centerY+.3+.6*stance,halfHeight=1.18+.6*stance,border=.12;root.position.set(translation.x,centerY+(hullY-centerY-halfHeight-border),translation.z);root.rotation.y=nativeYaw;
    const visual=coordinator.heading(nativeYaw,translation,Math.hypot(dx,dz),1/60,i===0,true);body.rotation.y=Math.PI+visual-nativeYaw;body.position.y=0;
    if(i!==0)expect(Math.abs(Math.atan2(Math.sin(visual-lastYaw),Math.cos(visual-lastYaw)))).toBeLessThanOrEqual((Math.PI/2)/Math.min(clips.find(c=>c.name==='FelineTurnLeft')!.duration,clips.find(c=>c.name==='FelineTurnRight')!.duration)/60+1e-12);lastYaw=visual;
    for(const a of actions.values())a.setEffectiveWeight(0);const beforePhase=phase;
    if(speed)phase=advanceSourceTravel154(actions,catalog,speed,7.6,stance,phase,coordinator.diagnostic.signedDistance);else{const name=stance>.5?'FelineUprightIdle':'FelineIdle',a=actions.get(name)!;a.time=clock%a.getClip().duration;a.setEffectiveWeight(1);expect(phase).toBe(beforePhase);}
    for(const [name,a] of actions){const gait=(catalog as any)[name]?.measuredGait;if(a.getEffectiveWeight()>0&&gait){const p=(a.time-Math.fround(gait.cycleStart))/(Math.fround(gait.cycleEnd)-Math.fround(gait.cycleStart));expect(p).toBeCloseTo(sourceCyclePhase155(phase,gait),10);expect(((p+gait.sourceOffsets.HL)%1+1)%1).toBeCloseTo(phase,10);}}
    mixer.update(0);const before=limbs(model).flatMap(l=>[l.upper,l.lower,l.paw].map(b=>({position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()})));
    coordinator.observeSurface(support,clock,clock,1,root,halfHeight+border,border);coordinator.place(actions,catalog,body,1/60,stance);
    expect(coordinator.diagnostic.surface).not.toBeNull();expect(coordinator.diagnostic.queries).toBe(1);expect(coordinator.diagnostic.soleSamples).toBeLessThanOrEqual(all.length);expect(Math.abs(body.position.y)).toBeLessThanOrEqual(border);expect(coordinator.diagnostic.contactQualified).toBe(false);
    expect(limbs(model).flatMap(l=>[l.upper,l.lower,l.paw].map(b=>({position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()})))).toEqual(before);
    if(i%20===0){const full=Object.fromEntries(['FL','FR','HL','HR'].map(l=>[l,Infinity]));for(const w of all){const p=w.mesh.applyBoneTransform(w.index,w.rest.clone());w.mesh.localToWorld(p);full[w.limb]=Math.min(full[w.limb],p.y);}const subset=(coordinator as any).feet.map((f:any)=>({limb:f.limb,min:Math.min(...f.points.map((w:any)=>{const p=w.mesh.applyBoneTransform(w.index,w.rest.clone());w.mesh.localToWorld(p);return p.y;}))}));for(const p of subset){maxSubsetMiss=Math.max(maxSubsetMiss,p.min-full[p.limb]);expect(p.min).toBeCloseTo(full[p.limb],10);}cases154.push({rig,case155:i,nativeYaw,root:root.position.toArray(),body:body.position.toArray(),phase,coordination:{...coordinator.diagnostic},completeWeightedFootMinimum:full,subsetMinimum:subset,provenance:'REAL_DECODED_SOURCE_AND_CURRENT_RAPIER_FIXED_PLANE_NO_NATIVE_PAW_CONTACT_CERTIFICATE'});}
   }
   cases154.push({rig,maxSubsetMiss,completeSkinMeasurement:'FIXTURE_ONLY_ALL_FOOT_FAMILY_VERTICES; RUNTIME_CACHED_IDENTICAL_WEIGHT_HULLS_EXACT_FOOT_FAMILY_PLANES_NO_NATIVE_CONTACT_CERTIFICATE'});
   coordinator.heading(2,translation,0,1/60,true,true);expect(coordinator.diagnostic.visualYaw).toBe(2);coordinator.observeSurface(undefined,clock,clock,1,root,1.3,.12);coordinator.place(actions,catalog,body,1/60,0);expect(body.position.y).toBe(0);expect(coordinator.diagnostic.surface).toBeNull();mixer.stopAllAction();mixer.uncacheRoot(model);
  }
  floor.setEnabled(false);support.begin(++clock,clock,1);expect(support.probe(new Vector3(),1.3,2.6)).toBeNull();world.free();
 },30000);
 it('ON57 moves decoded joints, preserves source transforms, integrates once and never queries/executes contact',async()=>{
  const {model,clips}=await loadRig143('public'+manifest.publicURL),root=new Group(),body=new Group();root.add(body);body.add(model);
  const forbidden=vi.fn(()=>{throw Error('CONTACT_EXECUTED');}),support={begin:forbidden,probe:forbidden,validate:forbidden} as unknown as GroundSupport067;
  const stepSpy=vi.spyOn(LocomotionTasks143.prototype,'step'),owner=new Identity57Runtime005(model,clips,'source154',manifest),s=state();
  expect(owner.diagnostic.presentation154.fatal).toBeNull();const history:Vector3[][]=[],angles:number[][]=[];let t=1;
  for(const [speed,distance,yaw,stance] of samples){
   t+=.1;s.position.z+=distance;s.yaw=yaw;s.stance=stance>0?'upright':'quadruped';s.stanceChangedAt=stance>0?t-stance*.7:t-100;
   // For the descending half, the current quadruped target is sampled from
   // its actual transition clock rather than reversing or replacing gait.
   if(t>2&&stance>0&&stance<1){s.stance='quadruped';s.stanceChangedAt=t-(1-stance)*.7;}
   const p=frame(s,t,Math.abs(distance),yaw,t===1.1);owner.step(p,t,speed>0?Math.abs(distance)/speed:.1,root,body,true);
   expect(owner.diagnostic.presentation154.status).toBe('source');expect(owner.diagnostic.presentation154.fatal).toBeNull();expect(owner.diagnostic.contactPolicy).toBe(SOURCE_POLICY154);expect(owner.diagnostic.queryCount).toBe(0);
   expect((owner.diagnostic as any).feet).toBeUndefined();expect(root.rotation.y).toBe(yaw);expect(root.position.z).toBe(s.position.z);
   const source=owner.diagnostic.sourcePose154!;expect(source.contactQualified).toBe(false);expect(source.paws).toHaveLength(4);expect(source.clips.length).toBeGreaterThan(0);
   history.push(limbs(model).map(l=>model.worldToLocal(l.paw.getWorldPosition(new Vector3()))));angles.push(limbs(model).flatMap(l=>l.upper.quaternion.toArray()));cases154.push({rig:'ON57',time:t,source:structuredClone(source)});
  }
  for(let limb=0;limb<4;limb++)expect(Math.max(...history.map(row=>row[limb].distanceTo(history[0][limb])))).toBeGreaterThan(.01);
  expect(angles.some(a=>a.some((v,i)=>Math.abs(v-angles[0][i])>.001))).toBe(true);expect(forbidden).not.toHaveBeenCalled();expect(stepSpy).not.toHaveBeenCalled();
  const phase=owner.diagnostic.phase;owner.step(frame(s,t+.1,0),t+.1,.1,root,body,true);expect(owner.diagnostic.phase).toBe(phase);
  owner.dispose();const before=limbs(model).map(l=>l.upper.quaternion.toArray());owner.step(frame(s,t+1,.2),t+1,.1,root,body,true);expect(limbs(model).map(l=>l.upper.quaternion.toArray())).toEqual(before);expect(owner.diagnostic.presentation154.disposed).toBe(true);stepSpy.mockRestore();
 },30000);
 it('OFF25 uses actual measured clocks/strides and live movingR source joints without a second owner',async()=>{
  const {model,clips}=await loadRig143('public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb'),root=new Group(),body=new Group();root.add(body);body.add(model);body.rotation.y=Math.PI;body.scale.setScalar(.8);
  const catalog=offGaits143(clips,.8),mixer=new AnimationMixer(model),actions=new Map(clips.map(c=>{const a=mixer.clipAction(c).setLoop(LoopOnce,1);a.play();a.paused=true;a.setEffectiveWeight(0);return [c.name,a] as const;}));
  let phase=0;const histories:Vector3[][]=[];
  for(const [speed,distance,yaw,stance] of samples){root.position.z+=distance;root.rotation.y=yaw;for(const a of actions.values())a.setEffectiveWeight(0);
   if(speed>0)phase=advanceSourceTravel154(actions,catalog,speed,7.6,stance,phase,distance);else{const a=actions.get('FelineIdle')!;a.time=.2;a.setEffectiveWeight(1);}
   mixer.update(0);model.updateWorldMatrix(true,true);const pose=sourcePose154(actions,catalog,phase,limbs(model));expect(pose.policy).toBe(SOURCE_POLICY154);expect(pose.contactQualified).toBe(false);expect(pose.paws).toHaveLength(4);
   histories.push(limbs(model).map(l=>model.worldToLocal(l.paw.getWorldPosition(new Vector3()))));cases154.push({rig:'OFF25',speed,distance,yaw,stance,source:structuredClone(pose)});
  }
  for(let i=0;i<4;i++)expect(Math.max(...histories.map(row=>row[i].distanceTo(histories[0][i])))).toBeGreaterThan(.01);
  const old=phase;for(const a of actions.values())a.setEffectiveWeight(0);phase=advanceSourceTravel154(actions,catalog,3,7.6,0,phase,0);expect(phase).toBe(old);mixer.stopAllAction();mixer.uncacheRoot(model);
 },30000);
 it('temporary unsupported action exits, source bookkeeping does not catch up, fatal binding remains fatal across reset',async()=>{
  const {model,clips}=await loadRig143('public'+manifest.publicURL),root=new Group(),body=new Group();root.add(body);body.add(model);const owner=new Identity57Runtime005(model,clips,'recovery154',manifest),s=state();
  owner.step(frame(s,1,.05,0,true),1,.1,root,body,true);const before=owner.diagnostic.phase;
  s.climb={phase:'cling'} as ActorState['climb'];owner.step(frame(s,1.1,.2),1.1,.1,root,body,true);expect(owner.diagnostic.presentation154.status).toBe('temporary-standard');expect(owner.diagnostic.phase).toBe(before);const historical=owner.diagnostic.firstFailure;
  s.climb=null;owner.step(frame(s,1.2,.05),1.2,.1,root,body,true);expect(owner.diagnostic.presentation154.status).toBe('source');expect(owner.diagnostic.supportedState).toBe(true);expect(owner.diagnostic.firstFailure).toBe(historical);expect(owner.diagnostic.phase).not.toBe(before);
  s.jumpEpoch++;owner.step(frame(s,2,0,0,true),2,.1,root,body,true);expect(owner.diagnostic.phase).toBe(0);expect(owner.diagnostic.presentation154.fatal).toBeNull();owner.dispose();
  const bad=await loadRig143('public'+manifest.publicURL),badOwner=new Identity57Runtime005(bad.model,[...bad.clips,bad.clips[0]],'fatal154',manifest);const fatal=badOwner.diagnostic.presentation154.fatal;expect(fatal).not.toBeNull();expect(badOwner.diagnostic.browserClipContract128.passed).toBe(false);badOwner.step(frame(s,3,0,0,true),3,.1,new Group(),new Group(),true);expect(badOwner.diagnostic.presentation154.fatal).toBe(fatal);expect(badOwner.diagnostic.presentation154.status).toBe('fatal-binding');badOwner.dispose();
 },30000);
 it('real dispatch state switches visible owner and current registry, retains history without sticky temporary failure',async()=>{
  const saved=runtime.generation;runtime.generation=154;settings.felinePrototype=true;resetFelineFallback008();const actor=state();
  const a=await loadRig143('public'+manifest.publicURL),b=await loadRig143('public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb'),preview=new Group(),standard=new Group();preview.add(a.model);standard.add(b.model);
  const weighted=prepareWeightedVisualEnvelope007(a.model);
  let dispose=registerCameraVisual(actor.id,preview,weighted,154,weightedCameraProvider007(weighted));completeCameraVisual(actor.id,preview,1,154);expect(hasCompletedCameraVisual044(actor.id,154)).toBe(true);expect(publicFelineSelected008(actor)).toBe(true);
  actor.climb={phase:'cling'} as ActorState['climb'];const reason=unsupportedSourceAction154(actor,1,true);updateTemporaryFeline154(actor.id,1,reason);expect(publicFelineSelected008(actor)).toBe(false);const history=readFelinePrototype008().history154.find(r=>r.actor===actor.id)!;
  preview.visible=false;const old=dispose;dispose=registerCameraVisual(actor.id,standard,prepareVisualEnvelope(standard),154);old();completeCameraVisual(actor.id,standard,2,154);expect(cameraVisual(actor.id,2,154)).not.toBeNull();
  actor.climb=null;updateTemporaryFeline154(actor.id,1,unsupportedSourceAction154(actor,2,true));expect(publicFelineSelected008(actor)).toBe(true);expect(readFelinePrototype008().history154.find(r=>r.actor===actor.id)).toEqual(history);
  standard.visible=false;preview.visible=true;old();dispose();dispose=registerCameraVisual(actor.id,preview,weighted,154,weightedCameraProvider007(weighted));completeCameraVisual(actor.id,preview,3,154);expect(cameraVisual(actor.id,3,154)).not.toBeNull();expect(cameraVisual(actor.id,2,154)).toBeNull();
  settings.felinePrototype=false;expect(publicFelineSelected008(actor)).toBe(false);settings.felinePrototype=true;expect(publicFelineSelected008(actor)).toBe(true);
  fallbackFeline008(actor.id,{reason:'ACTUAL_BINDING_FAILURE'});updateTemporaryFeline154(actor.id,1,null);expect(publicFelineSelected008(actor)).toBe(false);runtime.generation++;expect(publicFelineSelected008(actor)).toBe(true);dispose();expect(cameraVisual(actor.id,3,154)).toBeNull();forgetTemporaryFeline154(actor.id);resetFelineFallback008();runtime.generation=saved;
 },30000);
});
