import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Bone,Group,SkinnedMesh,Vector3} from 'three';
import {gaitCycleTime005,Identity57Runtime005} from '../../src/game/entities/identity57Runtime005';
import manifest from '../../src/game/entities/identity57Runtime058EManifest.json';
import originalManifest from '../../src/game/entities/identity57Runtime034Manifest.json';
import {IDENTITY57_ASSET_URL058E} from '../../src/game/entities/identity57Runtime058EAsset';

// Node has Event/fetch but no browser ProgressEvent; the loader only emits
// this notification while reading the embedded buffer.
globalThis.ProgressEvent??=class extends Event{
 readonly lengthComputable:boolean;readonly loaded:number;readonly total:number;
 constructor(type:string,init:ProgressEventInit={}){super(type);this.lengthComputable=init.lengthComputable??false;this.loaded=init.loaded??0;this.total=init.total??0;}
} as typeof ProgressEvent;

// Actual Three loader, CPU data only. Embedded images/materials are excluded
// from this headless check; geometry, skin, bind matrices and all curves load.
async function loadData(path:string){
 const bytes=readFileSync(path),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const binAt=20+bytes.readUInt32LE(12),bin=bytes.subarray(binAt+8,binAt+8+bytes.readUInt32LE(binAt));
 json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 return await new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
const original=await loadData(originalManifest.source),candidate=await loadData('public'+manifest.publicURL);
assert.equal(createHash('sha256').update(readFileSync('public'+manifest.publicURL)).digest('hex'),manifest.sha256);
assert.equal(IDENTITY57_ASSET_URL058E,manifest.publicURL+'?sha='+manifest.sha256.slice(0,12));
assert.equal(candidate.animations.length,43);assert.equal(original.animations.length,43);
const selected=['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'];
let retained=0,binds=0;
for(const clip of candidate.animations){
 const record=manifest.clips[clip.name as keyof typeof manifest.clips];
 assert(record);assert.equal(clip.duration,record.duration);assert.equal(clip.tracks.length,record.channels);
 assert.deepEqual(clip.tracks.map(t=>t.name).sort(),record.targets.map(t=>t.replace(/\.translation$/,'.position').replace(/\.rotation$/,'.quaternion')).sort());
 const old=original.animations.find(c=>c.name===clip.name)!;
 assert.deepEqual(clip.tracks.map(t=>[t.name,t.getInterpolation(),Array.from(t.times)]),old.tracks.map(t=>[t.name,t.getInterpolation(),Array.from(t.times)]));
 for(let i=0;i<clip.tracks.length;i++)if(!selected.includes(clip.name)||/^(root|pelvis|spine|chest|head|launcher|tail_\d)\./.test(clip.tracks[i].name))assert.deepEqual(Array.from(clip.tracks[i].values),Array.from(old.tracks[i].values));
 if(!selected.includes(clip.name))retained++;
}
for(const name of manifest.jointNames){const b=candidate.scene.getObjectByName(name);assert(b instanceof Bone);assert.equal(b.parent?.name,manifest.jointParents[name as keyof typeof manifest.jointParents]);}
candidate.scene.traverse(o=>{if(o instanceof SkinnedMesh){const old=original.scene.getObjectByName(o.name);assert(old instanceof SkinnedMesh);assert.deepEqual(o.bindMatrix.elements,old.bindMatrix.elements);assert.deepEqual(o.bindMatrixInverse.elements,old.bindMatrixInverse.elements);assert.deepEqual(o.skeleton.boneInverses.map(m=>m.elements),old.skeleton.boneInverses.map(m=>m.elements));binds++;}});
assert(binds>0);assert.equal(retained,38);
const ranges=[];
for(const name of selected){
 const record=manifest.clips[name as keyof typeof manifest.clips];assert('measuredGait' in record);const gait=record.measuredGait;
 assert('cycleStart' in gait&&'cycleEnd' in gait);
 const first=Math.fround(gait.cycleStart),last=Math.fround(gait.cycleEnd),clip=candidate.animations.find(c=>c.name===name)!;
 assert.equal(gaitCycleTime005(clip.duration,0,gait),first);
 assert.equal(gaitCycleTime005(clip.duration,.5,gait),first+.5*(last-first));
 assert.equal(gaitCycleTime005(clip.duration,1,gait),last);
 // Real owner travel advances phase, crosses a cycle and never uses the
 // pre-first-key hold. No native world or contact fixture is created here.
 const owner=new Identity57Runtime005(candidate.scene, candidate.animations,'061-check',manifest),root=new Group(),body=new Group();
 assert.deepEqual(owner.diagnostic.missingClips,[]);assert.deepEqual(owner.diagnostic.missingBones,[]);
 const up=name.includes('Upright'),speed=name==='FelineWalk'?.2:name==='FelineTrot'?3:name==='FelineGallop'?7:name==='FelineUprightWalkLong'?1:3;
 const distance=gait.nativeDistancePerCycle*.4,dt=distance/speed;
 const state={id:'061-check',position:{x:0,y:1,z:0},jumpEpoch:1,hp:100,maxHp:100,diedAt:-100,stanceChangedAt:-100,stance:up?'upright':'quad',pulseAt:-100,rocketAt:-100,hurtAt:-100};
 for(let i=1;i<=3;i++){
  const frame={state,time:10+i*dt,position:new Vector3(0,1,-i*distance),yaw:0,distance,angularDistance:0,grounded:true,velocity:new Vector3(0,0,-speed),reset:false};
  // Only fields read by the grounded gait owner are supplied; no authority
  // ActorState, replication or native world is synthesized by this data test.
  owner.step(frame as unknown as Parameters<Identity57Runtime005['step']>[0],i*dt,dt,root,body,false);
  assert.equal(owner.diagnostic.firstFailure,null);assert.equal(owner.diagnostic.activeClips.length,1);
  const active=owner.diagnostic.activeClips[0],phase=(i*.4)%1;
  assert.equal(active.name,name);assert(Math.abs(owner.diagnostic.phase-phase)<1e-12);
  assert(Math.abs(active.time-gaitCycleTime005(clip.duration,phase,gait))<1e-12);
  assert(active.time>=first&&active.time<=last);
 }
 owner.dispose();ranges.push({name,first,last,duration:clip.duration,travelWrapPassed:true});
}
assert.equal(gaitCycleTime005(2,.25,{nativeDistancePerCycle:1}),.5);
assert.equal(gaitCycleTime005(2,1.1),2);assert.equal(gaitCycleTime005(2,-.1),0);
for(const invalid of [{cycleStart:1},{cycleStart:.2,cycleEnd:.1},{cycleStart:0,cycleEnd:3},{cycleStart:NaN,cycleEnd:1}])assert.throws(()=>gaitCycleTime005(2,.5,{nativeDistancePerCycle:1,...invalid}),/INVALID_MEASURED_GAIT_CYCLE/);
const result={status:'PASS_CPU_LOADER_AND_RUNTIME_CLOCK_ONLY',assetSHA256:manifest.sha256,actions:43,retainedActions:retained,joints:manifest.jointNames.length,skinnedMeshesChecked:binds,ranges,legacyClockPassed:true,invalidCycleStopped:true,nativeContactQualified:false,imagesMaterialsRendered:false,heavyJobs:0};
writeFileSync('tools/overhaul-gait-runtime-061/runtime-data-check-result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
