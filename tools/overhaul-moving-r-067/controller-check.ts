import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import RAPIER from '@dimforge/rapier3d-compat';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Group,Vector3} from 'three';
import {Identity57Runtime005} from '../../src/game/entities/identity57Runtime005';
import {createGroundSupport067} from '../../src/game/entities/groundSupport067';
import manifest from '../../src/game/entities/identity57Runtime058EManifest.json';
import {ACTOR_HEIGHT} from '../../shared/config';

// Actual source geometry/chains with a deliberately small native fixed-plane
// TEST WORLD. This fixture does not certify the district or actual play.
globalThis.ProgressEvent??=class extends Event{readonly lengthComputable:boolean;readonly loaded:number;readonly total:number;constructor(type:string,init:ProgressEventInit={}){super(type);this.lengthComputable=init.lengthComputable??false;this.loaded=init.loaded??0;this.total=init.total??0;}} as typeof ProgressEvent;
const path=manifest.source,bytes=readFileSync(path);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'381f13348fa5a10b67c23be01844de50e89802738cb8ab13282267685644e7f9');
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()),at=20+bytes.readUInt32LE(12);json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(at+8,at+8+bytes.readUInt32LE(at)).toString('base64');delete json.images;delete json.textures;delete json.materials;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
const loaded=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
let generation=1;const floor=world.createCollider(RAPIER.ColliderDesc.cuboid(50,.05,50).setTranslation(0,-.05,0));world.step();
const provider=createGroundSupport067(world,RAPIER,()=>generation),owner=new Identity57Runtime005(loaded.scene,loaded.animations,'067-fixture',manifest,provider),root=new Group(),body=new Group();root.add(body);body.add(loaded.scene);
assert(owner.diagnostic.feet?.available,'ACTUAL_WEIGHTED_GEOMETRY_NOT_DERIVED');
const records:any[]=[];let position=new Vector3(0,ACTOR_HEIGHT,0),yaw=0,t=10,renderClock=0,stance:'quadruped'|'upright'='quadruped',changed=-100;
function frame(distance:number,reset=false,advance=true){if(advance)t+=1/60;renderClock+=1/60;const state={id:'067-fixture',position:position.clone(),jumpEpoch:1,hp:100,maxHp:100,diedAt:-100,stanceChangedAt:changed,stance,pulseAt:-100,rocketAt:-100,hurtAt:-100};const p={state,time:t,position:position.clone(),yaw,distance,angularDistance:0,grounded:true,velocity:{x:0,y:0,z:-distance*60},reset,climb:null,strike:null,climbProgress:0};owner.step(p as unknown as Parameters<Identity57Runtime005['step']>[0],renderClock,1/60,root,body,false);assert.equal(owner.diagnostic.firstFailure,null);const feet=owner.diagnostic.feet!;assert(feet.available);assert.equal(feet.feet.length,4);for(const foot of feet.feet){assert(foot.weightedVertices>3);assert(foot.marker.every(Number.isFinite));assert(foot.translationLengthError<2e-5,'JOINT_TRANSLATION_LENGTH_CHANGED');assert(Number.isFinite(foot.ankleReach));}records.push(JSON.parse(JSON.stringify(feet)));return feet;}
try{
 for(let i=0;i<30;i++)frame(0,i===0);
 const standing=records.at(-1);assert(standing.feet.every((f:any)=>f.mode==='stance'&&f.error<.05),'STANDING_ANCHOR_NOT_REACHED');
 // Same committed carrier sequence, source R core through both transitions.
 stance='upright';changed=t;for(let i=0;i<60;i++)frame(0);
 assert(records.slice(65,85).some(r=>r.feet.filter((f:any)=>f.limb.startsWith('F')).every((f:any)=>f.mode==='unloaded')),'SOURCE_FORE_RELEASE_NOT_RETAINED');
 stance='quadruped';changed=t;for(let i=0;i<60;i++)frame(0);
 for(let i=0;i<100;i++){const d=.035;position.z-=d;if(i===20){stance='upright';changed=t;}if(i===65){stance='quadruped';changed=t;}frame(d);}
 for(let i=0;i<60;i++){const d=.035;position.z+=d;yaw=Math.PI;if(i===5){stance='upright';changed=t;}if(i===45){stance='quadruped';changed=t;}frame(d);}
 for(let i=0;i<60;i++){yaw+=.015;frame(0);}
 assert(records.some(r=>r.feet.some((f:any)=>f.mode==='swing')),'NO_TRAVEL_SWING_LIFECYCLE');
 world.removeCollider(floor,true);const lost=frame(0);assert(lost.feet.every(f=>f.support===null),'REMOVED_SUPPORT_RETAINED');
 world.createCollider(RAPIER.ColliderDesc.cuboid(50,.05,50).setTranslation(0,-.05,0));world.step();for(let i=0;i<30;i++)frame(0);assert(records.at(-1).feet.some((f:any)=>f.support!==null),'SUPPORT_NOT_RECOVERABLE');
 generation++;const after=frame(0);assert(after.feet.every(f=>!f.support||f.support.generation===generation),'OLD_GENERATION_LEASE_RETAINED');
 // Repeated identical source clip clocks exercise restore-before-mixer-cache
 // ordering; numerical source geometry remains fixed even when source pauses.
 const before=JSON.stringify(records.at(-1).feet.map((f:any)=>f.sourceLengths));const pausedMarker=records.at(-1).feet.map((f:any)=>f.marker);for(let i=0;i<3;i++)frame(0,false,false);assert.equal(JSON.stringify(records.at(-1).feet.map((f:any)=>f.sourceLengths)),before);for(let i=0;i<4;i++)for(let j=0;j<3;j++)assert(Math.abs(records.at(-1).feet[i].marker[j]-pausedMarker[i][j])<1e-7,'REPEATED_SOURCE_CACHE_DRIFT');
 writeFileSync('tools/overhaul-moving-r-067/controller-check-result.json',JSON.stringify({status:'PASS_ACTUAL_SOURCE_CHAIN_AND_NATIVE_TEST_PLANE_ONLY',assetSHA256:manifest.sha256,samples:records.length,records,geometry:'ACTUAL058E_WEIGHTED_VERTICES',support:'DELIBERATE_FIXED_PLANE_TEST_WORLD',actualPlayQualified:false,nativePadQualified:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'PASS_ACTUAL_SOURCE_CHAIN_AND_NATIVE_TEST_PLANE_ONLY',samples:records.length}));
}finally{owner.dispose();world.free();}
