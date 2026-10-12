import {geometry177,certify177,plan177} from './planner.mjs';
import {terrainHeight} from '../../shared/world.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function chooseActiveStage177(s,name,o,{reach=4,cover=false,extraction=false,guard=()=>{}}={}){
 const start=Date.now(),check=()=>{guard();if(Date.now()-start>2000)throw Error('177 original2s staging CPU bound');},a=s.actors.find(a=>a.name===name),g=geometry177(s,a?.id),assessed=[];
 if(!a||a.hp<=0||a.downed||!a.grounded)throw Error('177 living grounded active stage pilot required');
 const points=[],radii=cover?[7,8]:extraction?[3.2,2.7]:[0,2.7,1.35];for(const r of radii){if(r===0){points.push({x:o.x,z:o.z});continue;}for(let i=0;i<16;i++)points.push({x:o.x+r*Math.cos(i*Math.PI/8),z:o.z+r*Math.sin(i*Math.PI/8)});}
 points.sort((b,c)=>distance(b,a.position)-distance(c,a.position));
 for(const point of points){check();if(distance(point,o)+1.1>=reach)continue;const endpoint=certify177(g,point,point,{endpoint:true});if(!endpoint.clear){assessed.push({point,endpoint});continue;}if(extraction){const y=endpoint.terrain.height+1;if(Math.hypot(distance(point,o)+1.1,y-(o.y+1))>=4.5)continue;}
  const path=plan177(g,a.position,point,check);assessed.push({point,endpoint,rejection:g.rejection});if(path)return {active:name,point,path,endpoint,peerFutureArrival:0,nextGoal:'UNCOMMITTED',tick:s.tick,publication:s.publication,assessed,plannerMs:Date.now()-start};}
 return {active:name,path:null,point:null,assessed,rejection:'NO_CURRENT_ACTIVE_STAGE',plannerMs:Date.now()-start};
}
export function finalExtraction177(s,hostName,guestName,o,guard=()=>{}){
 const start=Date.now(),check=()=>{guard();if(Date.now()-start>2000)throw Error('177 original2s extraction CPU bound');},h=s.actors.find(a=>a.name===hostName),b=s.actors.find(a=>a.name===guestName),c={...o,y:o.y+1};
 if(!h||!b||h.hp<=0||b.hp<=0||h.downed||b.downed||!h.grounded||!b.grounded||Math.hypot(h.position.x-c.x,h.position.y-c.y,h.position.z-c.z)>=4.5)return {point:null,rejection:'ACTUAL_ALIVE_PARKED_HOST_3D_EXTRACTION_REQUIRED'};
 const g=geometry177(s,b.id),radius=Math.sqrt(4.5**2-(terrainHeight(o.x,o.z,s.seed)+1-c.y)**2)-1.1-.2,points=[];for(const r of [radius,radius/2])for(let i=0;i<16;i++)points.push({x:o.x+r*Math.cos(i*Math.PI/8),z:o.z+r*Math.sin(i*Math.PI/8)});points.sort((a,bp)=>distance(a,b.position)-distance(bp,b.position));
 for(const point of points){check();const endpoint=certify177(g,point,point,{endpoint:true});if(!endpoint.clear)continue;const worst3D=Math.hypot(distance(point,o)+1.1,endpoint.terrain.height+1-c.y);if(worst3D>=4.5)continue;const path=plan177(g,b.position,point,check);if(path)return {point,path,endpoint,worst3D,peerFutureArrival:0,hostParkedAt:h.position,tick:s.tick,publication:s.publication};}return {point:null,rejection:'NO_COMPLETE_ACTIVE_GUEST_EXTRACTION_REGION'};
}

