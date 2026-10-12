import {geometry201,certify201,plan201} from './planner.mjs';
import {terrainHeight} from '../../shared/world.ts';
import {actorHullRadius} from '../../shared/config.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** One immutable current read; cheap rejection and one sight batch precede A*. */
export async function planExposure201(s,names,observedLOS,guard,trace={}){
 const began=Date.now(),deadline=began+2000;
 const check=()=>{guard();if(Date.now()>deadline)throw Error('Exposure source planning2s finite CPU bound; unqualified');};
 Object.assign(trace,{tick:s.tick,publication:s.publication,began,deadline,candidates:[],routeAttempts:0,sightPairs:0,status:'RUNNING'});
 try{
  check();const g=geometry201(s,null),humans=names.map(name=>s.actors.find(a=>a.name===name));
  if(humans.some(a=>!a||a.hp<=0||a.downed||!a.grounded||actorHullRadius(a)!==1.75))throw Error('Current healthy grounded Pounce squad required for exposure plan');
  const enemies=s.actors.filter(a=>a.bot&&a.hp>0&&a.grounded&&!a.climb&&Math.abs(a.position.y-(terrainHeight(a.position.x,a.position.z,s.seed)+1))<1.1).sort((a,b)=>distance(a.position,humans[0].position)-distance(b.position,humans[0].position)).slice(0,8),viable=[];
  const bind=(i,goals)=>{g.moverId=humans[i].id;g.parked=s.actors;};
  for(const enemy of enemies)for(const turn of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI,-3*Math.PI/4,3*Math.PI/4]){
   check();const row={id:enemy.id,turn,reason:null};trace.candidates.push(row);
   if(enemy.role==='mortar'&&Math.cos(turn)<=-.25){row.reason='outside-current-AI-facing';continue;}
   const angle=enemy.yaw+turn,near=enemy.role==='mortar'?20:8,goals=[near,near+6].map(r=>({x:enemy.position.x-Math.sin(angle)*r,z:enemy.position.z-Math.cos(angle)*r}));
   row.goals=goals;let blocked=false;
   for(let i=0;i<2;i++){bind(i,goals);if(!certify201(g,goals[i],goals[i],{endpoint:true}).clear){row.reason='current-endpoint-blocked';row.blocker=structuredClone(g.lastBlock);blocked=true;break;}}
   if(blocked)continue;
   const pairs=goals.map(goal=>({from:{...enemy.position,y:enemy.position.y+.65},to:{...goal,y:terrainHeight(goal.x,goal.z,s.seed)+1+.4}}));
   viable.push({enemy,turn,goals,pairs,row,cost:goals.reduce((sum,p,i)=>sum+distance(humans[i].position,p),0)});
  }
  check();viable.sort((a,b)=>a.cost-b.cost);
  // The browser provides actual native sight for all viable pairs in one read.
  // A failed/malformed sight result never substitutes synthetic visibility.
  const pairs=viable.flatMap(v=>v.pairs);trace.sightPairs=pairs.length;
  const sight=pairs.length?await observedLOS(pairs):[];check();
  if(!Array.isArray(sight)||sight.length!==pairs.length||sight.some(v=>typeof v!=='boolean'))throw Error('Actual exposure sight batch missing or malformed');
  for(let n=0;n<viable.length;n++){
   check();const v=viable[n],sourceSight=sight.slice(n*2,n*2+2);v.row.cost=v.cost;
   if(sourceSight.some(x=>x!==true)){v.row.reason='current-native-sight-query-occluded';continue;}
   const routes=[];let failed=false;
   for(let i=0;i<2;i++){
    check();bind(i,v.goals);g.exposureDeadline153=deadline;trace.routeAttempts++;
    const path=plan201(g,humans[i].position,v.goals[i],check);check();
    if(!path){v.row.reason='no-hull-clear-finite-ground-route';v.row.routePilot=i;v.row.rejection=structuredClone(g.rejection);failed=true;break;}routes.push(path);
   }
   if(failed)continue;
   trace.status='CURRENT_ROUTE_AND_SIGHT_PROPOSAL';trace.plannerMs=Date.now()-began;
   return {contract:'CURRENT_GROUND_THREAT_HULL_CLEAR_ROUTE_AND_READONLY_NATIVE_SIGHT',targetId:v.enemy.id,targetPosition:v.enemy.position,goals:v.goals,routes,sourceSight,rejected:trace.candidates.filter(r=>r.reason),plannerMs:trace.plannerMs,search:trace,margin:{nativeHull:1.75,existingArrival:1.1,conservativeRouteEnvelope:2.85},nextGoals:'UNCOMMITTED_UNTIL_ACTUAL_PHASE_HANDOFF',actualArrivalAndLOS:'REQUIRED_AFTER_PUBLIC_TRAVERSAL'};
  }
  throw Error('No current reachable hull-clear ground threat with native LOS; organic lifecycle UNQUALIFIED');
 }catch(error){trace.status='FIRST_PLANNING_FAILURE_STOP';trace.failure=String(error);trace.plannerMs=Date.now()-began;throw error;}
}





