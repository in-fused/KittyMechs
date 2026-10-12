import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {lampNavigationBlocked279} from './lampNavigation279';
import {createRetainedLampColliderDescriptors} from '../../shared/rainlineLampCollision';
import {Navigation as OldNavigation} from '../../shared/navigation';
import {Navigation} from './navigation279.fixture';
import {generateChunk,propCollider} from '../../shared/world';
import source from '../../shared/data/rainlineLampMeshCollision001.json';
const result:any={status:'RUNNING',scope:'retained compiled geometry/NPC+mission source admission checks; no world simulation/browser/native replay',cases:[],failure:null};let last:any=null;
const check=(label:string,actual:boolean,expected:boolean,operands:any={})=>{last={label,actual,expected,operands};result.cases.push(last);assert.equal(actual,expected,label);};
try{
 const prop=generateChunk(7734,-1,0).props.find(p=>p.kind==='lamp'&&p.x===-2.5&&p.z===12)!;assert.ok(prop,'ACTUAL_ROAD_LAMP_INSTANCE');assert.equal(prop.scale,.9);assert.equal(prop.rotation,0);assert.equal(propCollider(prop),null,'UNCHANGED_OLD_PROP_COLLIDER_OMISSION');
 const desc=createRetainedLampColliderDescriptors(prop)[0],native=(desc.shape as any).vertices as Float32Array;assert.deepEqual(Array.from(native),Array.from(Float32Array.from(source.vertices,n=>n*prop.scale)),'ACTUAL_NATIVE_VERTEX_SCALING');assert.deepEqual(Array.from((desc.shape as any).indices),source.indices,'ACTUAL_NATIVE_INDICES');result.nativeGeometry={vertices:native.length/3,triangles:source.indices.length/3,prop,descriptorTranslation:desc.translation,descriptorRotation:desc.rotation};
 const a={x:-2.8386400980165742,z:18.0238562306319},b={x:-2.8386400924050856,z:12.023856217758475},band={minY:-.03,maxY:2.6},stat={clippedTriangles:0,testedTriangles:0};
 check('FAILED_CONTINUOUS_NATIVE_HULL_SEGMENT',lampNavigationBlocked279(prop,a,b,band,1.75,stat),true,{a,b,band,radius:1.75,stat:{...stat}});
 check('FAILED_EXISTING_PLANNER_SEGMENT',lampNavigationBlocked279(prop,a,b,band,2.85),true,{radius:2.85});
 check('FAILED_ENTIRE_ARRIVAL_REGION',lampNavigationBlocked279(prop,b,b,band,3.95),true,{point:b,radius:3.95});
 const bypassA={x:-8,z:18.0238562306319},bypassB={x:-8,z:12.023856217758475};
 check('CLEAR_CONTINUOUS_LAMP_BYPASS',lampNavigationBlocked279(prop,bypassA,bypassB,band,2.85),false,{bypassA,bypassB,band,radius:2.85});
 check('CLEAR_LAMP_BYPASS_ARRIVAL',lampNavigationBlocked279(prop,bypassB,bypassB,band,3.95),false,{point:bypassB,radius:3.95});
 check('BODY_BAND_EXCLUDES_OVERHEAD_ARM',lampNavigationBlocked279(prop,{x:prop.x+.9,z:prop.z},{x:prop.x+.9,z:prop.z},{minY:0,maxY:2.6},.01),false);
 check('SAME_ARM_INCLUDED_AT_ACTUAL_HEIGHT',lampNavigationBlocked279(prop,{x:prop.x+.9,z:prop.z},{x:prop.x+.9,z:prop.z},{minY:4.5,maxY:5.5},.1),true);
 check('ENTIRE_MESH_ABOVE_BODY_BAND',lampNavigationBlocked279({...prop,y:10},b,b,band,3.95),false);
 for(const scale of [.5,.9,1.4])for(const yaw of [0,Math.PI/2,-.73]){
  const p={...prop,x:17,y:2,z:-9,scale,rotation:yaw},transform=(v:{x:number;z:number})=>({x:p.x+v.x*Math.cos(yaw)+v.z*Math.sin(yaw),z:p.z-v.x*Math.sin(yaw)+v.z*Math.cos(yaw)}),left=transform({x:-.1*scale,z:3*scale}),right=transform({x:-.1*scale,z:0});
  check('SCALE_YAW_PIVOT_CORRESPONDENCE:'+scale+':'+yaw,lampNavigationBlocked279(p,left,right,{minY:p.y+.05*scale,maxY:p.y+2.6*scale},1.75*scale),true,{p,left,right});
 }
 const mutable={...prop};check('CACHE_INITIAL_BLOCK',lampNavigationBlocked279(mutable,b,b,band,1.75),true);mutable.x+=20;check('CACHE_MUTATED_PLACEMENT_RECOMPILES',lampNavigationBlocked279(mutable,b,b,band,1.75),false);mutable.x=prop.x;check('CACHE_MUTATED_VERTICAL_BAND_RECOMPILES',lampNavigationBlocked279(mutable,b,b,{minY:9,maxY:10},1.75),false);
 assert.throws(()=>lampNavigationBlocked279({...prop,scale:0},a,b,band,1.75),/279_INVALID/);assert.throws(()=>lampNavigationBlocked279(prop,a,b,{minY:3,maxY:2},1.75),/279_INVALID/);
 const old=new OldNavigation(7734),candidate=new Navigation(7734),point={...b,y:.9401};result.NPC={oldTargetWalkable:old.walkable(point),candidateTargetWalkable:candidate.walkable(point),candidateBypassWalkable:candidate.walkable({...bypassB,y:.9401})};assert.equal(result.NPC.oldTargetWalkable,true,'REAL_BASELINE_NPC_OMISSION');assert.equal(result.NPC.candidateTargetWalkable,false,'NPC_LAMP_OCCUPANCY');assert.equal(result.NPC.candidateBypassWalkable,true,'NPC_CLEAR_BYPASS');
 const planner:any=await import('./planner279.fixture.mjs'),geometry:any=await import('./geometry-source279.fixture.mjs');
 const fixture={snapshot:{seed:7734,actors:[],cover:[],structures:[],ruins:[]},blocks:[],parked:[],moverId:'source-only',allProps:new Map([['-1,0',[prop]]]),props:new Map(),terrainPads:[]};
 const certificate=planner.certify177(fixture,a,b);result.missionCertificate=certificate;assert.equal(certificate.clear,false);assert.equal(certificate.blocker.kind,'RETAINED_LAMP_TRIMESH');
 const endpoint=planner.certify177(fixture,b,b,{endpoint:true});assert.equal(endpoint.clear,false);assert.equal(endpoint.blocker.kind,'RETAINED_LAMP_TRIMESH');
 const gp={...fixture,props:new Map([['-1,0',[prop]]])};assert.equal(geometry.groundPointClear138(gp,b),false);assert.equal(gp.lastBlock?.kind,'RETAINED_LAMP_TRIMESH');
 // NPC final route segments must avoid retained lamp geometry even when a
 // sampled street connector or cached grid endpoint alone appears clear.
 const route=candidate.path({x:-8,y:.94,z:18},{x:-8,y:.94,z:6});assert.ok(route.length>0,'NPC_BYPASS_ROUTE');let prior={x:-8,y:.94,z:18};for(const next of route){assert.equal(lampNavigationBlocked279(prop,prior,next,{minY:Math.min(prior.y,next.y)-1,maxY:Math.max(prior.y,next.y)+2.2},2.3),false,'NPC_CONTINUOUS_ROUTE_LAMP_CLEAR');prior=next;}result.NPC.route=route;
 result.status='PASS_COMPILED_LAMP_NAVIGATION_SOURCE_ONLY';
}catch(error){result.status='FIRST_REMAINING_FAILURE';result.failure={reason:String(error),last};process.exitCode=1;}
finally{await writeFile('tools/overhaul-lamp-navigation-279/results279.json',JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify({status:result.status,cases:result.cases.length,NPC:result.NPC,failure:result.failure}));}
