import assert from 'node:assert/strict';
import {Camera,Group,SkinnedMesh,Vector3} from 'three';
import {observeContact246} from './contactObservation246';
// Numeric observation seam, not decoded-rig/contact/native gameplay evidence.
const model=new Group(),meshes=Array.from({length:4},()=>new SkinnedMesh());for(const m of meshes)model.add(m);
let previousCalls=0,begins=0,minimums=0,queries=0,valid=true,leaseSerial=1;
for(const m of meshes)m.onAfterRender=()=>{previousCalls++;};
const diagnostic:any={mode:'ordinary',status:'source',phase:.1,stance:.5,placement:{nativeShape:{halfHeight:1.18,borderRadius:.12}},sourceTasks:{feet:['FL','FR','HL','HR'].map(limb=>({limb,sourceLoaded:!limb.startsWith('F'),role:limb.startsWith('F')?'fore-unloaded':undefined,roles:[{role:'stance',q:.1}],desiredHeight:0,finalPadGap:0}))}};
const soles:any={beginPose(refresh:boolean){assert.equal(refresh,false);begins++;},minimum(limb:string,p:Vector3,n:Vector3){minimums++;return {gap:new Vector3(0,.03,0).sub(p).dot(n),world:new Vector3(0,.03,0),vertices:701};}};
const support:any={diagnostic:{},begin(){},probe(){queries++;return {point:new Vector3(),normal:new Vector3(0,1,0),lease:{ownerKey:String(leaseSerial)}};},validate(){return valid;}};
const camera=new Camera(),shadow=new Camera(),observer=observeContact246(model,soles,support,diagnostic),renderer:any={getRenderTarget:()=>null};
const frame=(clock:number,extra={})=>observer.frame({camera,root:model,providerOwned:()=>true,clock,time:clock,generation:1,life:2,reset:false,visible:true,diagnostic,...extra});
const draw=(cam=camera,count=4)=>{for(const m of meshes.slice(0,count))m.onAfterRender(renderer,{} as any,cam,{} as any,{} as any,{} as any);};
frame(1);draw(shadow);assert.equal(begins,0);draw(camera,3);assert.equal(begins,0);draw();assert.equal(begins,1);assert.equal(queries,4);assert.equal(minimums,8);assert.equal(diagnostic.grounded246.feet[0].sourceLoaded,false);assert.equal(diagnostic.grounded246.feet[0].normalGap,.03);assert.equal(diagnostic.grounded246.feet[0].wholePadVertices,701);assert.equal(diagnostic.grounded246.contactQualified,false);
frame(1.05);draw();assert.equal(begins,1);frame(1.11);draw();assert.equal(begins,2);
valid=false;frame(1.22);draw();assert.ok(diagnostic.grounded246.feet.every((f:any)=>f.supportStatus==='UNKNOWN'&&f.normalGap===null));
frame(1.33,{visible:false});draw();assert.equal(begins,3);assert.equal(diagnostic.grounded246.status,'INACTIVE');
observer.dispose();draw();assert.equal(begins,3);assert.ok(previousCalls>0);
console.log(JSON.stringify({status:'PASS_OBSERVATION_SEAM_ONLY',assertions:17,begins,queries,minimums,previousCalls,decodedRig:false,nativeTrajectory:false}));
