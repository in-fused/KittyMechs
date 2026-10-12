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
const noteBlock=g=>{if(g.blockedOwners&&g.blockedOwners.size<64)g.blockedOwners.set(g.lastBlock.kind+":"+g.lastBlock.owner,g.lastBlock);return false;};
export function groundGeometry138(s){
 const navigation=new Navigation(s.seed);navigation.setStructureFilter(b=>cityBlockActive(b,s.structures));navigation.setPropFilter(p=>!p.id||(s.cover.find(c=>c.id===p.id)?.hp??1)>0);
 const blocks=[...cityBlocks(s.seed).filter(b=>cityBlockActive(b,s.structures)),...landmarkBlocks(s.seed),...traversalBlocks(s.seed),...encounterBlocks(s.seed)];
 // Current native ruin poses conservatively reserve each original cell extent.
 const source=cityDistrict(s.seed)?.blocks??[];
 for(const ruin of s.ruins??[]){const b=source[ruin.block];if(!b)continue;const {x,y,z,w}=ruin.rotation,m=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];blocks.push({...b,id:b.id+':current-ruin',position:[ruin.position.x,ruin.position.y,ruin.position.z],halfExtents:m.map(row=>row.reduce((sum,v,i)=>sum+Math.abs(v)*b.halfExtents[i],0)),yaw:0});}
 return {snapshot:s,navigation,blocks,props:new Map()};
}
export function groundPointClear138(g,p,margin=ARRIVAL){
 if(g.exposureDeadline153!==undefined&&Date.now()>g.exposureDeadline153)throw Error("Exposure source planning2s finite CPU bound; unqualified");
 g.lastBlock=null;
 const clearance=RADIUS+margin;const s=g.snapshot,ground=terrainHeight(p.x,p.z,s.seed),y=ground+1;
 for(const a of g.parked??[])if(a.id!==g.moverId&&a.hp>0&&Math.abs(a.position.y-y)<QUADRUPED_HEIGHT&&dist(p,a.position)<clearance+actorHullRadius(a)){g.lastBlock={kind:a.bot?'NPC_OCCUPANCY':'PARKED_TEAMMATE',owner:a.id,position:a.position,velocity:a.velocity,point:p,clearance,actorRadius:actorHullRadius(a)};return noteBlock(g);}

 for(const b of g.blocks){if(b.position[1]+b.halfExtents[1]<=ground+.05||b.position[1]-b.halfExtents[1]>=ground+QUADRUPED_HEIGHT+.08)continue;const dx=p.x-b.position[0],dz=p.z-b.position[2],c=Math.cos(b.yaw),n=Math.sin(b.yaw);if(Math.abs(dx*c-dz*n)<b.halfExtents[0]+clearance&&Math.abs(dx*n+dz*c)<b.halfExtents[2]+clearance){g.lastBlock={kind:'STATIC_BLOCK',owner:b.id,position:b.position,halfExtents:b.halfExtents,yaw:b.yaw,point:p,clearance};return noteBlock(g);}}
 for(let cx=Math.floor((p.x-20)/64);cx<=Math.floor((p.x+20)/64);cx++)for(let cz=Math.floor((p.z-20)/64);cz<=Math.floor((p.z+20)/64);cz++){const id=cx+','+cz;if(!g.props.has(id))g.props.set(id,generateChunk(s.seed,cx,cz).props);for(const q of g.props.get(id)){if(q.id&&(s.cover.find(c=>c.id===q.id)?.hp??1)<=0)continue;if(['crane','cargo','tower','pipes','wall'].includes(q.kind)){if(structuralPropNavigationBlocked(q.kind,q,{x:p.x,y,z:p.z},{minY:ground+.05,maxY:ground+QUADRUPED_HEIGHT+.08},clearance)){g.lastBlock={kind:"STATIC_COMPONENT_PROP",owner:q.id??id+":"+q.kind,prop:q,point:p,clearance};return noteBlock(g);}continue;}const h=propCollider(q);if(!h)continue;const dx=p.x-q.x,dz=p.z-q.z,c=Math.cos(q.rotation),n=Math.sin(q.rotation);if(Math.abs(dx*c-dz*n)<h[0]+clearance&&Math.abs(dx*n+dz*c)<h[2]+clearance){g.lastBlock={kind:"STATIC_PROP",owner:q.id??id+":"+q.kind,prop:q,halfExtents:h,point:p,clearance};return noteBlock(g);}}}
 return true;
}
export function segmentClear138(g,a,b,margin=ARRIVAL){const count=Math.ceil(dist(a,b)/.5);for(let i=1;i<=count;i++){const p={x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count};if(!groundPointClear138(g,p,margin))return false;}return true;}
export function planGroundPath138(g,from,to,{margin=ARRIVAL}={}){
 g.rejection=null;g.blockedOwners=new Map();const reject=(branch,detail={})=>{g.rejection={branch,...detail,blocker:g.lastBlock??null,blockerRole:["TARGET_BLOCKED","COMPRESSED_SEGMENT_BLOCKED"].includes(branch)?"DECISIVE_SAMPLE":"LAST_SAMPLE_NOT_SOLE_CAUSE",blockedOwners:[...g.blockedOwners.values()],ownerInventoryCapped:g.blockedOwners.size===64};return null;};const began=Date.now(),yaw=g.movementYaw??0,c=Math.cos(yaw),sn=Math.sin(yaw),key=p=>p.x+','+p.z,point=p=>({x:from.x+2*(p.x*c+p.z*sn),z:from.z+2*(-p.x*sn+p.z*c)}),dx=to.x-from.x,dz=to.z-from.z,goal={x:Math.round((dx*c-dz*sn)/2),z:Math.round((dx*sn+dz*c)/2)},origin={x:0,z:0};
 const keyAligned=(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,x=dx*c-dz*sn,z=dx*sn+dz*c;return dist(a,b)<=3||Math.min(Math.abs(x),Math.abs(z),Math.abs(Math.abs(x)-Math.abs(z))/Math.SQRT2)<.1;};
 if(!groundPointClear138(g,to,margin))return reject("TARGET_BLOCKED");
 if(keyAligned(from,to)&&segmentClear138(g,from,to,margin))return [{x:to.x,z:to.z}];
 const free=new Map(),clear=p=>{const k=key(p);if(!free.has(k))free.set(k,groundPointClear138(g,point(p),margin));return free.get(k);};
 const seeds=[];for(let r=0;r<=5;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;const p={x:origin.x+dx,z:origin.z+dz};if(clear(p)&&segmentClear138(g,from,point(p),0))seeds.push(p);}if(!seeds.length)return reject("NO_DEPARTURE_SEED",{seeds:0});
 const finishes=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const p={x:goal.x+dx,z:goal.z+dz};if(clear(p)&&segmentClear138(g,point(p),to,margin))finishes.push(p);}if(!finishes.length)return reject("NO_FINISH_CONNECTOR",{finishes:0});
 const finish=new Set(finishes.map(key)),open=[],cost=new Map(),parent=new Map(),closed=new Set();
 for(const p of seeds){cost.set(key(p),dist(from,point(p)));open.push({p,f:cost.get(key(p))+dist(point(p),to)});}let end=null;
 for(let iterations=0;open.length&&iterations<1800;iterations++){
  if(Date.now()-began>1500)return reject("SEARCH_TIME_BOUND",{iterations,open:open.length,closed:closed.size});open.sort((a,b)=>a.f-b.f);const {p}=open.shift(),k=key(p);if(closed.has(k))continue;closed.add(k);if(finish.has(k)){end=p;break;}
  for(const dx of [-1,0,1])for(const dz of [-1,0,1]){if(!dx&&!dz)continue;const n={x:p.x+dx,z:p.z+dz},nk=key(n);if(closed.has(nk)||Math.abs(n.x)>224||Math.abs(n.z)>224||!clear(n)||!segmentClear138(g,point(p),point(n),margin))continue;const pp=point(p),np=point(n),a=terrainHeight(pp.x,pp.z,g.snapshot.seed),b=terrainHeight(np.x,np.z,g.snapshot.seed);if(Math.abs(a-b)>Math.hypot(dx,dz)*2*.58)continue;const c=cost.get(k)+Math.hypot(dx,dz)*2;if(c>=(cost.get(nk)??Infinity))continue;cost.set(nk,c);parent.set(nk,p);open.push({p:n,f:c+dist(point(n),to)});}
 }
 if(!end)return reject(open.length?"SEARCH_EXPANSION_BOUND":"SEARCH_EXHAUSTED",{closed:closed.size,open:open.length,seeds:seeds.length,finishes:finishes.length});const raw=[{x:to.x,z:to.z}];let p=end;while(p){raw.unshift(point(p));p=parent.get(key(p));}
 const route=[];let at={x:from.x,z:from.z},i=0;while(i<raw.length){let next=i;for(let j=raw.length-1;j>=i;j--)if(keyAligned(at,raw[j])&&segmentClear138(g,at,raw[j],route.length?margin:0)){next=j;break;}if(!segmentClear138(g,at,raw[next],route.length?margin:0))return reject("COMPRESSED_SEGMENT_BLOCKED",{from:at,to:raw[next],route});route.push(raw[next]);at=raw[next];i=next+1;if(route.length>MAX_POINTS)return reject("WAYPOINT_BOUND",{points:route.length});}return route;
}
export function chooseStage138(s,name,objective,{reach=4,parked=null}={}){
 const actor=s.actors.find(a=>a.name===name);if(!actor||actor.hp<=0||!actor.grounded)throw Error('Living grounded staging pilot required');const g=groundGeometry138(s);g.moverId=actor.id;g.parked=parked??s.actors;
 const radius=Math.min(3,reach-ARRIVAL-.2),points=[{x:objective.x,z:objective.z}];for(const r of [radius,radius*.5])for(let i=0;i<16;i++)points.push({x:objective.x+r*Math.cos(i*Math.PI/8),z:objective.z+r*Math.sin(i*Math.PI/8)});
 points.sort((a,b)=>dist(a,actor.position)-dist(b,actor.position));for(const p of points){if(!groundPointClear138(g,p))continue;const path=planGroundPath138(g,actor.position,p);if(path)return {point:p,path,objective,reach,worstArrivalDistance:dist(p,objective)+ARRIVAL,geometryTick:s.tick};}throw Error('No current hull-clear objective-reachable finite staging route');
}
export async function planExposure138(s,names,observedLOS,guard){
 const began=Date.now(),g=groundGeometry138(s),humans=names.map(name=>s.actors.find(a=>a.name===name));
 if(humans.some(a=>!a||a.hp<=0||a.downed||!a.grounded||actorHullRadius(a)!==RADIUS))throw Error('Current healthy grounded Pounce squad required for exposure plan');
 const candidates=s.actors.filter(a=>a.bot&&a.hp>0&&a.grounded&&!a.climb&&Math.abs(a.position.y-(terrainHeight(a.position.x,a.position.z,s.seed)+1))<1.1).sort((a,b)=>dist(a.position,humans[0].position)-dist(b.position,humans[0].position)).slice(0,8),rejected=[];
 for(const enemy of candidates)for(const turn of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI,-3*Math.PI/4,3*Math.PI/4]){
  guard();if(Date.now()-began>2000)throw Error('Exposure source planning2s finite CPU bound; unqualified');
  const angle=enemy.yaw+turn,near=enemy.role==='mortar'?20:8,far=near+6,goals=[near,far].map(r=>({x:enemy.position.x-Math.sin(angle)*r,z:enemy.position.z-Math.cos(angle)*r}));
  const routes=goals.map((goal,i)=>{g.moverId=humans[i].id;g.parked=s.actors.map(a=>i===1&&a.id===humans[0].id?{...a,position:{...a.position,...goals[0]}}:a);return planGroundPath138(g,humans[i].position,goal);});if(routes.some(r=>!r)){rejected.push({id:enemy.id,turn,reason:'no-hull-clear-finite-ground-route'});continue;}
  if(enemy.role==='mortar'&&Math.cos(turn)<=-.25){rejected.push({id:enemy.id,turn,reason:'outside-current-AI-facing'});continue;}
  const pairs=goals.map(goal=>({from:{...enemy.position,y:enemy.position.y+.65},to:{...goal,y:terrainHeight(goal.x,goal.z,s.seed)+1+.4}})),sight=await observedLOS(pairs);guard();
  if(sight.some(v=>v!==true)){rejected.push({id:enemy.id,turn,reason:'current-native-sight-query-occluded'});continue;}
  // The static paths are sequentially traversed, with final pair six metres
  // apart; no snapshot is used as a replayed control or actual arrival proof.
  return {contract:'CURRENT_GROUND_THREAT_HULL_CLEAR_ROUTE_AND_READONLY_NATIVE_SIGHT',targetId:enemy.id,targetPosition:enemy.position,goals,routes,sourceSight:sight,rejected,plannerMs:Date.now()-began,margin:{nativeHull:RADIUS,existingArrival:ARRIVAL,conservativeRouteEnvelope:CLEAR},actualArrivalAndLOS:'REQUIRED_AFTER_PUBLIC_TRAVERSAL'};
 }
 throw Error('No current reachable hull-clear ground threat with native LOS; organic lifecycle UNQUALIFIED');
}

