/** Current geometry reads + finite public waypoint proposal. No native state writes. */
import {Navigation} from '../../shared/navigation.ts';
import {cityBlocks,cityBlockActive,cityDistrict} from '../../shared/cityDistrict.ts';
import {terrainHeight,generateChunk,landmarkBlocks,propCollider} from '../../shared/world.ts';
import {traversalBlocks} from '../../shared/traversal.ts';
import {encounterBlocks} from '../../shared/encounters.ts';
import {actorHullRadius,QUADRUPED_HEIGHT} from '../../shared/config.ts';
import {structuralPropNavigationBlocked} from '../../shared/structuralPropNavigation.ts';
const ARRIVAL=1.1,RADIUS=1.75,CLEAR=RADIUS+ARRIVAL,MAX_POINTS=12;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function groundGeometry133(s){
 const navigation=new Navigation(s.seed);navigation.setStructureFilter(b=>cityBlockActive(b,s.structures));navigation.setPropFilter(p=>!p.id||(s.cover.find(c=>c.id===p.id)?.hp??1)>0);
 const blocks=[...cityBlocks(s.seed).filter(b=>cityBlockActive(b,s.structures)),...landmarkBlocks(s.seed),...traversalBlocks(s.seed),...encounterBlocks(s.seed)];
 // Current native ruin poses conservatively reserve each original cell extent.
 const source=cityDistrict(s.seed)?.blocks??[];
 for(const ruin of s.ruins??[]){const b=source[ruin.block];if(!b)continue;const {x,y,z,w}=ruin.rotation,m=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];blocks.push({...b,id:b.id+':current-ruin',position:[ruin.position.x,ruin.position.y,ruin.position.z],halfExtents:m.map(row=>row.reduce((sum,v,i)=>sum+Math.abs(v)*b.halfExtents[i],0)),yaw:0});}
 return {snapshot:s,navigation,blocks,props:new Map()};
}
export function groundPointClear133(g,p){
 const s=g.snapshot,ground=terrainHeight(p.x,p.z,s.seed),y=ground+1;
 for(const a of g.parked??[])if(a.id!==g.moverId&&a.hp>0&&Math.abs(a.position.y-y)<QUADRUPED_HEIGHT&&dist(p,a.position)<CLEAR+actorHullRadius(a))return false;
 if(!g.navigation.walkable({x:p.x,y,z:p.z}))return false;
 for(const b of g.blocks){if(b.position[1]+b.halfExtents[1]<=ground+.05||b.position[1]-b.halfExtents[1]>=ground+QUADRUPED_HEIGHT+.08)continue;const dx=p.x-b.position[0],dz=p.z-b.position[2],c=Math.cos(b.yaw),n=Math.sin(b.yaw);if(Math.abs(dx*c-dz*n)<b.halfExtents[0]+CLEAR&&Math.abs(dx*n+dz*c)<b.halfExtents[2]+CLEAR)return false;}
 for(let cx=Math.floor((p.x-20)/64);cx<=Math.floor((p.x+20)/64);cx++)for(let cz=Math.floor((p.z-20)/64);cz<=Math.floor((p.z+20)/64);cz++){const id=cx+','+cz;if(!g.props.has(id))g.props.set(id,generateChunk(s.seed,cx,cz).props);for(const q of g.props.get(id)){if(q.id&&(s.cover.find(c=>c.id===q.id)?.hp??1)<=0)continue;if(q.kind==='crane'){if(structuralPropNavigationBlocked('crane',q,{x:p.x,y,z:p.z},{minY:ground+.05,maxY:ground+QUADRUPED_HEIGHT+.08},CLEAR))return false;continue;}const h=propCollider(q);if(!h)continue;const dx=p.x-q.x,dz=p.z-q.z,c=Math.cos(q.rotation),n=Math.sin(q.rotation);if(Math.abs(dx*c-dz*n)<h[0]+CLEAR&&Math.abs(dx*n+dz*c)<h[2]+CLEAR)return false;}}
 return true;
}
function segmentClear(g,a,b){const count=Math.ceil(dist(a,b)/.5);for(let i=1;i<=count;i++)if(!groundPointClear133(g,{x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count}))return false;return true;}
export function planGroundPath133(g,from,to){
 if(!groundPointClear133(g,to))return null;
 const nativeRoute=g.navigation.path(from,{...to,y:terrainHeight(to.x,to.z,g.snapshot.seed)+1});
 if(!nativeRoute.length&&dist(from,to)>=ARRIVAL)return null;
 const route=[...nativeRoute.map(p=>({x:p.x,z:p.z})),{x:to.x,z:to.z}],result=[];let at={x:from.x,z:from.z},i=0;
 while(i<route.length){let next=i;for(let j=route.length-1;j>=i;j--)if(segmentClear(g,at,route[j])){next=j;break;}if(!segmentClear(g,at,route[next]))return null;result.push(route[next]);at=route[next];i=next+1;if(result.length>MAX_POINTS)return null;}
 return result;
}
export async function planExposure133(s,names,observedLOS,guard){
 const began=Date.now(),g=groundGeometry133(s),humans=names.map(name=>s.actors.find(a=>a.name===name));
 if(humans.some(a=>!a||a.hp<=0||a.downed||!a.grounded||actorHullRadius(a)!==RADIUS))throw Error('Current healthy grounded Pounce squad required for exposure plan');
 const candidates=s.actors.filter(a=>a.bot&&a.hp>0&&a.grounded&&!a.climb&&Math.abs(a.position.y-(terrainHeight(a.position.x,a.position.z,s.seed)+1))<1.1).sort((a,b)=>dist(a.position,humans[0].position)-dist(b.position,humans[0].position)).slice(0,8),rejected=[];
 for(const enemy of candidates)for(const turn of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI,-3*Math.PI/4,3*Math.PI/4]){
  guard();if(Date.now()-began>2000)throw Error('Exposure source planning2s finite CPU bound; unqualified');
  const angle=enemy.yaw+turn,near=enemy.role==='mortar'?20:8,far=near+6,goals=[near,far].map(r=>({x:enemy.position.x-Math.sin(angle)*r,z:enemy.position.z-Math.cos(angle)*r}));
  const routes=goals.map((goal,i)=>{g.moverId=humans[i].id;g.parked=s.actors.map(a=>i===1&&a.id===humans[0].id?{...a,position:{...a.position,...goals[0]}}:a);return planGroundPath133(g,humans[i].position,goal);});if(routes.some(r=>!r)){rejected.push({id:enemy.id,turn,reason:'no-hull-clear-finite-ground-route'});continue;}
  if(enemy.role==='mortar'&&Math.cos(turn)<=-.25){rejected.push({id:enemy.id,turn,reason:'outside-current-AI-facing'});continue;}
  const pairs=goals.map(goal=>({from:{...enemy.position,y:enemy.position.y+.65},to:{...goal,y:terrainHeight(goal.x,goal.z,s.seed)+1+.4}})),sight=await observedLOS(pairs);guard();
  if(sight.some(v=>v!==true)){rejected.push({id:enemy.id,turn,reason:'current-native-sight-query-occluded'});continue;}
  // The static paths are sequentially traversed, with final pair six metres
  // apart; no snapshot is used as a replayed control or actual arrival proof.
  return {contract:'CURRENT_GROUND_THREAT_HULL_CLEAR_ROUTE_AND_READONLY_NATIVE_SIGHT',targetId:enemy.id,targetPosition:enemy.position,goals,routes,sourceSight:sight,rejected,plannerMs:Date.now()-began,margin:{nativeHull:RADIUS,existingArrival:ARRIVAL,conservativeRouteEnvelope:CLEAR},actualArrivalAndLOS:'REQUIRED_AFTER_PUBLIC_TRAVERSAL'};
 }
 throw Error('No current reachable hull-clear ground threat with native LOS; organic lifecycle UNQUALIFIED');
}
