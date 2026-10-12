/** Prepared fixture, UNRUN. Root actual GLTFLoader supplies scene/clips/contract
 * and a real saved native-backed RenderActorFrame. No dummy/linear rig decoder. */
import {Group,Object3D,type AnimationClip} from 'three';
import type {RenderActorFrame} from '../../src/game/entities/renderTimeline';
import {NativeOwner214,type Contract214} from './nativeOwner214';
const check=(yes:boolean,reason:string)=>{if(!yes)throw Error(reason);};
export function nativeOwnerCases214(model:Object3D,clips:AnimationClip[],contract:Contract214,baseline:RenderActorFrame){
 check(!!baseline.state.nativePose,'214_FIXTURE_REQUIRES_ACTUAL_NATIVE_FRAME');
 const root=new Group(),body=new Group();root.add(body);body.add(model);
 const owner=new NativeOwner214(model,clips,contract,baseline.state.id),cases:any[]=[];let frame=0,previousX=baseline.position.x;
 const run=(label:string,overrides:Partial<RenderActorFrame>,state:any={},generation=1)=>{
  const p={...structuredClone(baseline),...overrides,state:{...structuredClone(baseline.state),...state}} as RenderActorFrame;
  p.time=baseline.time+frame/60;if(p.state.nativePose){p.state.nativePose.hull.position.x=p.position.x;p.state.nativePose.hull.position.z=p.position.z;}
  owner.step(p,frame/60,1/60,root,body,true,generation);
  const row={label,diagnostic:structuredClone(owner.diagnostic),boneTransforms:contract.bones.map(b=>{const o=model.getObjectByName(b.name)!;return {name:b.name,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()};})};cases.push(row);frame++;return row;
 };
 for(const direction of [1,-1])for(const speed of [1,3,7.6])for(let i=0;i<24;i++){
  previousX+=direction*speed/60;const r=run('ordinary-native-distance',{distance:speed/60,position:{...baseline.position,x:previousX},yaw:i<12?Math.PI/2:-Math.PI/2,reset:frame===0,climb:undefined,strike:undefined,grounded:true},{pair:undefined,downed:undefined,hp:baseline.state.maxHp,stance:'quadruped',stanceChangedAt:-100,pulseAt:-1,rocketAt:-1,hurtAt:-1});
  check(r.diagnostic.status==='source','214_ORDINARY_SOURCE_FAILURE');check(r.diagnostic.contactQualified===false,'214_FALSE_CONTACT');
  for(const c of r.diagnostic.activeClips)if(contract.clips[c.name].measuredGait){const g=contract.clips[c.name].measuredGait;check(c.time>=g.cycleStart&&c.time<=g.cycleEnd,'214_POSITIVE_SOURCE_CLOCK');}
 }
 for(const target of ['upright','quadruped'])for(let i=0;i<43;i++){const r=run('moving-R',{distance:2/60,position:{...baseline.position,x:previousX+=2/60},reset:false,grounded:true,climb:undefined,strike:undefined},{pair:undefined,downed:undefined,hp:baseline.state.maxHp,stance:target,stanceChangedAt:baseline.time+(frame-i)/60,pulseAt:-1,rocketAt:-1,hurtAt:-1});check(r.diagnostic.status==='source','214_MOVING_R_FAILURE');}
 for(let i=0;i<30;i++){const r=run('stop-idle',{distance:0,angularDistance:0,reset:false,grounded:true,climb:undefined,strike:undefined},{pair:undefined,downed:undefined,hp:baseline.state.maxHp,stance:'quadruped',stanceChangedAt:-100,pulseAt:-1,rocketAt:-1,hurtAt:-1});check(r.diagnostic.status==='source','214_STOP_FAILURE');}
 const gap=run('unsupported-climb',{distance:0,climb:{...baseline.state.climb,phase:'hang'} as any},{pair:undefined});check(gap.diagnostic.status==='temporary-standard'&&!root.visible,'214_GAP_MUST_HIDE_BAD_POSE');
 const restored=run('return-source',{distance:0,angularDistance:0,climb:undefined,reset:false,grounded:true},{pair:undefined,downed:undefined,hp:baseline.state.maxHp,stance:'quadruped',stanceChangedAt:-100,pulseAt:-1,rocketAt:-1,hurtAt:-1});check(restored.diagnostic.status==='source'&&!!restored.diagnostic.firstFailure,'214_RECOVERABLE_RETURN');
 const life=run('new-life',{distance:0,angularDistance:0,reset:true,climb:undefined,grounded:true},{jumpEpoch:baseline.state.jumpEpoch+1,pair:undefined,stanceChangedAt:-100,pulseAt:-1,rocketAt:-1,hurtAt:-1},2);check(life.diagnostic.phase===0&&life.diagnostic.generation===2,'214_EPOCH_RESET');
 owner.dispose();check(owner.diagnostic.status==='disposed','214_DISPOSE');
 return {status:'FIXTURE_ONLY_NO_GAMEPLAY_ACCEPTANCE',cases,contactQualified:false};
}
