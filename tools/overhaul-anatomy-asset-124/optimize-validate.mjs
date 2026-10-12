/** ONE root-gated lossless121 resource optimization. No authoring, resampling or legacy BIN graft. */
import {readFile,writeFile,mkdir,access,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO,PropertyType} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3,Quaternion} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
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
const imageJSON=j=>j.json.images?.map((im,i)=>({...im,bufferView:undefined,uri:undefined,bytes:sha(j.resources[im.uri]??new Uint8Array())}))??[];
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
    entry.measuredGait={cycleStart:start,cycleEnd:end,nativeDistancePerCycle:distance,sourceDuty:record.sourceDuty,sourceOffsets:record.sourceOffsets,unloadedLimbs:record.kind.startsWith('upright')?['FL','FR']:[],exportStanceSamplePhase:[first[0],last[0]],measurement:'Actual optimized world paw Z slope per normalized continuous stance interval, scale .8 mounted Ry(pi); authored footfall only, native contact unqualified'};
   }else entry.sampleInterval={start,end};
  }
  clips[a.getName()]=entry;
 }
 return clips;
}
let error=null,witness=null;const startedUTC=new Date().toISOString();
await fresh(OUT);await mkdir(OUT);
try{
 const protectedInputs=await load(resolve(HERE,'protected-inputs.json'));
 for(const p of protectedInputs.files)assert.equal(sha(await readFile(resolve(ROOT,p.path))),p.sha256,'PREIMAGE_CHANGED:'+p.path);
 await fresh(publicPath);
 const author=await load(resolve(ROOT,'assets/source/overhaul-pounce-anatomy-121/author-receipt.json'));
 assert.equal(author.error,null);assert.ok(author.protectedAfter.every(p=>p.match));
 const records=await load(resolve(ROOT,'assets/source/overhaul-pounce-anatomy-121/authored-motion-records.json'));
 assert.deepEqual(author.records,records);assert.equal(records.length,7);
 const ledger=await load(resolve(ROOT,'assets/source/overhaul-pounce-anatomy-121/intentional-weight-ledger121.json'));
 assert.equal(ledger.writer,'CLOSED');assert.equal(ledger.geometryRestMaterialsUVChanged,false);assert.deepEqual(ledger.before.rig,ledger.after.rig);
 for(const [name,row] of Object.entries(ledger.before.meshes)){assert.equal(row.immutableSHA256,ledger.after.meshes[name].immutableSHA256);if(!ledger.allowedWeightParts.includes(name))assert.equal(row.weightsSHA256,ledger.after.meshes[name].weightsSHA256);}
 await MeshoptEncoder.ready;await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
 const document=await io.read(source),before=snapshot(document),beforeJSON=await io.writeJSON(document),root=document.getRoot();
 assert.equal(root.listMeshes().length,255);assert.equal(root.listSkins().length,1);assert.equal(root.listSkins()[0].listJoints().length,57);assert.equal(root.listAnimations().length,45);
 assert.equal(new Set(root.listNodes().map(named)).size,root.listNodes().length,'UNIQUE_NODE_NAMES_REQUIRED');
 for(const edit of ledger.edits)assert.ok(root.listNodes().some(n=>n.getName()===edit.mesh&&n.getMesh()),'LEDGER_MESH_NOT_EXPORTED:'+edit.mesh);
 // Exact accessor sharing + lossless compression across NEW121 resources.
 // Direct QUANTIZE encoder method selects filter NONE; it does not run the
 // meshopt() transform's quantize/reorder steps. No weld/prune/simplify.
 await document.transform(dedup({propertyTypes:[PropertyType.ACCESSOR]}));
 document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const candidate=resolve(OUT,'Pounce_Anatomy121.glb');await io.write(candidate,document);
 const reread=await io.read(candidate),after=snapshot(reread),afterJSON=await io.writeJSON(reread);
 assert.deepEqual(after,before,'DECODED_RESOURCE_CHANGED');
 assert.deepEqual(afterJSON.json.materials,beforeJSON.json.materials,'MATERIAL_CHANGED');assert.deepEqual(afterJSON.json.textures,beforeJSON.json.textures,'TEXTURE_BINDING_CHANGED');assert.deepEqual(afterJSON.json.samplers,beforeJSON.json.samplers,'TEXTURE_SAMPLER_CHANGED');assert.deepEqual(imageJSON(afterJSON),imageJSON(beforeJSON),'IMAGE_CHANGED');
 const joints=reread.getRoot().listSkins()[0].listJoints(),rest=world(reread),clips=catalog(reread,records);
 const base=reread.getRoot().listAnimations().find(a=>a.getName()==='FelineTransitionBase106'),arc=reread.getRoot().listAnimations().find(a=>a.getName()==='FelineTransitionArc106');
 for(const c of base.listChannels()){const n=c.getTargetNode(),path=c.getTargetPath(),actual=sample(c,clips[base.getName()].sampleInterval.start),want=path==='translation'?n.getTranslation():path==='rotation'?n.getRotation():n.getScale();assert.ok(actual.every((v,i)=>Math.abs(v-want[i])<=2e-5),'REFERENCE_NOT_REST');const ac=arc.listChannels().find(x=>x.getTargetNode()===n&&x.getTargetPath()===path);assert.ok(ac);for(const t of Object.values(clips[arc.getName()].sampleInterval))assert.ok(sample(ac,t).every((v,i)=>Math.abs(v-actual[i])<=2e-5),'ARC_ENDPOINT_NOT_NEUTRAL');}
 const raw=await readFile(candidate);
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),loaded=await new Promise((ok,no)=>loader.parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'',ok,no));
 assert.equal(loaded.animations.length,Object.keys(clips).length);
 for(const c of loaded.animations){const actual=clips[c.name];assert.ok(actual,'ACTUAL_THREE_CLIP_MISSING');assert.equal(c.duration,actual.duration,'ACTUAL_THREE_DURATION');assert.equal(c.tracks.length,actual.channels,'ACTUAL_THREE_CHANNELS');assert.deepEqual(c.tracks.map(t=>t.name.replace(/\.position$/,'.translation').replace(/\.quaternion$/,'.rotation')).sort(),actual.targets,'ACTUAL_THREE_TARGET_NAMES');}
 const manifest={schema:'identity57-anatomy121-actual-lossless-resources',source:'assets/source/overhaul-pounce-anatomy-121/Pounce_Motion121.temporary.glb',publicURL:'/assets/models/Pounce_Anatomy121.glb',sha256:sha(raw),bytes:raw.length,scale:.8,basis:'GLTF export_yup (sourceX,sourceZ,-sourceY), public Ry(pi) mount',sourceFloorWorldZ:-.018,floorBakedInExport:true,jointNames:joints.map(named),jointParents:Object.fromEntries(joints.map(n=>[n.getName(),named(n.getParentNode())])),restJointWorldHeads:Object.fromEntries(joints.map(n=>[n.getName(),new Vector3().setFromMatrixPosition(rest.get(n)).toArray()])),clips,missingSourceActions:['FelineUprightDeath','FelineUprightDown','FelineUprightPair*'],scope:'Full NEW121 geometry/skin export with exact decoded optimization preservation. Authored source footfalls only. Native contact, retained-action changed skin, quality, fluidity and performance unqualified.'};
 for(const p of protectedInputs.files)assert.equal(sha(await readFile(resolve(ROOT,p.path))),p.sha256,'PREIMAGE_CHANGED_AFTER:'+p.path);
 witness={sourceSHA256:sha(await readFile(source)),outputSHA256:sha(raw),sourceBytes:(await readFile(source)).length,outputBytes:raw.length,decodedSemanticSHA256:sha(JSON.stringify(before)),exactDecodedGeometryUVWeightsBindsHierarchyAnd45Actions:true,actualSelectedClips:records.map(r=>r.name),weightLedgerSHA256:sha(await readFile(resolve(ROOT,'assets/source/overhaul-pounce-anatomy-121/intentional-weight-ledger121.json'))),weightLedgerExportVertexCorrespondence:'NOT_ESTABLISHED_BY_OPTIMIZER; raw121 lineage and exact preservation recorded',visualQualityApproved:false,nativeContactApproved:false};
 await save('identity57Runtime121Manifest.json',manifest);await save('validation.json',witness);
 // Publication follows all guards. Runtime routing remains a separate source gate.
 await copyFile(candidate,publicPath,1);
}catch(e){error={message:String(e),stack:e.stack};}
finally{await save('receipt.json',{writer:'CLOSED',startedUTC,closedUTC:new Date().toISOString(),status:error?'FIRST_ACTUAL_FAILURE_STOP':'ACTUAL_LOSSLESS121_CANDIDATE',error,witness});}
if(error)throw Error(error.message);
