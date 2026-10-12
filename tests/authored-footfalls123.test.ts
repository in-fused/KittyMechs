import {describe,expect,it,vi} from 'vitest';
import {AnimationClip,AnimationMixer,Bone,BufferGeometry,Float32BufferAttribute,Group,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3,VectorKeyframeTrack} from 'three';
import records from '../assets/source/overhaul-pounce-anatomy-121/authored-motion-records.json';
import {authoredFootPolicy123,selectedFootfalls123,validateAuthoredGait123,type AuthoredGait123} from '../src/game/entities/authoredFootfalls123';
import {MovingRFeet067} from '../src/game/entities/movingRFfeet067';
import type {GroundSupport067} from '../src/game/entities/groundSupport067';

function gait(name:string):AuthoredGait123{
 const row=records.find(r=>r.name===name)!;
 return {nativeDistancePerCycle:row.nativeDistancePerCycle!,cycleStart:row.cycleStart,cycleEnd:row.cycleEnd,sourceDuty:row.sourceDuty!,sourceOffsets:row.sourceOffsets! as AuthoredGait123['sourceOffsets'],unloadedLimbs:row.kind.startsWith('upright')?['FL','FR']:[]};
}
function selected(name:string,phase:number,weight=1){
 const root=new Group(),bone=new Bone();bone.name='test';root.add(bone);const g=gait(name),first=Math.fround(g.cycleStart!),last=Math.fround(g.cycleEnd!);
 const clip=new AnimationClip(name,last,[new VectorKeyframeTrack('test.position',[first,last],[0,0,0,0,1,0])]);
 const mixer=new AnimationMixer(root),action=mixer.clipAction(clip).play();action.paused=true;action.time=first+(last-first)*phase;action.setEffectiveWeight(weight);mixer.update(0);
 return selectedFootfalls123(new Map([[name,action]]),{[name]:{measuredGait:g}});
}

describe('actual121 authored footfalls123',()=>{
 it('admits exact five source rows and rejects incomplete or forged loaded-upright metadata',()=>{
  for(const row of records.filter(r=>r.nativeDistancePerCycle!==null))expect(()=>validateAuthoredGait123(row.name,gait(row.name))).not.toThrow();
  const g=gait('FelineGallop');expect(()=>validateAuthoredGait123('FelineGallop',{...g,sourceOffsets:undefined})).toThrow(/FOOTFALL/);
  expect(()=>validateAuthoredGait123('FelineUprightStride',{...gait('FelineUprightStride'),unloadedLimbs:[]})).toThrow(/LOAD_CONTRACT/);
 });
 it('uses actual Three action time and preserves both authored gallop suspensions rather than diagonal .52 support',()=>{
  for(const phase of [.42,.90])for(const limb of ['FL','FR','HL','HR'] as const)expect(authoredFootPolicy123(limb,selected('FelineGallop',phase))).toBe('swing');
  expect(authoredFootPolicy123('HL',selected('FelineGallop',.10))).toBe('stance');
  expect(authoredFootPolicy123('FL',selected('FelineGallop',.50))).toBe('stance');
  expect(authoredFootPolicy123('FR',selected('FelineGallop',.50))).toBe('swing');
 });
 it('any positive R contributor releases its swing/unload, regardless of dominant stance or microscopic weight',()=>{
  const quad=selected('FelineWalk',.10),upright=selected('FelineUprightStride',.10,Number.EPSILON);
  expect(authoredFootPolicy123('FL',quad)).toBe('stance');expect(authoredFootPolicy123('FL',[...quad,...upright])).toBe('unloaded');
  const swing=selected('FelineGallop',.42,Number.EPSILON);expect(authoredFootPolicy123('HL',[...quad,...swing])).toBe('swing');
  expect(authoredFootPolicy123('FL',[...quad,...upright.map(c=>({...c,weight:0}))])).toBe('stance');
 });
 it('retained unknown idle/turn/reaction owns source; neutral additive arc is the sole whole-body exemption',()=>{
  const root=new Group(),mixer=new AnimationMixer(root),idle=mixer.clipAction(new AnimationClip('FelineIdle',1,[])).play();idle.setEffectiveWeight(.2);
  const arc=mixer.clipAction(new AnimationClip('FelineTransitionArc106',1,[])).play();arc.setEffectiveWeight(1);mixer.update(0);
  expect(selectedFootfalls123(new Map([['FelineTransitionArc106',arc]]),{})).toEqual([]);
  const sources=selectedFootfalls123(new Map([['FelineIdle',idle],['FelineTransitionArc106',arc]]),{});
  expect(authoredFootPolicy123('HL',[...selected('FelineWalk',.1),...sources])).toBe('source-only');
 });
 it('actual foot owner leaves authored joints exact and makes no ground query in positive-weight swing/unload',()=>{
  const model=new Group(),bones:Bone[]=[];
  for(const [i,limb] of ['FL','FR','HL','HR'].entries()){
   const upper=new Bone(),lower=new Bone(),paw=new Bone();upper.name=limb+'_upper';lower.name=limb+'_lower';paw.name=limb+'_paw';upper.position.set(i*2,1,0);lower.position.set(0,-.45,.18);upper.add(lower);
   if(limb.startsWith('H')){const hock=new Bone();hock.name=limb+'_hock';hock.position.set(0,-.2,-.08);paw.position.set(0,-.25,-.10);lower.add(hock);hock.add(paw);bones.push(hock);}else{paw.position.set(0,-.45,-.18);lower.add(paw);}
   model.add(upper);bones.push(upper,lower,paw);model.updateMatrixWorld(true);
   const x=i*2,geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([x-.1,.1,-.1,x+.1,.1,-.1,x-.1,.1,.1,x+.1,.1,.1],3)).setAttribute('skinIndex',new Uint16BufferAttribute(new Array(16).fill(0),4)).setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],4));
   const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial());model.add(mesh);model.updateMatrixWorld(true);mesh.bind(new Skeleton([paw]),mesh.matrixWorld.clone());
  }
  model.updateMatrixWorld(true);const query=vi.fn(()=>{throw new Error('Swing/unload must not probe or lease');});
  // Explicit unit fixture provider; no native/collider/contact certificate.
  const support={diagnostic:{generation:0,queries:0,lastReason:null},begin:vi.fn(),probe:query,validate:()=>true} as unknown as GroundSupport067;
  const owner=new MovingRFeet067(model,support),before=bones.map(b=>({position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()}));expect(owner.diagnostic.available).toBe(true);
  for(let i=0;i<2;i++)owner.step({time:i*.016,frameClock:i,life:1,reset:i===0,grounded:true,eligible:true,stance:.2,phase:.42,footfalls:[...selected('FelineGallop',.42),...selected('FelineUprightStride',.7,.01)],rootPosition:new Vector3(),rootYaw:0});
  expect(query).not.toHaveBeenCalled();expect(bones.map(b=>({position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()}))).toEqual(before);
  expect(owner.diagnostic.feet.filter(f=>f.limb.startsWith('F')).every(f=>f.mode==='unloaded'&&f.effectiveWeight===0)).toBe(true);
 });
});
