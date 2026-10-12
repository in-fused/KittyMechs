/** ONE offline SOURCE geometry fixture; no browser/native simulation step or actor injection. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {groundGeometry138,planGroundPath138,chooseStage138,groundPointClear138} from './exposure-planner.mjs';
const root=resolve(import.meta.dirname,'../..'),began=Date.now();
const rows=JSON.parse(await readFile(resolve(root,'.sites-runtime/overhaul-20261010/coop134-public/native-keyframes.json'),'utf8'));
const snapshot=rows.find(r=>r.shared.actors.filter(a=>!a.bot).length===2)?.shared;
if(!snapshot)throw Error('Actual134 two-player geometry fixture missing');
const sourceActors=snapshot.actors.filter(a=>!a.bot),s=structuredClone(snapshot);
// Fixture positions are pure hypothetical planner inputs, never native actor
// writes or successful public mission evidence. Retained134 observed positions.
s.actors=s.actors.map(a=>a.bot?a:{...a,name:a.id===sourceActors[0].id?'FixtureHost':'FixtureGuest',position:a.id===sourceActors[0].id?{x:-8.347195110559007,y:.9401990775058221,z:12.363144428410617}:{x:-8.363260208142787,y:.9400999820299331,z:18.353160104338475}});
const host=s.actors.find(a=>a.name==='FixtureHost'),g=groundGeometry138(s);g.moverId=host.id;g.parked=s.actors;
const failedGoal={x:-4,z:-8},clear=groundPointClear138(g,failedGoal),path=planGroundPath138(g,host.position,failedGoal),stages={};
for(const id of ['relay-west','relay-east','core','extraction']){const objective=s.objectives.find(o=>o.id===id);try{stages[id]=chooseStage138(s,'FixtureHost',objective.position,{reach:4});}catch(e){stages[id]={failure:String(e)};}}
const result={writer:'CLOSED',scope:'OFFLINE_COMPILED_GEOMETRY_ONLY_NOT_PUBLIC_PLAY_OR_NATIVE_PHYSICS',elapsedMs:Date.now()-began,failed134Goal:{clear,path},stages};
await writeFile(resolve(import.meta.dirname,'geometry-receipt.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({elapsedMs:result.elapsedMs,failedGoalClear:clear,failedGoalRoutePoints:path?.length??null,stages:Object.fromEntries(Object.entries(stages).map(([id,v])=>[id,v.failure??{point:v.point,points:v.path.length,worstDistance:v.worstArrivalDistance}]))}));
if(!stages['relay-west'].path)throw Error('FIRST_SOURCE_GEOMETRY_LIMITATION: west staging has no route');
