import {AnimationMixer,Bone,Object3D,Quaternion,Vector3,type AnimationClip} from 'three';
import {SkinSole164} from '../../src/game/entities/sourceCoordination164';
import {sourceGaitTime171} from '../../src/game/entities/sourceCycle171';

const limbs=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0),wrap=(n:number)=>n-Math.floor(n);
type Item={name:string;weight:number};
type Pose={p:Vector3;q:Quaternion;s:Vector3;world:Vector3;rotation:Quaternion};
type Sample={item:Item;pose:Map<string,Pose>;record:any};
const meanQ=(rows:{q:Quaternion;w:number}[])=>{const q=rows[0].q.clone();let sum=rows[0].w;for(const r of rows.slice(1)){q.slerp(r.q,r.w/(sum+r.w));sum+=r.w;}return q;};

/** SOURCE-PLANE task composer. No world anchor, native support/contact claim,
 * root-height correction or alternate actor authority. All topology cached. */
export class SourceTask197 {
 readonly soles:SkinSole164;readonly bones:Bone[];private graph:Object3D;private mount=new Object3D();private mixer:AnimationMixer;private actions=new Map<string,any>();private graphBones=new Map<string,Bone>();private chains:any[]=[];private rest=new Map<Bone,{p:Vector3;s:Vector3}>();
 constructor(readonly model:Object3D,clips:AnimationClip[],readonly catalog:any){
  const copy=(o:Object3D):Object3D=>{const n=o instanceof Bone?new Bone():new Object3D();n.name=o.name;n.position.copy(o.position);n.quaternion.copy(o.quaternion);n.scale.copy(o.scale);for(const c of o.children)n.add(copy(c));return n;};
  this.graph=copy(model);this.mount.matrixAutoUpdate=false;this.mount.add(this.graph);this.mixer=new AnimationMixer(this.graph);
  for(const c of clips){const a=this.mixer.clipAction(c);a.play();a.paused=true;a.setEffectiveWeight(0);this.actions.set(c.name,a);}
  this.bones=[];model.traverse(o=>{if(o instanceof Bone){this.bones.push(o);this.rest.set(o,{p:o.position.clone(),s:o.scale.clone()});}});this.graph.traverse(o=>{if(o instanceof Bone)this.graphBones.set(o.name,o);});
  if(this.bones.length!==57)throw Error('197_EXACT57_RIG');
  for(const limb of limbs){const names=[limb+'_upper',limb+'_lower',...(limb.startsWith('H')?[limb+'_hock']:[]),limb+'_paw'],bones=names.map(n=>model.getObjectByName(n) as Bone);if(bones.some(b=>!b?.isBone)||bones.slice(1).some((b,i)=>b.parent!==bones[i]))throw Error('197_FIXED_CHAIN_TOPOLOGY:'+limb);this.chains.push({limb,bones,lengths:bones.slice(1).map(b=>b.position.length())});}
  this.soles=new SkinSole164(model);
 }
 private source(item:Item,phase:number,idleClocks:Record<string,number>={}):Sample{
  if(this.model.parent)this.mount.matrix.copy(this.model.parent.matrixWorld);else this.mount.matrix.identity();
  for(const a of this.actions.values())a.setEffectiveWeight(0);
  const action=this.actions.get(item.name),record=this.catalog[item.name]?.measuredGait;if(!action)throw Error('197_MISSING_SOURCE_ACTION:'+item.name);
  action.time=record?sourceGaitTime171(item.name,record,phase):idleClocks[item.name]??0;action.setEffectiveWeight(1);this.mixer.update(0);this.mount.updateMatrixWorld(true);
  const pose=new Map<string,Pose>();for(const [name,b] of this.graphBones)pose.set(name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),world:b.getWorldPosition(new Vector3()),rotation:b.getWorldQuaternion(new Quaternion())});return {item,pose,record};
 }
 private rotation(b:Bone,q:Quaternion){b.quaternion.copy(b.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
 private aim(b:Bone,child:Bone,target:Vector3){const hip=b.getWorldPosition(new Vector3()),from=child.getWorldPosition(new Vector3()).sub(hip),to=target.clone().sub(hip);if(from.lengthSq()<1e-16||to.lengthSq()<1e-16)throw Error('197_ZERO_CHAIN_DIRECTION');this.rotation(b,new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(b.getWorldQuaternion(new Quaternion())));}
 private solve(chain:any,target:Vector3,rotation:Quaternion,third:Vector3,pole:Vector3,operands:any){
  const [upper,lower,hock,pawMaybe]=chain.bones,paw=pawMaybe??hock,hip=upper.getWorldPosition(new Vector3()),scale=upper.getWorldScale(new Vector3()).x,l1=chain.lengths[0]*scale,l2=chain.lengths[1]*scale,end=target.clone().sub(third),delta=end.clone().sub(hip),distance=delta.length(),minimum=Math.abs(l1-l2)+1e-6*scale,maximum=l1+l2-1e-6*scale;
  Object.assign(operands,{limb:chain.limb,hip:hip.toArray(),ankle:target.toArray(),twoSegmentEndpoint:end.toArray(),minimum,maximum,distance,third:third.toArray(),pole:pole.toArray()});
  if(distance<=minimum||distance>=maximum)throw Error('197_SOURCE_TASK_UNREACHABLE:'+chain.limb);
  const axis=delta.divideScalar(distance),bend=pole.clone().sub(hip);bend.addScaledVector(axis,-bend.dot(axis));if(bend.length()<1e-8*scale)throw Error('197_SOURCE_POLE_DEGENERATE:'+chain.limb);
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),knee=hip.clone().addScaledVector(axis,along).addScaledVector(bend.normalize(),height);
  this.aim(upper,lower,knee);this.aim(lower,hock,end);if(pawMaybe)this.aim(hock,pawMaybe,target);this.rotation(paw,rotation);
 }
 step(items:Item[],phase:number,stance:number,travelWeight=1,idleClocks:Record<string,number>={}){
  const start=performance.now(),requestedTravelWeight=travelWeight;if(!items.some(x=>x.weight>0))travelWeight=0;
  const positive=items.filter(x=>x.weight>0).map(x=>({...x,weight:x.weight*travelWeight}));if(travelWeight<1)positive.push({name:'FelineIdle',weight:(1-travelWeight)*(1-stance)},{name:'FelineUprightIdle',weight:(1-travelWeight)*stance});
  const samples=positive.filter(x=>x.weight>0).map(item=>this.source(item,phase,idleClocks)),idleFore=samples.some(s=>s.item.name==='FelineUprightIdle')?this.source({name:'FelineUprightWalkLong',weight:1},phase):null,total=samples.reduce((s,x)=>s+x.item.weight,0),diagnostic:any={phase,stance,travelWeight,requestedTravelWeight,idleClocks,positive:samples.map(s=>s.item),feet:[],contactQualified:false,policy:'PHASE_CONDITIONED_SOURCE_TASKS_NOT_NATIVE_CONTACT'};
  if(!total)throw Error('197_NO_SOURCE_OWNER');
  for(const b of this.bones){b.position.set(0,0,0);b.scale.set(0,0,0);for(const s of samples){const p=s.pose.get(b.name)!;b.position.addScaledVector(p.p,s.item.weight/total);b.scale.addScaledVector(p.s,s.item.weight/total);}b.quaternion.copy(meanQ(samples.map(s=>({q:idleFore&&s.item.name==='FelineUprightIdle'&&/^(FL|FR)_(digit|claw)_/.test(b.name)?idleFore.pose.get(b.name)!.q:s.pose.get(b.name)!.q,w:s.item.weight}))));const rest=this.rest.get(b)!;if((b.name!=='root'&&b.position.distanceTo(rest.p)>2e-5)||b.scale.distanceTo(rest.s)>2e-5)throw Error('197_SOURCE_LOCAL_TRANSLATION_SCALE:'+b.name);}
  this.model.updateWorldMatrix(true,true);
  for(const chain of this.chains){
   const limb=chain.limb,pawName=limb+'_paw',target=new Vector3(),third=new Vector3(),pole=new Vector3();let desiredHeight=0;const roles:any[]=[];
   for(const s of samples){const w=s.item.weight/total,p=s.pose.get(pawName)!,goal=p.world.clone();
    if(idleFore&&s.item.name==='FelineUprightIdle'&&limb.startsWith('F')){const reach=(chain.lengths[0]+chain.lengths[1])*chain.bones[0].getWorldScale(new Vector3()).x,side=limb==='FL'?-1:1,beat=Math.sin(2*Math.PI*(phase+(limb==='FL'?0:.5))),x=new Vector3(1,0,0),forward=new Vector3(0,0,1);if(this.model.parent){x.transformDirection(this.model.parent.matrixWorld);forward.transformDirection(this.model.parent.matrixWorld);}goal.copy(s.pose.get(limb+'_upper')!.world).addScaledVector(x,side*.18*reach).addScaledVector(forward,(.24+.14*beat)*reach).addScaledVector(up,-.4*reach);}
    target.addScaledVector(goal,w);pole.addScaledVector(s.pose.get(limb+'_lower')!.world,w);if(limb.startsWith('H'))third.addScaledVector(p.world.clone().sub(s.pose.get(limb+'_hock')!.world),w);
    if(s.record){const r=s.record,q=wrap(phase-r.sourceOffsets.HL+r.sourceOffsets[limb]),unloaded=r.unloadedLimbs.includes(limb),role=unloaded?'unloaded':q<r.sourceDuty?'stance':'recovery';roles.push({clip:s.item.name,weight:s.item.weight,q,role});if(!unloaded&&q>=r.sourceDuty){const z=(q-r.sourceDuty)/(1-r.sourceDuty),lift=s.item.name==='FelineGallop'?.24:s.item.name.includes('Upright')?.17:.13;desiredHeight+=w*.8*lift*64*z*z*z*(1-z)*(1-z)*(1-z);}}
    else roles.push({clip:s.item.name,weight:s.item.weight,role:s.item.name==='FelineUprightIdle'&&limb.startsWith('F')?'unloaded':'stance',provenance:'AUTHORED_IDLE_SOURCE_PLANE_TASK_NOT_NATIVE_SUPPORT'});
   }
   const scale=chain.bones[0].getWorldScale(new Vector3()).x;if(limb.startsWith('H'))third.normalize().multiplyScalar(chain.lengths[2]*scale);
   const rotation=meanQ(samples.map(s=>({q:idleFore&&s.item.name==='FelineUprightIdle'&&limb.startsWith('F')?idleFore.pose.get(pawName)!.rotation:s.pose.get(pawName)!.rotation,w:s.item.weight}))),foot:any={limb,roles,desiredHeight,corrections:[],sourceLoaded:roles.every(x=>x.role==='stance')};diagnostic.feet.push(foot);
   // A continuous outboard unload arc; no direction-selected pose switch.
   if(limb.startsWith('F')&&stance>0){const loft=Math.sin(Math.PI*stance),side=limb==='FL'?1:-1,reach=(chain.lengths[0]+chain.lengths[1])*scale;target.x+=side*.10*reach*loft;target.y+=.10*reach*loft;foot.role='fore-unloaded';}
   const unloaded=limb.startsWith('F')&&stance>0;
   for(let pass=0;pass<(unloaded?1:3);pass++){
    const request:any={pass};foot.corrections.push(request);try{this.solve(chain,target,rotation,third,pole,request);}catch(error){(error as any).operands=diagnostic;throw error;}
    this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);const minimum=this.soles.minimum(limb,new Vector3(),up);request.padNormal=minimum.gap;if(unloaded)break;
    const correction=desiredHeight-minimum.gap;if(Math.abs(correction)<2e-5)break;target.y+=correction;
   }
   this.soles.beginPose(false);foot.finalPadGap=this.soles.minimum(limb,new Vector3(),up).gap;foot.ankle=chain.bones.at(-1).getWorldPosition(new Vector3()).toArray();
   if(unloaded){const jaw=this.model.getObjectByName('head')!.getWorldPosition(new Vector3()).y;foot.jawHeight=jaw;foot.foreAnkleBelowJaw=foot.ankle[1]<jaw;}
  }
  diagnostic.costMs=performance.now()-start;return diagnostic;
 }
}
