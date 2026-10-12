import {cityDistrict,type CityStreet} from './cityDistrict';
import type {Vec3} from './types';

const key=(p:Vec3)=>`${p.x.toFixed(4)},${p.z.toFixed(4)}`;
const distance=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p:Vec3,s:CityStreet)=>p.x>=Math.min(...s.points.map(v=>v.x))-.001&&p.x<=Math.max(...s.points.map(v=>v.x))+.001&&p.z>=Math.min(...s.points.map(v=>v.z))-.001&&p.z<=Math.max(...s.points.map(v=>v.z))+.001;
export interface CityStreetTrace {nodes:number;edges:number;samples:number;}
/** A bounded road graph connects districts without widening the local grid's
 * 1,800-cell search. Every edge is checked against the current solid filter. */
export function cityStreetRoute(seed:number,from:Vec3,to:Vec3,clear:(p:Vec3)=>boolean,trace?:CityStreetTrace):Vec3[]|null{
  const district=cityDistrict(seed);if(!district)return null;
  const {grading,streets}=district;
  if(to.x<grading.minX||to.x>grading.maxX||to.z<grading.minZ||to.z>grading.maxZ)return null;
  const closest=(p:Vec3)=>{
    let best:{street:CityStreet;point:Vec3}|null=null,cost=Infinity;
    for(const street of streets){const [a,b]=street.points,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz))),point={x:a.x+dx*t,y:grading.height+1,z:a.z+dz*t},d=distance(p,point);if(d<cost&&clear(point)){cost=d;best={street,point};}}
    return best;
  };
  const entry=closest(from),exit=closest(to);if(!entry||!exit)return null;
  const points=new Map<string,Vec3>(),roads=new Map<CityStreet,Vec3[]>();
  const add=(street:CityStreet,p:Vec3)=>{const id=key(p),point=points.get(id)??{...p,y:grading.height+1};points.set(id,point);const list=roads.get(street)!;if(!list.some(q=>key(q)===id))list.push(point);};
  for(const street of streets){roads.set(street,[]);for(const point of street.points)add(street,point);}
  add(entry.street,entry.point);add(exit.street,exit.point);
  for(let i=0;i<streets.length;i++)for(let j=i+1;j<streets.length;j++){
    const a=streets[i],b=streets[j],ax=a.points[0].x===a.points[1].x,bx=b.points[0].x===b.points[1].x;
    if(ax===bx){for(const point of [...a.points,...b.points])if(inside(point,a)&&inside(point,b)){add(a,point);add(b,point);}continue;}
    const p={x:(ax?a:b).points[0].x,y:grading.height+1,z:(ax?b:a).points[0].z};if(inside(p,a)&&inside(p,b)){add(a,p);add(b,p);}
  }
  if(trace)trace.nodes=points.size;if(points.size>128)return null;
  const edges=new Map<string,{id:string;cost:number}[]>();for(const id of points.keys())edges.set(id,[]);
  for(const [street,list] of roads){
    list.sort((a,b)=>street.points[0].x===street.points[1].x?a.z-b.z:a.x-b.x);
    for(let i=1;i<list.length;i++){
      const a=list[i-1],b=list[i],length=distance(a,b),steps=Math.max(1,Math.ceil(length/1.5));let valid=true;
      for(let n=0;n<=steps;n++){if(trace)trace.samples++;const t=n/steps;if(!clear({x:a.x+(b.x-a.x)*t,y:grading.height+1,z:a.z+(b.z-a.z)*t})){valid=false;break;}}
      if(valid){if(trace)trace.edges++;edges.get(key(a))!.push({id:key(b),cost:length});edges.get(key(b))!.push({id:key(a),cost:length});}
    }
  }
  const start=key(entry.point),end=key(exit.point),costs=new Map([[start,0]]),parents=new Map<string,string>(),open=new Set([start]),visited=new Set<string>();
  for(let step=0;open.size&&step<128;step++){
    const current=[...open].sort((a,b)=>costs.get(a)!-costs.get(b)!)[0];open.delete(current);if(current===end)break;visited.add(current);
    for(const edge of edges.get(current)!){if(visited.has(edge.id))continue;const cost=costs.get(current)!+edge.cost;if(cost<(costs.get(edge.id)??Infinity)){costs.set(edge.id,cost);parents.set(edge.id,current);open.add(edge.id);}}
  }
  if(!costs.has(end))return null;
  const ids=[end];for(let id=end;id!==start;){const parent=parents.get(id);if(!parent)return null;ids.unshift(parent);id=parent;}
  const path:Vec3[]=[{...points.get(start)!}];
  for(let i=1;i<ids.length;i++){const a=points.get(ids[i-1])!,b=points.get(ids[i])!,steps=Math.max(1,Math.ceil(distance(a,b)/3));for(let n=1;n<=steps;n++){const t=n/steps;path.push({x:a.x+(b.x-a.x)*t,y:grading.height+1,z:a.z+(b.z-a.z)*t});}}
  return path;
}
