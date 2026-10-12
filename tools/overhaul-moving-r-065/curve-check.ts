import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationMixer,Bone,Group,LoopOnce,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const began=performance.now(),output='tools/overhaul-moving-r-065/curve-results.json';
const pins=[
 ['assets/source/overhaul-pounce-gait-058e/Pounce_Gait058E.glb','381f13348fa5a10b67c23be01844de50e89802738cb8ab13282267685644e7f9'],
 ['.sites-runtime/overhaul-20261010/observer063-play/evidence.json','681a41d4113281521639d362052abe4db8826a854ca6a31b664264550e40f0c8'],
 ['src/game/entities/identity57Runtime005.ts','52b9e9eb76776da7f751bcd3687f477cb3df7f04ab0387600f51e7954e8b2c53'],
 ['src/game/entities/identity57Runtime058EManifest.json','8d94cadb79d70ee4c96b69304c5fdadce3dffc40d0d0da47293365661df94027'],
 ['tools/overhaul-gait-runtime-064/recorded-analysis.json','7715515ce7872d90931ceeed805b2a73cd0ee91bc63dd95d26980a4bcc5b0024'],
 ['assets/source/overhaul-pounce-art-detail-034/Pounce_ArtDetail034.glb','5295d87f683bcbbc5df6647cca92f12725050cfd8174403787f0e5d760b0b595'],
] as const;
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
type XYZ={x:number;y:number;z:number};
const ankleNames={FL:'FL_paw',FR:'FR_paw',RL:'HL_paw',RR:'HR_paw'} as const;
type Ankle=keyof typeof ankleNames;
type Observation={index:number;wallMs:number;segment:string;nativeTick:number;nativeTime:number;ownerRenderTime:number;ownerMode:string;gaitPhase:number;clip:string;clipTime:number;weight:number};
const result:Record<string,unknown>={status:'PENDING',scope:'Existing058E actual Three CPU curves at saved063 clocks; mounted source-relative ankle heads only, no world/native/pad contact reconstruction',inputs:[],samples:[],nativeContactQualified:false,exactSwitchBoundary:false,geometrySkinLoaded:true,imagesMaterialsExcluded:true};
let written=false;
const save=()=>{if(!written&&!existsSync(output)){writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});written=true;}};
const guard=()=>{if(performance.now()-began>8500)throw Error('FIRST_FAILURE_INNER_8_5S_BOUND');};
// Root must enforce a10s inclusive process ceiling, including module startup.
const timer=setTimeout(()=>{result.status='FIRST_FAILURE_STOP';result.error='FIRST_FAILURE_INNER_8_5S_BOUND';result.elapsedMs=performance.now()-began;save();process.exit(1);},8500);

// Same Node-only notification adapter as061; no renderer or browser exists.
globalThis.ProgressEvent??=class extends Event{
 readonly lengthComputable:boolean;readonly loaded:number;readonly total:number;
 constructor(type:string,init:ProgressEventInit={}){super(type);this.lengthComputable=init.lengthComputable??false;this.loaded=init.loaded??0;this.total=init.total??0;}
} as typeof ProgressEvent;
async function loadData(bytes:Buffer){
 guard();assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()),binAt=20+bytes.readUInt32LE(12);
 assert.equal(json.buffers.length,1);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);assert.equal(bytes.readUInt32LE(binAt+4),0x004e4942);
 const bin=bytes.subarray(binAt+8,binAt+8+bytes.readUInt32LE(binAt));
 json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const loaded=await new GLTFLoader().parseAsync(JSON.stringify(json),'');guard();return loaded;
}
function binds(scene:Group,includeInverseCache:boolean){
 const rows:{name:string;bind:number[];inverseCache?:number[];boneNames:string[];boneInverses:number[][]}[]=[];
 scene.traverse(o=>{if(o instanceof SkinnedMesh)rows.push({name:o.name,bind:[...o.bindMatrix.elements],...(includeInverseCache?{inverseCache:[...o.bindMatrixInverse.elements]}:{}),boneNames:o.skeleton.bones.map(b=>b.name),boneInverses:o.skeleton.boneInverses.map(m=>[...m.elements])});});
 return rows.sort((a,b)=>a.name.localeCompare(b.name));
}
function differences(a:Record<Ankle,XYZ>,b:Record<Ankle,XYZ>){
 return Object.fromEntries((Object.keys(ankleNames) as Ankle[]).map(key=>{const delta={x:b[key].x-a[key].x,y:b[key].y-a[key].y,z:b[key].z-a[key].z};return[key,{delta,euclidean:Math.hypot(delta.x,delta.y,delta.z),forwardDelta:-delta.z,verticalDelta:delta.y}];}));
}
try{
 assert(!existsSync(output),'RESULT_EXISTS_FIRST_FAILURE_NO_OVERWRITE');
 const inputBytes=new Map<string,Buffer>();
 for(const [path,expected] of pins){guard();const bytes=readFileSync(path),actual=sha(bytes);(result.inputs as unknown[]).push({path,expected,actual,bytes:bytes.length,match:actual===expected});assert.equal(actual,expected,'SHA_PIN:'+path);inputBytes.set(path,bytes);}
 const manifest=JSON.parse(inputBytes.get(pins[3][0])!.toString()),evidence=JSON.parse(inputBytes.get(pins[1][0])!.toString()),analysis=JSON.parse(inputBytes.get(pins[4][0])!.toString());
 assert.equal(manifest.sha256,pins[0][1]);assert.equal(manifest.scale,.8);assert.equal(analysis.inputSHA256,pins[1][1]);assert.equal(evidence.samples.length,analysis.rows.length);
 const observations:Observation[]=evidence.samples.map((s:any,index:number)=>{
  const id=s.input.lastSent.localId,owner=s.owner.diagnostics.find((d:any)=>d.actor===id);assert(owner,'LOCAL_OWNER_MISSING');assert.equal(owner.assetSHA256,pins[0][1]);assert.equal(owner.firstFailure,null);assert.equal(owner.activeClips.length,1);const active=owner.activeClips[0];assert.equal(active.weight,1);
  const row={index,wallMs:s.wallMs,segment:s.phase,nativeTick:s.snapshot.tick,nativeTime:s.snapshot.time,ownerRenderTime:owner.renderTime,ownerMode:owner.mode,gaitPhase:owner.phase,clip:active.name,clipTime:active.time,weight:active.weight};
  const old=analysis.rows[index];assert.equal(row.wallMs,old.wallMs);assert.equal(row.nativeTick,old.nativeTick);assert.equal(row.ownerRenderTime,old.ownerRenderTime);assert.equal(row.gaitPhase,old.gaitPhase);assert.deepEqual(owner.activeClips,old.active);return row;
 });
 const transforms=observations.filter(r=>r.ownerMode==='transform');assert.deepEqual(transforms.map(r=>r.wallMs),[30399,30634,30846,32899,33131,33352]);assert.equal(transforms.length,6);
 const groups=[transforms.slice(0,3),transforms.slice(3,6)];
 const groupsWithNeighbors=groups.map(g=>{const before=observations[g[0].index-1],after=observations[g.at(-1)!.index+1];assert(before&&after);assert.notEqual(before.ownerMode,'transform');assert.notEqual(after.ownerMode,'transform');assert(g.every(o=>o.clip===g[0].clip));return{before,transform:g,after};});
 const candidate=await loadData(inputBytes.get(pins[0][0])!),original=await loadData(inputBytes.get(pins[5][0])!);
 assert.equal(candidate.animations.length,43);assert.equal(manifest.jointNames.length,57);
 for(const name of manifest.jointNames){const bone=candidate.scene.getObjectByName(name);assert(bone instanceof Bone,'JOINT_NOT_BONE:'+name);assert.equal(bone.parent?.name,manifest.jointParents[name],'JOINT_PARENT:'+name);}
 const beforeBind=binds(candidate.scene,true),originalBind=binds(original.scene,true);assert.equal(beforeBind.length,4);assert.deepEqual(beforeBind,originalBind,'ORIGINAL034_BIND_MISMATCH');
 const stableBind=binds(candidate.scene,false);
 result.bindGuard={jointParents:57,skinnedMeshes:4,original034Equality:true,loadedBindSHA256:sha(JSON.stringify(beforeBind))};
 const mount=new Group();mount.rotation.set(0,Math.PI,0);mount.scale.setScalar(.8);mount.add(candidate.scene);
 result.coordinateFrame={origin:'Zero outer actor root; source scene mounted under actual scale.8 Ry(pi)',x:'Mounted actor-local right',y:'Up',z:'Authority forward is negativeZ; forwardDelta=-deltaZ',ankles:ankleNames,qualification:'Bone heads, not pad surfaces; no native position/yaw/pivot added'};
 const mixer=new AnimationMixer(candidate.scene),actions=new Map(candidate.animations.map(clip=>{const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.setEffectiveWeight(0);return[clip.name,action] as const;}));
 const samples:{observation:Observation;ankles:Record<Ankle,XYZ>}[]=[];
 for(const group of groupsWithNeighbors)for(const observation of [group.before,...group.transform,group.after]){
  guard();const action=actions.get(observation.clip),contract=manifest.clips[observation.clip];assert(action&&contract,'MISSING_ACTUAL_ACTION');assert.equal(action.getClip().duration,contract.duration);assert.equal(action.getClip().tracks.length,contract.channels);assert(observation.clipTime>=0&&observation.clipTime<=action.getClip().duration,'SAVED_TIME_OUTSIDE_LOADED_CLIP');
  for(const a of actions.values())a.setEffectiveWeight(0);action.enabled=true;action.time=observation.clipTime;action.setEffectiveWeight(1);mixer.update(0);mount.updateWorldMatrix(true,true);
  assert.equal(action.time,observation.clipTime);assert.equal(action.getEffectiveWeight(),1);assert.equal([...actions.values()].filter(a=>a.getEffectiveWeight()>.001).length,1);
  const ankles=Object.fromEntries((Object.entries(ankleNames) as [Ankle,string][]).map(([alias,name])=>{assert(manifest.jointNames.includes(name));const bone=candidate.scene.getObjectByName(name);assert(bone instanceof Bone);const p=bone.getWorldPosition(new Vector3());assert([p.x,p.y,p.z].every(Number.isFinite),'NONFINITE_ANKLE');return[alias,{x:p.x,y:p.y,z:p.z}];})) as Record<Ankle,XYZ>;
  const sampled={observation,ankles};samples.push(sampled);(result.samples as unknown[]).push(sampled);
 }
 const comparisons=groupsWithNeighbors.map(group=>{
  const find=(o:Observation)=>samples.find(s=>s.observation.index===o.index)!;
  const pairs=[{kind:'sampled-entry',from:group.before,to:group.transform[0]},...group.transform.slice(1).map((to,i)=>({kind:'within-R',from:group.transform[i],to})),{kind:'within-R-first-to-last',from:group.transform[0],to:group.transform.at(-1)!},{kind:'sampled-exit',from:group.transform.at(-1)!,to:group.after}];
  return{transform:group.transform[0].clip,pairs:pairs.map(p=>({kind:p.kind,from:p.from,to:p.to,ownerRenderTimeDifference:p.to.ownerRenderTime-p.from.ownerRenderTime,ankleDifferences:differences(find(p.from).ankles,find(p.to).ankles),qualification:'Actual curve poses at sparse saved owner clocks; asynchronous native samples and sampled entry/exit, not exact boundary jump or world-contact slip'}))};
 });
 assert.deepEqual(binds(candidate.scene,false),stableBind,'ANIMATION_CHANGED_STABLE_BINDS');
 result.comparisons=comparisons;result.stableBindPreservedAfterSampling=true;
 for(const [path,expected] of pins)assert.equal(sha(readFileSync(path)),expected,'INPUT_CHANGED_AFTER:'+path);
 mixer.stopAllAction();mixer.uncacheRoot(candidate.scene);guard();result.status='MEASURED_REVIEW_REQUIRED';result.error=null;result.elapsedMs=performance.now()-began;save();
 console.log(JSON.stringify({status:result.status,elapsedMs:result.elapsedMs,samples:samples.length,comparisons:comparisons.length,result:output}));
}catch(error){result.status='FIRST_FAILURE_STOP';result.error=String(error);result.elapsedMs=performance.now()-began;save();console.error(JSON.stringify({status:result.status,error:result.error,result:output}));process.exitCode=1;}
finally{clearTimeout(timer);}
