import {groundGeometry138} from './geometry-source.mjs';
import {terrainHeight,generateChunk,propCollider,propFootprint,isRequiredLane} from '../../shared/world.ts';
import {getMap,serviceWorkshops} from '../../shared/maps.ts';
import {cityDistrict} from '../../shared/cityDistrict.ts';
import {structuralPropNavigationBlocked} from '../../shared/structuralPropNavigation.ts';
import {actorHullRadius,QUADRUPED_HEIGHT} from '../../shared/config.ts';
import {terrainBaseHeight201} from './terrain-base.mjs';
export const ARRIVAL201=1.1,CLEAR201=1.75+1.1;
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),key=p=>p.x+','+p.z;
function local(p,b){const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=p.x-b.position[0],z=p.z-b.position[2];return {x:x*c-z*s,z:x*s+z*c};}
function boxSegment(a,b,o,r){const u=local(a,o),v=local(b,o);let lo=0,hi=1;for(const [axis,h] of [['x',o.halfExtents[0]+r],['z',o.halfExtents[2]+r]]){const delta=v[axis]-u[axis];if(!delta){if(Math.abs(u[axis])>=h)return false;continue;}const t1=(-h-u[axis])/delta,t2=(h-u[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;}return hi>0&&lo<1;}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return d(p,{x:a.x+t*dx,z:a.z+t*dz});}
function pads(seed){const map=getMap(seed),out=[];for(const p of map.props)if(p.elevation===undefined&&['workshop','cargo','pipes','tower','wall','crane'].includes(p.kind)){let [hx,hz]=propFootprint({...p,y:0});if(p.kind==='workshop'&&serviceWorkshops(seed).some(q=>q.x===p.x&&q.z===p.z))hx=Math.max(hx,12*p.scale+3.8);const h=propCollider({...p,y:0}),radius=h?Math.hypot(h[0],h[2]):1;if(isRequiredLane(p.x,p.z,seed,radius))continue;out.push({position:[p.x,terrainBaseHeight201(p.x,p.z,seed),p.z],halfExtents:[hx+2,0,hz+2],yaw:p.rotation});}for(const b of cityDistrict(seed)?.buildings??[])out.push({position:[b.position.x,b.position.y,b.position.z],halfExtents:[b.width/2+6,0,b.depth/2+2],yaw:b.yaw});return out;}
/** Analytic support proof for the existing Rainline inner constant base only.
 * Road/pad blend values are exactly the same height; any differing pad's full
 * eight-metre shoulder is excluded. Other terrain is explicitly unsupported. */
export function terrainCertificate201(g,a,b,r){const s=g.snapshot,grading=cityDistrict(s.seed)?.grading,map=getMap(s.seed),h=-.08;if(map.seed!==7734||Math.max(Math.hypot(a.x,a.z),Math.hypot(b.x,b.z))+r>95||Math.min(a.x,b.x)-r< -108||map.roads.some(q=>q.points.some(p=>p.y!==h))||grading&&grading.height!==h)return {clear:false,reason:'UNSUPPORTED_TERRAIN_ENVELOPE'};
 for(const p of g.terrainPads??=pads(s.seed))if(p.position[1]!==h&&boxSegment(a,b,p,r+8))return {clear:false,reason:'DIFFERING_TERRAIN_PAD_SHOULDER',pad:p};
 return {clear:true,height:h,method:'ANALYTIC_CONSTANT_BASE_AND_EQUAL_ROAD_PAD_BLEND',radius:r};}
export function geometry201(snapshot,moverId){const g=groundGeometry138(snapshot);g.moverId=moverId;g.parked=snapshot.actors;g.allProps=new Map();
 // Authored prop centres may lie outside the local random chunk search.
 for(const p of getMap(snapshot.seed).props){const k=Math.floor(p.x/64)+','+Math.floor(p.z/64);if(!g.allProps.has(k))g.allProps.set(k,generateChunk(snapshot.seed,Math.floor(p.x/64),Math.floor(p.z/64)).props);}return g;}
function propsNear(g,a,b,r){const found=new Map(g.allProps);for(let x=Math.floor((Math.min(a.x,b.x)-r-10)/64);x<=Math.floor((Math.max(a.x,b.x)+r+10)/64);x++)for(let z=Math.floor((Math.min(a.z,b.z)-r-10)/64);z<=Math.floor((Math.max(a.z,b.z)+r+10)/64);z++){const k=x+','+z;if(!g.props.has(k))g.props.set(k,generateChunk(g.snapshot.seed,x,z).props);found.set(k,g.props.get(k));}return [...found.values()].flat();}
/** Continuous segment vs all original boxes/circles. Structural triangles are
 * covered by complete enclosing discs, not sparse perimeter sampling. Flat
 * support proves their vertical query band constant over every disc. */
export function certify201(g,a,b,{endpoint=false}={}){return certifyRadius201(g,a,b,CLEAR201+(endpoint?ARRIVAL201:0),endpoint,'NORMAL_PLANNING');}
export function certifyInteractionSeparation201(g,a,b){const mover=g.snapshot.actors.find(q=>q.id===g.moverId);if(!mover||actorHullRadius(mover)!==1.75)throw Error('201 explicit Pounce interaction separation only');return certifyRadius201(g,a,b,actorHullRadius(mover)+.05,false,'NATIVE_PHYSICAL_INTERACTION_SEPARATION');}
function certifyRadius201(g,a,b,r,endpoint,scope){const terrain=terrainCertificate201(g,a,b,r);if(!terrain.clear)return {clear:false,terrain};const h=terrain.height,minY=h+.05,maxY=h+QUADRUPED_HEIGHT+.08;
 for(const q of g.blocks)if(q.position[1]+q.halfExtents[1]>minY&&q.position[1]-q.halfExtents[1]<maxY&&boxSegment(a,b,q,r))return {clear:false,blocker:{kind:'STATIC_BLOCK',owner:q.id},terrain};
 for(const q of g.parked)if(q.id!==g.moverId&&q.hp>0&&Math.abs(q.position.y-(h+1))<QUADRUPED_HEIGHT&&segmentDistance(q.position,a,b)<r+actorHullRadius(q)+(q.plannedArrival201??0))return {clear:false,blocker:{kind:q.bot?'NPC_OCCUPANCY':'PARKED_TEAMMATE',owner:q.id,position:q.position,velocity:q.velocity},terrain};
 for(const q of propsNear(g,a,b,r)){if(q.id&&(g.snapshot.cover.find(c=>c.id===q.id)?.hp??1)<=0)continue;if(['crane','cargo','tower','pipes','wall'].includes(q.kind)){const count=Math.max(1,Math.ceil(d(a,b)/.5)),enclosing=r+d(a,b)/count/2;for(let i=0;i<count;i++){const t=(i+.5)/count,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(structuralPropNavigationBlocked(q.kind,q,p,{minY,maxY},enclosing))return {clear:false,blocker:{kind:'STATIC_COMPONENT_PROP',owner:q.id??q.kind},terrain};}}else{const ext=propCollider(q);if(ext&&boxSegment(a,b,{position:[q.x,q.y,q.z],halfExtents:ext,yaw:q.rotation},r))return {clear:false,blocker:{kind:'STATIC_PROP',owner:q.id??q.kind},terrain};}}
 return {clear:true,terrain,allBlocks:g.blocks.length,allActorOccupancy:g.parked.length,completeArrivalRadius:endpoint?ARRIVAL201:null,clearance:r,scope};}
export function plan201(g,from,to,guard=()=>{}){g.rejection=null;const began=Date.now(),check=()=>{guard();if(Date.now()-began>1500)throw Error('201 original1500ms search CPU bound');},reject=(branch,certificate)=>{g.rejection={branch,certificate};return null;};check();const origin=certify201(g,from,from);if(!origin.clear)return reject('CURRENT_ORIGIN_NOT_FULL_CLEAR',origin);const end=certify201(g,to,to,{endpoint:true});if(!end.clear)return reject('ENTIRE_ARRIVAL_REGION_BLOCKED',end);
 const edge=(a,b)=>{check();return certify201(g,a,b).clear;};if(edge(from,to))return [{x:to.x,z:to.z}];
 const open=[{p:{x:0,z:0},f:d(from,to)}],cost=new Map([['0,0',0]]),parents=new Map(),closed=new Set(),free=new Map(),point=p=>({x:from.x+p.x*2,z:from.z+p.z*2});let finish=null;
 for(let n=0;open.length&&n<1800;n++){check();open.sort((a,b)=>a.f-b.f);const {p}=open.shift(),k=key(p);if(closed.has(k))continue;closed.add(k);const at=point(p);if(d(at,to)<=4&&edge(at,to)){finish=p;break;}for(const x of [-1,0,1])for(const z of [-1,0,1]){if(!x&&!z)continue;const next={x:p.x+x,z:p.z+z},nk=key(next);if(closed.has(nk)||Math.abs(next.x)>224||Math.abs(next.z)>224)continue;const dest=point(next);if(!free.has(nk))free.set(nk,certify201(g,dest,dest,{endpoint:true}).clear);if(!free.get(nk)||!edge(at,dest))continue;const c=cost.get(k)+Math.hypot(x,z)*2;if(c>=(cost.get(nk)??Infinity))continue;cost.set(nk,c);parents.set(nk,p);open.push({p:next,f:c+d(dest,to)});}}
 if(!finish)return reject('ORIGINAL1800_EXPANSION_BOUND_OR_NO_SAFE_CORRIDOR');const raw=[to];for(let p=finish;p;p=parents.get(key(p)))if(key(p)!=='0,0')raw.unshift(point(p));const path=[];let at=from;while(raw.length){let index=0;for(let i=raw.length-1;i>=0;i--)if(edge(at,raw[i])){index=i;break;}const dest=raw[index];path.push({x:dest.x,z:dest.z});at=dest;raw.splice(0,index+1);if(path.length>12)return reject('ORIGINAL12_WAYPOINT_BOUND');}return path;}





