/** ONE root-gated EXACT RAW121 data delivery; actual browser loader gate remains mandatory. */
import {readFile,writeFile,mkdir,access,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3,Quaternion} from 'three';
const ROOT=resolve(import.meta.dirname,'../..'),HERE=resolve(import.meta.dirname),OUT=resolve(HERE,'output');
const source=resolve(ROOT,'assets/source/overhaul-pounce-anatomy-121/Pounce_Motion121.temporary.glb');
const publicPath=resolve(ROOT,'public/assets/models/Pounce_Anatomy121.glb');
const sha=x=>createHash('sha256').update(x).digest('hex');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(n,v)=>writeFile(resolve(OUT,n),JSON.stringify(v,null,2)+'\n');
const fresh=async p=>{try{await access(p);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('FRESH_OUTPUT_REQUIRED:'+p);};
const arr=a=>a?{type:a.getType(),componentType:a.getComponentType(),normalized:a.getNormalized(),count:a.getCount(),data:sha(Buffer.from(a.getArray().buffer,a.getArray().byteOffset,a.getArray().byteLength))}:null;
const named=x=>x?.getName()??null;
// Stable semantic identity ignores buffer placement/accessor sharing only. All
// decoded arrays, mesh topology/order, skin weights/binds and tracks are exact.
function snapshot(doc){
 const r=doc.getRoot();
 const primitive=p=>({mode:p.getMode(),material:named(p.getMaterial()),indices:arr(p.getIndices()),attributes:Object.fromEntries(p.listSemantics().sort().map(s=>[s,arr(p.getAttribute(s))])),targets:p.listTargets().map(t=>Object.fromEntries(t.listSemantics().sort().map(s=>[s,arr(t.getAttribute(s))])))});
 return {nodes:r.listNodes().map(n=>({name:n.getName(),parent:named(n.getParentNode()),children:n.listChildren().map(named),t:n.getTranslation(),q:n.getRotation(),s:n.getScale(),mesh:named(n.getMesh()),skin:named(n.getSkin()),weights:n.getWeights(),extras:n.getExtras()})),
 scenes:r.listScenes().map(s=>({name:s.getName(),children:s.listChildren().map(named)})),
 meshes:r.listMeshes().map(m=>({name:m.getName(),weights:m.getWeights(),extras:m.getExtras(),primitives:m.listPrimitives().map(primitive)})),
 skins:r.listSkins().map(s=>({name:s.getName(),skeleton:named(s.getSkeleton()),joints:s.listJoints().map(named),binds:arr(s.getInverseBindMatrices())})),
 animations:r.listAnimations().map(a=>({name:a.getName(),extras:a.getExtras(),channels:a.listChannels().map(c=>({target:named(c.getTargetNode()),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),input:arr(c.getSampler().getInput()),output:arr(c.getSampler().getOutput())}))}))};
}
function sample(c,time){
 const s=c.getSampler(),ts=s.getInput().getArray(),vs=s.getOutput().getArray(),w=s.getOutput().getElementSize();
 let i=0;while(i+1<ts.length&&ts[i+1]<=time)i++;
 const a=Array.from(vs.slice(i*w,(i+1)*w));if(i+1===ts.length||s.getInterpolation()==='STEP')return a;
 assert.equal(s.getInterpolation(),'LINEAR','SELECTED_CUBICSPLINE_UNEXPECTED');
 const u=Math.max(0,Math.min(1,(time-ts[i])/(ts[i+1]-ts[i]))),b=Array.from(vs.slice((i+1)*w,(i+2)*w));
 if(c.getTargetPath()==='rotation')return new Quaternion().fromArray(a).slerp(new Quaternion().fromArray(b),u).toArray();
 return a.map((v,k)=>v+(b[k]-v)*u);
}
function world(doc,animation,time){
 const overrides=new Map();for(const c of animation?.listChannels()??[]){const n=c.getTargetNode();if(!overrides.has(n))overrides.set(n,{});overrides.get(n)[c.getTargetPath()]=sample(c,time);}
 const cache=new Map();function visit(n){if(cache.has(n))return cache.get(n);const o=overrides.get(n)??{},m=new Matrix4().compose(new Vector3().fromArray(o.translation??n.getTranslation()),new Quaternion().fromArray(o.rotation??n.getRotation()),new Vector3().fromArray(o.scale??n.getScale()));if(n.getParentNode())m.premultiply(visit(n.getParentNode()));cache.set(n,m);return m;}
 for(const n of doc.getRoot().listNodes())visit(n);return cache;
}
function catalog(doc,records){
 const r=doc.getRoot(),nodes=new Map(r.listNodes().map(n=>[n.getName(),n])),clips={};
 for(const a of r.listAnimations()){
  const channels=a.listChannels(),starts=channels.map(c=>c.getSampler().getInput().getArray()[0]),ends=channels.map(c=>c.getSampler().getInput().getArray().at(-1));
  const entry={duration:Math.max(...ends),channels:channels.length,targets:channels.map(c=>named(c.getTargetNode())+'.'+c.getTargetPath()).sort()};
  const record=records.find(v=>v.name===a.getName());
  if(record){
   const start=Math.min(...starts),end=Math.max(...ends);assert.ok(Math.abs(start-record.cycleStart)<=2e-6&&Math.abs(end-record.cycleEnd)<=2e-6,'SELECTED_CLOCK_CHANGED');
   if(record.sourceDuty!==null){
    const paw=record.kind.startsWith('upright')?'HL':'FL',offset=record.sourceOffsets[paw],groups=[];let group=[];
    for(let i=0;i<record.frames;i++){const phase=i/(record.frames-1),p=(phase+offset)%1;
     if(phase<1&&p<record.sourceDuty){group.push([phase,world(doc,a,start+(end-start)*phase).get(nodes.get(paw+'_paw')).elements[14]]);}else if(group.length){groups.push(group);group=[];}}
    if(group.length)groups.push(group);groups.sort((a,b)=>b.length-a.length);const pts=groups[0];assert.ok(pts?.length>=3,'CONTINUOUS_STANCE_WITNESS_MISSING');
    const first=pts[0],last=pts.at(-1),distance=-.8*(last[1]-first[1])/(last[0]-first[0]);
    assert.ok(distance>0&&Math.abs(distance-record.nativeDistancePerCycle)<=2e-5,'ACTUAL_STRIDE_INTENT_MISMATCH:'+a.getName());
    entry.measuredGait={cycleStart:start,cycleEnd:end,nativeDistancePerCycle:distance,sourceDuty:record.sourceDuty,sourceOffsets:record.sourceOffsets,unloadedLimbs:record.kind.startsWith('upright')?['FL','FR']:[],exportStanceSamplePhase:[first[0],last[0]],measurement:'Actual raw exported world paw Z slope per normalized continuous stance interval, scale .8 mounted Ry(pi); authored footfall only, native contact unqualified'};
   }else entry.sampleInterval={start,end};
  }
  clips[a.getName()]=entry;
 }
 return clips;
}

export {catalog,snapshot,world,sample};
