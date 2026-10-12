import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {planExposure138 as baseline} from '../overhaul-coop-151/exposure-planner.mjs';
import {planExposure153 as candidate} from './exposure-search.mjs';
import {groundGeometry138,groundPointClear138,segmentClear138} from './exposure-planner.mjs';
const source='.sites-runtime/overhaul-20261010/coop151-public/native-keyframes.json',bytes=await readFile(source),rows=JSON.parse(bytes),row=rows.find(r=>r.page==='host'&&r.tick===11904);
if(!row)throw Error('Exact saved11904 read missing; do not substitute another snapshot');
const s=row.shared,names=s.actors.filter(a=>!a.bot).map(a=>a.name),out={writer:'CLOSED',scope:'ONE_OFFLINE_SAME_EXACT_SAVED_READ_COMPARISON_NOT_FAILED_INPUT_OR_NATIVE_SIGHT_OR_PUBLIC_PLAY',source,sourceSha256:createHash('sha256').update(bytes).digest('hex'),tick:s.tick,publication:s.publication,snapshotSha256:createHash('sha256').update(JSON.stringify(s)).digest('hex'),oracle:'Explicit permissive all-clear external sight fixture for route-search cost. No actual native visibility is claimed; both algorithms receive the identical oracle.',runs:[]};
for(const [label,plan] of [['baseline',baseline],['candidate',candidate]]){
 const at=performance.now(),trace={};let calls=0,pairs=0;
 try{
  const result=await plan(s,names,async p=>{calls++;pairs+=p.length;return p.map(()=>true);},()=>{if(performance.now()-at>4000)throw Error('Fixture4s absolute guard');},trace);
  // A successful proposal still must retain all living native-snapshot actors.
  for(let i=0;i<2;i++){const g=groundGeometry138(s),a=s.actors.find(a=>a.name===names[i]);g.moverId=a.id;g.parked=s.actors.map(x=>i===1&&x.name===names[0]?{...x,position:{...x.position,...result.goals[0]}}:x);if(!groundPointClear138(g,result.goals[i]))throw Error('Candidate endpoint weakened occupancy');let from=a.position;for(let j=0;j<result.routes[i].length;j++){const to=result.routes[i][j];if(!segmentClear138(g,from,to,j?1.1:0))throw Error('Returned route fails unchanged exact segment guard');from=to;}}
  out.runs.push({label,elapsedMs:performance.now()-at,status:'OFFLINE_ROUTE_PROPOSAL_ONLY',sightCalls:calls,sightPairs:pairs,targetId:result.targetId,goals:result.goals,routePoints:result.routes.map(r=>r.length),plannerMs:result.plannerMs,routeAttempts:trace.routeAttempts,rejected:result.rejected?.length});
 }catch(error){out.runs.push({label,elapsedMs:performance.now()-at,status:'PLANNING_UNQUALIFIED',failure:String(error),sightCalls:calls,sightPairs:pairs,trace});
  if(!String(error).includes('planning2s finite CPU bound')&&!String(error).includes('No current reachable')){await writeFile(new URL('./comparison-receipt.json',import.meta.url),JSON.stringify(out,null,2));throw error;}
 }
}
await writeFile(new URL('./comparison-receipt.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({tick:s.tick,scope:out.scope,runs:out.runs.map(({trace,...r})=>r)}));
if(out.runs[1].status!=='OFFLINE_ROUTE_PROPOSAL_ONLY')throw Error('FIRST_ACTUAL_CANDIDATE_SOURCE_LIMITATION_STOP: candidate did not produce a guarded route within unchanged2s');
