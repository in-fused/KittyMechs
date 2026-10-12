import {PreparationChart267,type Preparation267} from './preparation274';
import {AnimationMixer,Bone,Matrix3,Matrix4,Object3D,Quaternion,Vector3,type AnimationClip} from 'three';
import {SkinSole256} from '../overhaul-grounded-motion-256/skinSole256';
import {GroundedFeet256,type GroundContext253} from '../overhaul-grounded-motion-256/groundedFeet256';
import type {GroundSupport067} from '../../src/game/entities/groundSupport067';
import {sourceGaitTime171} from '../../src/game/entities/sourceCycle171';
import basis202 from '../../assets/source/overhaul-anatomy-motion-202/anatomical-basis202.json';

const limbs=['FL','FR','HL','HR'] as const,up=new Vector3().fromArray(basis202.gltfUp),wrap=(n:number)=>n-Math.floor(n);
type Item={name:string;weight:number};
type Pose={p:Vector3;q:Quaternion;s:Vector3;world:Vector3;rotation:Quaternion};
type Sample={item:Item;pose:Map<string,Pose>;record:any};
const meanQ=(rows:{q:Quaternion;w:number}[])=>{const q=rows[0].q.clone();let sum=rows[0].w;for(const r of rows.slice(1)){q.slerp(r.q,r.w/(sum+r.w));sum+=r.w;}return q;};

/** SOURCE-PLANE task composer. No world anchor, native support/contact claim,
 * root-height correction or alternate actor authority. All topology cached. */
export class SourceTask274 {
 private grounded250:GroundedFeet256;private chart267=new PreparationChart267();private samples267=new Map<string,Map<string,Pose>>();private active267:any=null;private schedule267={samples:0,hits:0};
 private begin267(){this.samples267.clear();this.schedule267={samples:0,hits:0};if(this.model.parent)this.mount.matrix.copy(this.model.parent.matrixWorld);else this.mount.matrix.identity();}
 cancelPreparation267(){this.chart267.cancel();}
 private world267(o:Object3D){return new Vector3().setFromMatrixPosition(o.matrixWorld);}
 private quaternion267(o:Object3D){const q=new Quaternion();o.matrixWorld.decompose(new Vector3(),q,new Vector3());return q;}
 setGroundContext253(context:GroundContext253){this.grounded250.context(context);}
 cancelGround250(reason:string){this.grounded250.cancel(reason);}
 readonly soles:SkinSole256;readonly bones:Bone[];private graph:Object3D;private mount=new Object3D();private mixer:AnimationMixer;private actions=new Map<string,any>();private graphBones=new Map<string,Bone>();private chains:any[]=[];private rest=new Map<Bone,{p:Vector3;s:Vector3}>();
 constructor(readonly model:Object3D,clips:AnimationClip[],readonly catalog:any){
  const copy=(o:Object3D):Object3D=>{const n=o instanceof Bone?new Bone():new Object3D();n.name=o.name;n.position.copy(o.position);n.quaternion.copy(o.quaternion);n.scale.copy(o.scale);for(const c of o.children)n.add(copy(c));return n;};
  this.graph=copy(model);this.mount.matrixAutoUpdate=false;this.mount.add(this.graph);this.mixer=new AnimationMixer(this.graph);
  for(const c of clips){const a=this.mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);this.actions.set(c.name,a);}
  this.bones=[];model.traverse(o=>{if(o instanceof Bone){this.bones.push(o);this.rest.set(o,{p:o.position.clone(),s:o.scale.clone()});}});this.graph.traverse(o=>{if(o instanceof Bone)this.graphBones.set(o.name,o);});
  if(this.bones.length!==61)throw Error('202_EXACT61_RIG');
  for(const limb of limbs){const names=[limb+'_upper',limb+'_lower',...(limb.startsWith('H')?[limb+'_hock']:[]),limb+'_paw'],bones=names.map(n=>model.getObjectByName(n) as Bone);if(bones.some(b=>!b?.isBone)||bones.slice(1).some((b,i)=>b.parent!==bones[i]))throw Error('202_FIXED_CHAIN_TOPOLOGY:'+limb);this.chains.push({limb,bones,lengths:bones.slice(1).map(b=>b.position.length())});}
  this.soles=new SkinSole256(model);this.grounded250=new GroundedFeet256(model,this.chains,this.soles,(chain,target,rotation,third,pole,operands)=>this.solve(chain,target,rotation,third,pole,operands),(bone,rotation)=>this.rotation(bone,rotation),catalog);
 }
 private source(item:Item,phase:number,idleClocks:Record<string,number>={},overrideTime?:number):Sample{
  const action=this.actions.get(item.name),record=this.catalog[item.name]?.measuredGait;if(!action)throw Error('202_MISSING_SOURCE_ACTION:'+item.name);
  const time=overrideTime!==undefined?overrideTime:record?sourceGaitTime171(item.name,record,phase):idleClocks[item.name]??0,key=item.name+':'+time;
  const cached=this.samples267.get(key);if(cached){this.schedule267.hits++;return {item,pose:cached,record};}
  if(this.active267)this.active267.setEffectiveWeight(0);this.active267=action;
  action.time=time;action.setEffectiveWeight(1);this.mixer.update(0);this.mount.updateMatrixWorld(true);
  const pose=new Map<string,Pose>();for(const [name,b] of this.graphBones)pose.set(name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),world:this.world267(b),rotation:this.quaternion267(b)});
  this.samples267.set(key,pose);this.schedule267.samples++;return {item,pose,record};
 }
 private rotation(b:Bone,q:Quaternion){this.soles.invalidatePose256();b.quaternion.copy(this.quaternion267(b.parent!).invert().multiply(q));b.updateWorldMatrix(false,true);}
 private aim(b:Bone,child:Bone,target:Vector3){const hip=this.world267(b),from=this.world267(child).sub(hip),to=target.clone().sub(hip);if(from.lengthSq()<1e-16||to.lengthSq()<1e-16)throw Error('202_ZERO_CHAIN_DIRECTION');this.rotation(b,new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(this.quaternion267(b)));}
 private solve(chain:any,target:Vector3,rotation:Quaternion,third:Vector3,pole:Vector3,operands:any){
  const [upper,lower,hock,pawMaybe]=chain.bones,paw=pawMaybe??hock,hip=this.world267(upper),scale=upper.getWorldScale(new Vector3()).x,l1=chain.lengths[0]*scale,l2=chain.lengths[1]*scale,end=target.clone().sub(third),delta=end.clone().sub(hip),distance=delta.length(),minimum=Math.abs(l1-l2)+1e-6*scale,maximum=l1+l2-1e-6*scale;
  Object.assign(operands,{limb:chain.limb,hip:hip.toArray(),ankle:target.toArray(),twoSegmentEndpoint:end.toArray(),minimum,maximum,distance,third:third.toArray(),pole:pole.toArray()});
  if(distance<=minimum||distance>=maximum)throw Error('202_SOURCE_TASK_UNREACHABLE:'+chain.limb);
  const axis=delta.divideScalar(distance),bend=pole.clone().sub(hip);bend.addScaledVector(axis,-bend.dot(axis));if(bend.length()<1e-8*scale)throw Error('202_SOURCE_POLE_DEGENERATE:'+chain.limb);
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),knee=hip.clone().addScaledVector(axis,along).addScaledVector(bend.normalize(),height);
  this.aim(upper,lower,knee);this.aim(lower,hock,end);if(pawMaybe)this.aim(hock,pawMaybe,target);this.rotation(paw,rotation);
 }
 step(items:Item[],phase:number,stance:number,travelWeight=1,idleClocks:Record<string,number>={},preparation?:Preparation267){
  this.begin267();
  const start=performance.now(),frame=this.model.parent?.matrixWorld.clone()??new Matrix4(),planePoint=new Vector3().applyMatrix4(frame),planeNormal=up.clone().applyMatrix3(new Matrix3().getNormalMatrix(frame)).normalize(),frameX=new Vector3(1,0,0).transformDirection(frame),frameUp=up.clone().transformDirection(frame),frameScale=new Vector3(0,1,0).applyMatrix4(frame).distanceTo(planePoint),requestedTravelWeight=travelWeight;if(!items.some(x=>x.weight>0))travelWeight=0;
  const positive=items.filter(x=>x.weight>0).map(x=>({...x,weight:x.weight*travelWeight}));if(travelWeight<1)positive.push({name:'FelineIdle',weight:(1-travelWeight)*(1-stance)},{name:'FelineUprightIdle',weight:(1-travelWeight)*stance});
  if(positive.some(x=>x.weight>0&&!this.catalog[x.name]?.measuredGait&&!['FelineIdle','FelineUprightIdle'].includes(x.name)))throw Error('202_COMPLETE_ACTION_OWNER_REQUIRED');
  const samples=positive.filter(x=>x.weight>0).map(item=>this.source(item,phase,idleClocks)),idleFore=samples.some(s=>s.item.name==='FelineUprightIdle')?this.source({name:'FelineUprightWalkLong',weight:1},phase):null,total=samples.reduce((s,x)=>s+x.item.weight,0),diagnostic:any={phase,stance,travelWeight,requestedTravelWeight,idleClocks,positive:samples.map(s=>s.item),sourceFrame:{matrix:frame.toArray(),planePoint:planePoint.toArray(),planeNormal:planeNormal.toArray(),uniformScale:frameScale},feet:[],contactQualified:false,policy:'PHASE_CONDITIONED_SOURCE_TASKS_NOT_NATIVE_CONTACT'};
  if(!total)throw Error('202_NO_SOURCE_OWNER');
  this.soles.invalidatePose256();
  for(const b of this.bones){b.position.set(0,0,0);b.scale.set(0,0,0);for(const s of samples){const p=s.pose.get(b.name)!;b.position.addScaledVector(p.p,s.item.weight/total);b.scale.addScaledVector(p.s,s.item.weight/total);}b.quaternion.copy(meanQ(samples.map(s=>({q:idleFore&&s.item.name==='FelineUprightIdle'&&(/^(FL|FR)_(digit|claw|scapula202)_/.test(b.name)||['pelvis','lumbar202','spine','thorax202','chest','head','FL_scapula202','FR_scapula202'].includes(b.name))?idleFore.pose.get(b.name)!.q:s.pose.get(b.name)!.q,w:s.item.weight}))));const rest=this.rest.get(b)!;if((b.name!=='root'&&b.position.distanceTo(rest.p)>2e-5)||b.scale.distanceTo(rest.s)>2e-5)throw Error('202_SOURCE_LOCAL_TRANSLATION_SCALE:'+b.name);}
  this.model.updateWorldMatrix(true,true);
  const head=this.model.getObjectByName('head') as Bone,headRotation=meanQ(samples.map(s=>({q:s.pose.get('head')!.rotation,w:s.item.weight}))),prepared267=new Map<string,{goal:Vector3;pole:Vector3;third:Vector3;rotation:Quaternion}>();
  const names267=this.bones.map(b=>b.name);
  const prepName=preparation?.direction==='up'?'FelinePrepareUp264':'FelinePrepareDown264',prep=this.catalog[prepName]?.preparation;
  const chart=this.chart267.evaluate(preparation,names267,part=>{if(!prep)throw Error('267_MISSING_PREPARATION_METADATA:'+prepName);const u=part==='start'?0:part==='end'?1:preparation!.progress;return this.source({name:prepName,weight:1},phase,{},prep.cycleStart+(prep.cycleEnd-prep.cycleStart)*u).pose;});
  if(chart.size){const before267=new Map(names267.map(n=>{const b=this.model.getObjectByName(n)!;return [n,{world:this.world267(b),rotation:this.quaternion267(b)}] as const;}));this.soles.invalidatePose256();for(const b of this.bones){const q=chart.get(b.name);if(q)b.quaternion.premultiply(q);}this.model.updateWorldMatrix(true,true);
   for(const c of this.chains){const n=c.limb+'_paw',old=before267.get(n)!,paw=this.model.getObjectByName(n)!;prepared267.set(c.limb,{goal:this.world267(paw).sub(old.world),pole:this.world267(c.bones[1]).sub(before267.get(c.bones[1].name)!.world),third:c.limb.startsWith('H')?this.world267(paw).sub(this.world267(c.bones[2])).sub(old.world.clone().sub(before267.get(c.bones[2].name)!.world)):new Vector3(),rotation:this.quaternion267(paw).multiply(old.rotation.clone().invert())});}
  }
  diagnostic.preparation267=preparation?{...preparation,name:prepName,time:prep.cycleStart+(prep.cycleEnd-prep.cycleStart)*preparation.progress,policy:'ZERO_ENDPOINT_RELATIVE_ROTATION_CHART_NOT_COMPLETE_ACTION'}:null;
  this.rotation(head,headRotation);
  for(const chain of this.chains){
   const limb=chain.limb,pawName=limb+'_paw',target=new Vector3(),third=new Vector3(),pole=new Vector3();let desiredHeight=0;const roles:any[]=[];
   for(const s of samples){const w=s.item.weight/total,p=s.pose.get(pawName)!,goal=p.world.clone();
    if(idleFore&&s.item.name==='FelineUprightIdle'&&limb.startsWith('F')){const hip=s.pose.get(limb+'_upper')!.world;goal.copy(hip).add(idleFore.pose.get(pawName)!.world.clone().sub(idleFore.pose.get(limb+'_upper')!.world));}
    target.addScaledVector(goal,w);pole.addScaledVector(idleFore&&s.item.name==='FelineUprightIdle'&&limb.startsWith('F')?s.pose.get(limb+'_upper')!.world.clone().add(idleFore.pose.get(limb+'_lower')!.world.clone().sub(idleFore.pose.get(limb+'_upper')!.world)):s.pose.get(limb+'_lower')!.world,w);if(limb.startsWith('H'))third.addScaledVector(p.world.clone().sub(s.pose.get(limb+'_hock')!.world),w);
    if(s.record){const r=s.record,q=wrap(phase-r.sourceOffsets.HL+r.sourceOffsets[limb]),unloaded=r.unloadedLimbs.includes(limb),role=unloaded?'unloaded':q<r.sourceDuty?'stance':'recovery';roles.push({clip:s.item.name,weight:s.item.weight,q,role});if(!unloaded&&q>=r.sourceDuty){const z=(q-r.sourceDuty)/(1-r.sourceDuty),lift=s.item.name==='FelineGallop'?.24:s.item.name.includes('Upright')?.17:.13;desiredHeight+=w*frameScale*lift*64*z*z*z*(1-z)*(1-z)*(1-z);}}
    else roles.push({clip:s.item.name,weight:s.item.weight,role:s.item.name==='FelineUprightIdle'&&limb.startsWith('F')?'unloaded':'stance',provenance:'AUTHORED_IDLE_SOURCE_PLANE_TASK_NOT_NATIVE_SUPPORT'});
   }
   const correction267=prepared267.get(limb);if(correction267){target.add(correction267.goal);pole.add(correction267.pole);third.add(correction267.third);}
   const scale=chain.bones[0].getWorldScale(new Vector3()).x;if(limb.startsWith('H'))third.normalize().multiplyScalar(chain.lengths[2]*scale);
   const rotation=meanQ(samples.map(s=>({q:idleFore&&s.item.name==='FelineUprightIdle'&&limb.startsWith('F')?idleFore.pose.get(pawName)!.rotation:s.pose.get(pawName)!.rotation,w:s.item.weight}))),foot:any={limb,roles,desiredHeight,corrections:[],sourceLoaded:roles.every(x=>x.role==='stance')};diagnostic.feet.push(foot);if(correction267)rotation.premultiply(correction267.rotation);
   // A continuous outboard unload arc; no direction-selected pose switch.
   if(limb.startsWith('F')&&stance>0){const loft=Math.sin(Math.PI*stance),side=basis202.side[limb as keyof typeof basis202.side],reach=(chain.lengths[0]+chain.lengths[1])*scale;target.addScaledVector(frameX,side*.10*reach*loft).addScaledVector(frameUp,.10*reach*loft);foot.role='fore-unloaded';}
   const unloaded=limb.startsWith('F')&&stance>0;if(unloaded)foot.sourceLoaded=false;
   for(let pass=0;pass<(unloaded?1:3);pass++){
    const request:any={pass};foot.corrections.push(request);try{this.solve(chain,target,rotation,third,pole,request);}catch(error){(error as any).operands=diagnostic;throw error;}
    this.soles.beginPose(false);const minimum=this.soles.minimum(limb,planePoint,planeNormal);request.padNormal=minimum.gap;if(unloaded)break;
    const correction=desiredHeight-minimum.gap;if(Math.abs(correction)<2e-5)break;target.addScaledVector(planeNormal,correction);
   }
   this.soles.beginPose(false);foot.finalPadGap=this.soles.minimum(limb,planePoint,planeNormal).gap;foot.ankle=chain.bones.at(-1).getWorldPosition(new Vector3()).toArray();foot.elbow=chain.bones[1].getWorldPosition(new Vector3()).toArray();const chest=this.model.getObjectByName('chest')!.getWorldPosition(new Vector3());foot.sourceSide=basis202.side[limb as keyof typeof basis202.side];foot.elbowOutboard=new Vector3().fromArray(foot.elbow).sub(chest).dot(frameX)*foot.sourceSide;if(unloaded&&foot.elbowOutboard<=0){(diagnostic as any).failure='202_FORE_ELBOW_WRONG_HEMISPHERE';throw Object.assign(Error('202_FORE_ELBOW_WRONG_HEMISPHERE'),{operands:diagnostic});}
   if(unloaded){const headPoint=this.model.getObjectByName('head')!.getWorldPosition(new Vector3()),headPivot=headPoint.clone().sub(planePoint).dot(planeNormal);foot.headPivotHeight=headPivot;foot.foreAnkleBelowHeadPivot=new Vector3().fromArray(foot.ankle).sub(planePoint).dot(planeNormal)<headPivot;}
  }
  diagnostic.grounded250=this.grounded250.apply(diagnostic);diagnostic.poseSchedule267={...this.schedule267};diagnostic.costMs=performance.now()-start;return diagnostic;
 }
 completeAction202(name:string,time:number){
  this.begin267();this.chart267.cancel();this.grounded250.cancel("COMPLETE_ACTION_"+name);
  const s=this.source({name,weight:1},0,{},time);
  this.soles.invalidatePose256();
  for(const b of this.bones){const p=s.pose.get(b.name)!;b.position.copy(p.p);b.quaternion.copy(p.q);b.scale.copy(p.s);}
  this.model.updateWorldMatrix(true,true);return {policy:'COMPLETE_RETARGETED_ORIGINAL_SOURCE_ACTION',name,time,contactQualified:false};
 }

}
