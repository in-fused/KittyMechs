from pathlib import Path
import shutil,json,hashlib
R=Path(__file__).resolve().parents[2];H=Path(__file__).parent;B=R/'tools/overhaul-grounded-motion-256'
for name in ['NativeActor256.tsx','nativeOwner256.ts','sourceTask256.ts']:
 shutil.copy2(B/name,H/'preimages'/name)
s=(B/'sourceTask256.ts').read_text()
s=s.replace("from './skinSole256'","from '../overhaul-grounded-motion-256/skinSole256'").replace("from './groundedFeet256'","from '../overhaul-grounded-motion-256/groundedFeet256'")
s="import {PreparationChart267,type Preparation267} from './preparation267';\n"+s.replace('class SourceTask256','class SourceTask267')
s=s.replace('private grounded250:GroundedFeet256;', 'private grounded250:GroundedFeet256;private chart267=new PreparationChart267();private samples267=new Map<string,Map<string,Pose>>();private active267:any=null;private schedule267={samples:0,hits:0};\n private begin267(){this.samples267.clear();this.schedule267={samples:0,hits:0};if(this.model.parent)this.mount.matrix.copy(this.model.parent.matrixWorld);else this.mount.matrix.identity();}\n cancelPreparation267(){this.chart267.cancel();}\n private world267(o:Object3D){return new Vector3().setFromMatrixPosition(o.matrixWorld);}\n private quaternion267(o:Object3D){const q=new Quaternion();o.matrixWorld.decompose(new Vector3(),q,new Vector3());return q;}')
start=s.index('  if(this.model.parent)this.mount.matrix.copy',s.index(' private source('));end=s.index('\n }\n private rotation',start)
s=s[:start]+'''  const action=this.actions.get(item.name),record=this.catalog[item.name]?.measuredGait;if(!action)throw Error('202_MISSING_SOURCE_ACTION:'+item.name);
  const time=overrideTime!==undefined?overrideTime:record?sourceGaitTime171(item.name,record,phase):idleClocks[item.name]??0,key=item.name+':'+time;
  const cached=this.samples267.get(key);if(cached){this.schedule267.hits++;return {item,pose:cached,record};}
  if(this.active267)this.active267.setEffectiveWeight(0);this.active267=action;
  action.time=time;action.setEffectiveWeight(1);this.mixer.update(0);this.mount.updateMatrixWorld(true);
  const pose=new Map<string,Pose>();for(const [name,b] of this.graphBones)pose.set(name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),world:this.world267(b),rotation:this.quaternion267(b)});
  this.samples267.set(key,pose);this.schedule267.samples++;return {item,pose,record};''' +s[end:]
s=s.replace("b.parent!.getWorldQuaternion(new Quaternion())","this.quaternion267(b.parent!)").replace("b.getWorldQuaternion(new Quaternion())","this.quaternion267(b)")
s=s.replace('b.getWorldPosition(new Vector3())','this.world267(b)').replace('child.getWorldPosition(new Vector3())','this.world267(child)').replace('upper.getWorldPosition(new Vector3())','this.world267(upper)')
s=s.replace('idleClocks:Record<string,number>={}){\n  const start=', 'idleClocks:Record<string,number>={},preparation?:Preparation267){\n  this.begin267();\n  const start=')
needle="  const head=this.model.getObjectByName('head') as Bone;this.rotation(head,meanQ(samples.map(s=>({q:s.pose.get('head')!.rotation,w:s.item.weight}))));"
replacement='''  const head=this.model.getObjectByName('head') as Bone,headRotation=meanQ(samples.map(s=>({q:s.pose.get('head')!.rotation,w:s.item.weight}))),prepared267=new Map<string,{goal:Vector3;pole:Vector3;third:Vector3;rotation:Quaternion}>();
  const names267=this.bones.map(b=>b.name),before267=new Map(names267.map(n=>{const b=this.model.getObjectByName(n)!;return [n,{world:this.world267(b),rotation:this.quaternion267(b)}] as const;}));
  const prepName=preparation?.direction==='up'?'FelinePrepareUp264':'FelinePrepareDown264',prep=this.catalog[prepName]?.preparation;
  const chart=this.chart267.evaluate(preparation,names267,part=>{if(!prep)throw Error('267_MISSING_PREPARATION_METADATA:'+prepName);const u=part==='start'?0:part==='end'?1:preparation!.progress;return this.source({name:prepName,weight:1},phase,{},prep.cycleStart+(prep.cycleEnd-prep.cycleStart)*u).pose;});
  if(chart.size){this.soles.invalidatePose256();for(const b of this.bones){const q=chart.get(b.name);if(q)b.quaternion.premultiply(q);}this.model.updateWorldMatrix(true,true);
   for(const c of this.chains){const n=c.limb+'_paw',old=before267.get(n)!,paw=this.model.getObjectByName(n)!;prepared267.set(c.limb,{goal:this.world267(paw).sub(old.world),pole:this.world267(c.bones[1]).sub(before267.get(c.bones[1].name)!.world),third:c.limb.startsWith('H')?this.world267(paw).sub(this.world267(c.bones[2])).sub(old.world.clone().sub(before267.get(c.bones[2].name)!.world)):new Vector3(),rotation:this.quaternion267(paw).multiply(old.rotation.clone().invert())});}
  }
  diagnostic.preparation267=preparation?{...preparation,name:prepName,time:prep.cycleStart+(prep.cycleEnd-prep.cycleStart)*preparation.progress,policy:'ZERO_ENDPOINT_RELATIVE_ROTATION_CHART_NOT_COMPLETE_ACTION'}:null;
  this.rotation(head,headRotation);'''
assert needle in s;s=s.replace(needle,replacement)
s=s.replace("   const scale=chain.bones[0].getWorldScale(new Vector3()).x;", "   const correction267=prepared267.get(limb);if(correction267){target.add(correction267.goal);pole.add(correction267.pole);third.add(correction267.third);}\n   const scale=chain.bones[0].getWorldScale(new Vector3()).x;")
s=s.replace("foot:any={limb,roles", "foot:any={limb,roles") # rotation is const; premultiply after declaration
s=s.replace("diagnostic.feet.push(foot);", "diagnostic.feet.push(foot);if(correction267)rotation.premultiply(correction267.rotation);")
# Each rotation() already updates the written bone and its descendants; no other writer between solve and affine read.
s=s.replace('    this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);','    this.soles.beginPose(false);')
s=s.replace('diagnostic.costMs=performance.now()-start;return diagnostic;', 'diagnostic.poseSchedule267={...this.schedule267};diagnostic.costMs=performance.now()-start;return diagnostic;')
s=s.replace('  this.grounded250.cancel("COMPLETE_ACTION_"+name);','  this.begin267();this.chart267.cancel();this.grounded250.cancel("COMPLETE_ACTION_"+name);')
(H/'sourceTask267.ts').write_text(s)
n=(B/'nativeOwner256.ts').read_text().replace("import {SourceTask256} from '../overhaul-grounded-motion-256/sourceTask256';","import {SourceTask267} from './sourceTask267';\nimport {PreparationControl267} from './preparation267';").replace('SourceTask256','SourceTask267')
n=n.replace("'FelineTransitionArc106']);","'FelineTransitionArc106','FelinePrepareUp264','FelinePrepareDown264']);")
n=n.replace('expected:45','expected:47').replace('clips.length!==45||actual.size!==45||Object.keys(contract.clips).length!==45','clips.length!==47||actual.size!==47||Object.keys(contract.clips).length!==47').replace('214_61_45_4_SCALE_CONTRACT','267_61_47_4_SCALE_CONTRACT')
n=n.replace(' private phase=0;', ' private preparation267=new PreparationControl267();private phase=0;')
old="const age=Math.max(0,t-s.stanceChangedAt),u=Math.min(1,age/STANCE_TRANSITION),stance=s.stance==='upright'?u:1-u,up=s.stance==='upright',speed=dt>0?p.distance/dt:0;"
new="const age=Math.max(0,t-s.stanceChangedAt),u=Math.min(1,age/STANCE_TRANSITION),up=s.stance==='upright',rawStance=up?u:1-u,speed=dt>0?p.distance/dt:0;if(reset)this.preparation267.reset(rawStance);const prepared=this.preparation267.step(s.jumpEpoch+':'+s.stanceChangedAt+':'+s.stance,up,u),stance=prepared.stance;"
assert old in n;n=n.replace(old,new)
n=n.replace('this.task?.cancelGround250("UNSUPPORTED_ACTION");','this.task?.cancelGround250("UNSUPPORTED_ACTION");this.task?.cancelPreparation267();')
n=n.replace('bodyFrame:body.matrixWorld.toArray(),complete}', 'bodyFrame:body.matrixWorld.toArray(),preparation267:prepared.request,complete}')
n=n.replace('this.travelWeight,clocks);','this.travelWeight,clocks,prepared.request);')
(H/'nativeOwner267.ts').write_text(n)
shutil.copy2(B/'NativeActor256.tsx',H/'NativeActor267.tsx')
a=(H/'NativeActor267.tsx').read_text().replace("from './nativeOwner218'","from './nativeOwner267'")
# Actual overlay aliases canonical NativeActor222 and nativeOwner218 to these two files, keeping one registry.
(H/'NativeActor267.tsx').write_text(a)
shutil.copy2(B/'visualRegistry256.typecheck.ts',H/'visualRegistry267.typecheck.ts')
a=a.replace("from '../../src/game/camera/visualRegistry'","from './visualRegistry267.typecheck'")
(H/'NativeActor267.typecheck.tsx').write_text(a)
(H/'tsconfig267.json').write_text(json.dumps({'extends':'../../tsconfig.json','include':['sourceTask267.ts','preparation267.ts','nativeOwner267.ts','NativeActor267.typecheck.tsx','composed267.test.ts']}))
