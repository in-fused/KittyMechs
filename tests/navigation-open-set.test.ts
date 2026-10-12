import {describe,expect,it} from 'vitest';
import {Navigation,NavigationOpenSet} from '../shared/navigation';
import {cityDistrict,cityBlockActive} from '../shared/cityDistrict';
import type {Vec3,StructureState} from '../shared/types';
type Cell={x:number;z:number};
const key=(p:Cell)=>`${p.x},${p.z}`;
type GridAccess={cell:(p:Vec3)=>Cell;nearest:(p:Cell)=>Cell|undefined;free:(p:Cell)=>boolean;point:(p:Cell)=>Vec3;searchGrid:(from:Vec3,to:Vec3)=>Vec3[]};
// The prior minimum-scan algorithm is an independent ordering oracle. It keeps
// duplicate entries and reads their current cost, exactly as the shipped array.
function referenceGrid(this:GridAccess,from:Vec3,to:Vec3):Vec3[]{
 const start=this.nearest(this.cell(from)),end=this.nearest(this.cell(to));if(!start||!end)return [];
 const open=[start],cost=new Map([[key(start),0]]),parent=new Map<string,Cell>(),closed=new Set<string>(),heuristic=(p:Cell)=>Math.hypot(end.x-p.x,end.z-p.z);let found=false;
 for(let explored=0;open.length&&explored<1800;explored++){
  let best=0;for(let i=1;i<open.length;i++)if(cost.get(key(open[i]))!+heuristic(open[i])<cost.get(key(open[best]))!+heuristic(open[best]))best=i;
  const current=open.splice(best,1)[0],id=key(current);if(closed.has(id)){explored--;continue;}closed.add(id);if(id===key(end)){found=true;break;}
  for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
   if(!dx&&!dz)continue;const next={x:current.x+dx,z:current.z+dz},nid=key(next);
   if(closed.has(nid)||!this.free(next)||!this.free({x:current.x+dx,z:current.z})||!this.free({x:current.x,z:current.z+dz}))continue;
   if(Math.abs(this.point(next).y-this.point(current).y)>Math.hypot(dx,dz)*3*.58)continue;
   const value=cost.get(id)!+Math.hypot(dx,dz);if(value>=(cost.get(nid)??Infinity))continue;parent.set(nid,current);cost.set(nid,value);open.push(next);
  }
 }
 const path:Vec3[]=[];if(found){let p=end;while(key(p)!==key(start)){path.unshift(this.point(p));p=parent.get(key(p))!;}}return path;
}
describe('stable navigation open-set ordering',()=>{
 it('retains earliest insertion across decreases and equal priorities',()=>{
  const queue=new NavigationOpenSet();queue.offer({x:1,z:0},5);queue.offer({x:2,z:0},9);queue.offer({x:3,z:0},5);queue.offer({x:2,z:0},5);
  expect(queue.size).toBe(3);expect([queue.take(),queue.take(),queue.take()]).toEqual([{x:1,z:0},{x:2,z:0},{x:3,z:0}]);
  queue.offer({x:4,z:0},10);queue.offer({x:5,z:0},12);queue.offer({x:5,z:0},1);expect(queue.take()).toEqual({x:5,z:0});expect(queue.take()).toEqual({x:4,z:0});
 });
 it('matches prior exact routes through symmetric ties, revisits and a blocked failure',()=>{
  const obstacles=[(p:Cell)=>p.x===0&&Math.abs(p.z)<=2,(p:Cell)=>Math.abs(p.x)%4===0&&p.z%7!==0,(p:Cell)=>p.x===0];
  for(const blocked of obstacles)for(const [from,to] of [[{x:-9,y:1,z:0},{x:9,y:1,z:0}],[{x:-15,y:1,z:-12},{x:18,y:1,z:15}]]){
   const candidate=new Navigation(7734),reference=new Navigation(7734);
   for(const nav of [candidate,reference]){const grid=nav as unknown as GridAccess;grid.free=p=>Math.abs(p.x)<24&&Math.abs(p.z)<24&&!blocked(p);grid.point=p=>({x:p.x*3,y:1,z:p.z*3});}
   (reference as unknown as GridAccess).searchGrid=referenceGrid;expect(candidate.path(from,to)).toEqual(reference.path(from,to));
  }
 });
 it('matches the prior route after accepted authored facade damage invalidates an earlier failure',()=>{
  const candidate=new Navigation(7734),reference=new Navigation(7734),district=cityDistrict(7734)!,states:StructureState[]=district.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)})),index=states.findIndex(s=>s.id.endsWith('spawn-west:facade-bank')),from={x:-45,y:.92,z:24},to={x:-30,y:.92,z:24},opening={x:-39,y:.92,z:24};
  (reference as unknown as GridAccess).searchGrid=referenceGrid;
  for(const nav of [candidate,reference])nav.setStructureFilter(b=>cityBlockActive(b,states));
  expect(candidate.path(from,to)).toEqual(reference.path(from,to));expect(candidate.path(from,to)).toEqual([]);expect(candidate.walkable(opening)).toBe(false);
  for(const cell of [1,2]){states[index].hp[cell]=0;states[index].brokenMask|=1<<cell;}states[index].revision++;
  for(const nav of [candidate,reference])nav.setStructureFilter(b=>cityBlockActive(b,states));
  const path=candidate.path(from,to);expect(path).toEqual(reference.path(from,to));expect(path).toHaveLength(5);expect(candidate.walkable(opening)).toBe(true);expect(reference.walkable(opening)).toBe(true);
 });
});
