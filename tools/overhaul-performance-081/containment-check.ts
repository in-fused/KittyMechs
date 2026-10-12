import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationMixer,Bone,Group,Quaternion,SkinnedMesh,Sphere,Vector3} from 'three';
import {GLTFLoader,MeshoptDecoder} from 'three-stdlib';
import {AnimatedEnemyBounds081} from '../../src/game/entities/animatedEnemyBounds081';
// UNRUN: root ONE corrected-loader job, inclusive30s ceiling; unchanged inner15s first-failure stop.
const output='tools/overhaul-performance-081/containment-result.json',began=performance.now();
const result:any={status:'PENDING',scope:'ALL retained Sentinel loaded vertices/all own clips and actual shared pair clips; Three and Float32 palette containment. No live gameplay/performance acceptance.',models:[],inputs:[]};
const guard=()=>{if(performance.now()-began>15000)throw Error('INNER_15S_FIRST_FAILURE_STOP');};
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
globalThis.ProgressEvent??=class extends Event{constructor(type:string){super(type);}} as typeof ProgressEvent;
async function load(bytes:Buffer){
 assert.equal(bytes.readUInt32LE(0),0x46546c67,'GLB_MAGIC');assert.equal(bytes.readUInt32LE(4),2,'GLB_VERSION');assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB_LENGTH');assert.equal(bytes.readUInt32LE(16),0x4e4f534a,'GLB_JSON_CHUNK');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()),binAt=20+bytes.readUInt32LE(12),binLength=bytes.readUInt32LE(binAt);
 assert.equal(bytes.readUInt32LE(binAt+4),0x004e4942,'GLB_BIN_CHUNK');assert.equal(binAt+8+binLength,bytes.length,'GLB_SINGLE_BIN_CHUNK');
 // These retained assets have compressed BIN buffer0 and a virtual decoded
 // fallback buffer1. Keep every view/index/extension intact: the shipping
 // Meshopt plugin reads extension.buffer0, never fetches virtual buffer1.
 assert.equal(json.buffers.length,2,'COMPRESSED_AND_VIRTUAL_BUFFERS');assert.equal(json.buffers[0].uri,undefined,'BIN_BUFFER_NO_URI');assert.equal(json.buffers[1].uri,undefined,'VIRTUAL_BUFFER_NO_URI');assert.equal(json.buffers[1].extensions?.EXT_meshopt_compression?.fallback,true,'VIRTUAL_MESHOPT_FALLBACK');
 assert(json.extensionsRequired?.includes('EXT_meshopt_compression'),'REQUIRED_MESHOPT');assert(Number.isSafeInteger(json.buffers[0].byteLength)&&json.buffers[0].byteLength>0&&json.buffers[0].byteLength<=binLength&&binLength-json.buffers[0].byteLength<=3,'BIN_LENGTH_PADDING');
 assert(Number.isSafeInteger(json.buffers[1].byteLength)&&json.buffers[1].byteLength>0,'VIRTUAL_BUFFER_LENGTH');assert(json.bufferViews.length>0,'ACTUAL_BUFFER_VIEWS');
 for(const view of json.bufferViews){const ext=view.extensions?.EXT_meshopt_compression;assert.equal(view.buffer,1,'DECODED_VIEW_BUFFER');assert(ext,'COMPRESSED_VIEW_EXTENSION');assert.equal(ext.buffer,0,'COMPRESSED_SOURCE_BUFFER');const start=ext.byteOffset??0;assert(Number.isSafeInteger(start)&&start>=0&&Number.isSafeInteger(ext.byteLength)&&ext.byteLength>0&&start+ext.byteLength<=json.buffers[0].byteLength,'COMPRESSED_SOURCE_RANGE');const decodedStart=view.byteOffset??0;assert(Number.isSafeInteger(decodedStart)&&decodedStart>=0&&Number.isSafeInteger(view.byteLength)&&view.byteLength>0&&decodedStart+view.byteLength<=json.buffers[1].byteLength,'VIRTUAL_DECODED_RANGE');assert.equal(ext.count*ext.byteStride,view.byteLength,'DECODED_VIEW_LENGTH');}
 json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(binAt+8,binAt+8+binLength).toString('base64');delete json.images;delete json.materials;delete json.textures;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 const loader=new GLTFLoader();loader.setMeshoptDecoder(typeof MeshoptDecoder==='function'?MeshoptDecoder():MeshoptDecoder);return loader.parseAsync(JSON.stringify(json),'');
}
const point=new Vector3(),worldPoint=new Vector3(),gpuPoint=new Vector3(),worldSphere=new Sphere();
const a=new Float32Array(4),b=new Float32Array(4),sum=new Float32Array(4),local=new Float32Array(4),gpuWorld=new Float32Array(4);
function mul(matrix:ArrayLike<number>,offset:number,input:Float32Array,out:Float32Array){for(let row=0;row<4;row++){let v=Math.fround(Math.fround(matrix[offset+row])*input[0]);for(let col=1;col<4;col++)v=Math.fround(v+Math.fround(Math.fround(matrix[offset+col*4+row])*input[col]));out[row]=v;}}
function floatSkin(mesh:SkinnedMesh,index:number){
 const pos=mesh.geometry.getAttribute('position'),indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');a[0]=pos.getX(index);a[1]=pos.getY(index);a[2]=pos.getZ(index);a[3]=1;mul(mesh.bindMatrix.elements,0,a,b);sum.fill(0);
 for(let slot=0;slot<4;slot++){const w=weights.getComponent(index,slot);if(w===0)continue;mul(mesh.skeleton.boneMatrices,indices.getComponent(index,slot)*16,b,a);for(let k=0;k<4;k++)sum[k]=Math.fround(sum[k]+Math.fround(a[k]*w));}
 mul(mesh.bindMatrixInverse.elements,0,sum,local);local[3]=1;mul(mesh.matrixWorld.elements,0,local,gpuWorld);return gpuPoint.set(gpuWorld[0],gpuWorld[1],gpuWorld[2]);
}
function stable(scene:Group){const rows:any[]=[];scene.traverse(o=>{if(o instanceof SkinnedMesh)rows.push({name:o.name,parent:o.parent?.name,bind:o.bindMatrix.elements,inverses:o.skeleton.boneInverses.map(m=>m.elements),parents:o.skeleton.bones.map(b=>[b.name,b.parent?.name]),weights:sha(Buffer.from(o.geometry.getAttribute('skinWeight').array.buffer)),indices:sha(Buffer.from(o.geometry.getAttribute('skinIndex').array.buffer)),position:sha(Buffer.from(o.geometry.getAttribute('position').array.buffer))});});return JSON.stringify(rows);}
try{
 assert(!existsSync(output),'RESULT_EXISTS_NO_RETRY_OVERWRITE');const pins=JSON.parse(readFileSync('tools/overhaul-performance-081/input-pins.json','utf8'));const bytes=new Map<string,Buffer>();for(const row of pins.files){const data=readFileSync(row.path),actual=sha(data);assert.equal(actual,row.sha256,'INPUT_SHA:'+row.path);bytes.set(row.path,data);result.inputs.push({...row,match:true});}
 const pairs=(await load(bytes.get('public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb')!)).animations.filter(c=>/Pair(?:Impact|Pin|Claw|Release|Escape)/.test(c.name));assert(pairs.length>0,'ACTUAL_SHARED_PAIR_CLIPS_REQUIRED');
 for(const [name,scale] of [['Sentinel_Scout',.65],['Sentinel_Mortar',.8],['Sentinel_Anchor',1.05]] as const){
  guard();const loaded=await load(bytes.get('public/assets/models/'+name+'.glb')!),scene=loaded.scene,carrier=new Group(),body=new Group();body.add(carrier);carrier.add(scene);carrier.scale.setScalar(scale);carrier.rotation.y=Math.PI;body.updateMatrixWorld(true);
  // Match the existing actor's shared skin palette ownership exactly.
  const palettes=new Map<string,SkinnedMesh['skeleton']>();scene.traverse(o=>{if(o instanceof SkinnedMesh){const key=o.skeleton.bones.map(b=>b.uuid).join(','),shared=palettes.get(key);if(shared)o.skeleton=shared;else palettes.set(key,o.skeleton);}});
  const frozen=stable(scene),bones:Bone[]=[];scene.traverse(o=>{if(o instanceof Bone)bones.push(o);});assert(bones.length>0);const bindPose=bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
  const skins:SkinnedMesh[]=[];scene.traverse(o=>{if(o instanceof SkinnedMesh)skins.push(o);});assert.equal(skins.length,6);const owner=new AnimatedEnemyBounds081(scene,true);assert(owner.diagnostic.enabled,owner.diagnostic.reason??'SOURCE_WEIGHT_PROOF');
  const mixer=new AnimationMixer(scene),clips=[...loaded.animations,...pairs],row:any={name,skins:skins.length,bones:bones.length,ownClips:loaded.animations.length,pairClips:pairs.length,poses:0,checkedVertices:0,boundsTotalMs:0,boundsMaxMs:0,allSourceAttributesAndBindsUnchanged:false};
  assert.equal(loaded.animations.length,17);for(const needed of ['FelineWalk','FelineTurnLeft','FelineClimb','FelineDeath'])assert(loaded.animations.some(c=>c.name===needed));
  for(const clip of clips)for(const fraction of [0,.5,.999]){
   guard();mixer.stopAllAction();for(const pose of bindPose){pose.b.position.copy(pose.p);pose.b.quaternion.copy(pose.q);pose.b.scale.copy(pose.s);}mixer.clipAction(clip).play();mixer.setTime(clip.duration*fraction);
   // Actual carrier transform ranges used by the actor's final pose, including
   // settled slopes and final head tracking. No geometry or bind adjustment.
   body.position.set(12+fraction*7,1.4,-23);body.rotation.y=fraction*2;carrier.rotation.set(fraction*.2,Math.PI,-fraction*.18);carrier.position.y=-fraction*.12;
   const head=scene.getObjectByName('head');if(head instanceof Bone)head.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),fraction*.65));
   const started=performance.now();owner.update(++row.poses);const ms=performance.now()-started;row.boundsTotalMs+=ms;row.boundsMaxMs=Math.max(row.boundsMaxMs,ms);assert(owner.diagnostic.enabled,owner.diagnostic.reason??'FINAL_POSE_BOUND_DISABLED');
   const seen=new Set();for(const mesh of skins){assert(mesh.frustumCulled);assert(mesh.boundingSphere);if(!seen.has(mesh.skeleton)){mesh.skeleton.update();seen.add(mesh.skeleton);}worldSphere.copy(mesh.boundingSphere).applyMatrix4(mesh.matrixWorld);
    const count=mesh.geometry.getAttribute('position').count;for(let i=0;i<count;i++){
     mesh.getVertexPosition(i,point);assert(mesh.boundingSphere.containsPoint(point),name+':'+clip.name+':LOCAL_VERTEX:'+i);worldPoint.copy(point).applyMatrix4(mesh.matrixWorld);assert(worldSphere.containsPoint(worldPoint),name+':'+clip.name+':WORLD_VERTEX:'+i);
     assert(worldSphere.containsPoint(floatSkin(mesh,i)),name+':'+clip.name+':FLOAT32_PALETTE_VERTEX:'+i);assert(mesh.boundingSphere.containsPoint(point.set(local[0],local[1],local[2])),name+':'+clip.name+':FLOAT32_LOCAL_VERTEX:'+i);row.checkedVertices++;
    }
   }
  }
  assert.equal(stable(scene),frozen,'SOURCE_GEOMETRY_BINDS_PARENTS_CHANGED');row.allSourceAttributesAndBindsUnchanged=true;
  // Mutate only this disposable loaded test copy to exercise fail-open guards.
  skins[0].geometry.getAttribute('skinWeight').needsUpdate=true;owner.update(++row.poses);assert(!owner.diagnostic.enabled);assert(skins.every(m=>!m.frustumCulled),'STALE_ATTRIBUTE_MUST_FAIL_OPEN_ALL_SKINS');row.staleAttributeFailOpen=true;
  result.models.push(row);mixer.stopAllAction();
 }
 result.status='PASS_REVIEW_REQUIRED';
}catch(error){result.status='FIRST_FAILURE_STOP';result.error=String(error);process.exitCode=1;}
finally{result.elapsedMs=performance.now()-began;writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));}
