import {lampNavigationBlocked279} from './lampNavigation279';
import {cityBlocks,type CityBlock} from './cityDistrict';
import {cityStreetRoute,type CityStreetTrace} from './cityNavigation';
import { WORLD_LIMIT } from './config';
import { generateChunk, landmarkBlocks, propCollider, terrainHeight, type LandmarkBlock, type PropDescriptor } from './world';
import type { Vec3 } from './types';
import { traversalBlocks } from './traversal';
import {structuralPropNavigationBlocked} from './structuralPropNavigation';

const CELL=3, CLEARANCE=2.3, MAX_SEARCH=1800;
const CITY_BUCKET=24;
type Cell={x:number;z:number};
const key=(p:Cell)=>`${p.x},${p.z}`;
type OpenCell={cell:Cell;id:string;score:number;order:number;index:number};
/** Original array ties choose the earliest still-open insertion. Cost updates
 * affect every duplicate of a cell, so one indexed entry retains that earliest
 * order while decreasing its score. Closed duplicates never expand a cell. */
export class NavigationOpenSet {
  private heap:OpenCell[]=[];
  private entries=new Map<string,OpenCell>();
  private sequence=0;
  constructor(private trace?:NavigationGridTrace){}
  get size(){return this.heap.length;}
  private less(a:OpenCell,b:OpenCell){if(this.trace)this.trace.comparisons++;return a.score<b.score||(a.score===b.score&&a.order<b.order);}
  private swap(a:number,b:number){const value=this.heap[a];this.heap[a]=this.heap[b];this.heap[b]=value;this.heap[a].index=a;this.heap[b].index=b;}
  private rise(index:number){while(index>0){const parent=(index-1)>>1;if(!this.less(this.heap[index],this.heap[parent]))break;this.swap(index,parent);index=parent;}}
  offer(cell:Cell,score:number){
    const id=key(cell),existing=this.entries.get(id);
    if(existing){existing.score=score;this.rise(existing.index);return;}
    const entry:OpenCell={cell,id,score,order:this.sequence++,index:this.heap.length};this.entries.set(id,entry);this.heap.push(entry);this.rise(entry.index);
  }
  take():Cell {
    const first=this.heap[0],last=this.heap.pop()!;this.entries.delete(first.id);
    if(this.heap.length){this.heap[0]=last;last.index=0;let index=0;for(;;){let next=index;const left=index*2+1,right=left+1;if(left<this.heap.length&&this.less(this.heap[left],this.heap[next]))next=left;if(right<this.heap.length&&this.less(this.heap[right],this.heap[next]))next=right;if(next===index)break;this.swap(index,next);index=next;}}
    return first.cell;
  }
}
export function indexNavigationCityBlocks(blocks:readonly CityBlock[]):Map<string,CityBlock[]>{
  const index=new Map<string,CityBlock[]>();
  for(const block of blocks){
    const c=Math.abs(Math.cos(block.yaw)),s=Math.abs(Math.sin(block.yaw)),hx=block.halfExtents[0]+CLEARANCE,hz=block.halfExtents[2]+CLEARANCE,dx=c*hx+s*hz,dz=s*hx+c*hz;
    for(let x=Math.floor((block.position[0]-dx)/CITY_BUCKET);x<=Math.floor((block.position[0]+dx)/CITY_BUCKET);x++)for(let z=Math.floor((block.position[2]-dz)/CITY_BUCKET);z<=Math.floor((block.position[2]+dz)/CITY_BUCKET);z++){
      const id=`${x},${z}`,list=index.get(id);if(list)list.push(block);else index.set(id,[block]);
    }
  }
  return index;
}
export interface NavigationGridTrace {durationMs:number;cacheHit:boolean;explored:number;openMax:number;comparisons:number;pushes:number;duplicates:number;result:number;}
export interface NavigationPathTrace {from:Vec3;to:Vec3;durationMs:number;result:number;freeHits:number;freeMisses:number;pointCalls:number;grids:NavigationGridTrace[];street:CityStreetTrace&{durationMs:number;result:number};}

/** Bounded, lazy navigation grid. The same seeded static geometry drives physics and routes. */
export class Navigation {
  onPathTiming:((trace:NavigationPathTrace)=>void)|undefined;
  private trace:NavigationPathTrace|undefined;
  private gridTrace:NavigationGridTrace|undefined;
  private occupancy=new Map<string,boolean>();
  private props=new Map<string,PropDescriptor[]>();
  private paths=new Map<string,Vec3[]>();
  private cityIndex=new Map<string,CityBlock[]>();
  private streetRuins:readonly CityBlock[]=[];
  private streetRuinSignature='';
  private landmarks:LandmarkBlock[];
  private blockActive:(block:CityBlock)=>boolean=()=>true;
  private propActive:(prop:PropDescriptor)=>boolean=()=>true;
  constructor(private seed:number) {
    this.landmarks=[...landmarkBlocks(seed),...traversalBlocks(seed)];
    // Index immutable authored geometry only. Expanded rotated bounds prune
    // impossible candidates; the unchanged exact vertical/local-box predicate
    // and current damage filter still decide occupancy for each cold cell.
    this.cityIndex=indexNavigationCityBlocks(cityBlocks(seed));
  }
  /** Changing match geometry invalidates both occupied cells and previously cached detours. */
  setPropFilter(filter:(prop:PropDescriptor)=>boolean) {this.propActive=filter;this.occupancy.clear();this.paths.clear();}
  setStructureFilter(filter:(block:CityBlock)=>boolean) {this.blockActive=filter;this.occupancy.clear();this.paths.clear();}
  /** Ten admitted street wrecks follow their actual authoritative poses. */
  setRainlineStreetRuins(blocks:readonly CityBlock[]) {const signature=blocks.map(b=>b.id+':'+b.position.join(',')+':'+b.halfExtents.join(',')).join('|');if(signature===this.streetRuinSignature)return;this.streetRuinSignature=signature;this.streetRuins=blocks;this.occupancy.clear();this.paths.clear();}
  private point(p:Cell):Vec3 {if(this.trace)this.trace.pointCalls++;const x=p.x*CELL,z=p.z*CELL;return {x,y:terrainHeight(x,z,this.seed)+1,z};}
  private cell(p:Vec3):Cell {return {x:Math.round(p.x/CELL),z:Math.round(p.z/CELL)};}
  walkable(p:Vec3):boolean {return this.free(this.cell(p));}
  private free(p:Cell):boolean {
    const id=key(p),cached=this.occupancy.get(id);if(cached!==undefined){if(this.trace)this.trace.freeHits++;return cached;}if(this.trace)this.trace.freeMisses++;
    const at=this.point(p);let free=Math.abs(at.x)<WORLD_LIMIT-3&&Math.abs(at.z)<WORLD_LIMIT-3;
    for(let cx=Math.floor((at.x-18)/64);free&&cx<=Math.floor((at.x+18)/64);cx++) for(let cz=Math.floor((at.z-18)/64);free&&cz<=Math.floor((at.z+18)/64);cz++) {
      const chunk=`${cx},${cz}`;let props=this.props.get(chunk);
      if(!props){props=generateChunk(this.seed,cx,cz).props;this.props.set(chunk,props);}
      for(const prop of props) {
        if(!this.propActive(prop))continue;
        // Newly solid cranes retain their real gaps and overhead clearance.
        // This ground-route band is conservative navigation, not a climb hull.
        if(prop.kind==='crane'){
          if(structuralPropNavigationBlocked('crane',prop,at,{minY:at.y-1,maxY:at.y+2.2},CLEARANCE)){free=false;break;}
          continue;
        }
        if(prop.kind==='lamp'){if(lampNavigationBlocked279(prop,at,at,{minY:at.y-1,maxY:at.y+2.2},CLEARANCE)){free=false;break;}continue;}
        const box=propCollider(prop);if(!box)continue;
        const dx=at.x-prop.x,dz=at.z-prop.z,c=Math.cos(prop.rotation),s=Math.sin(prop.rotation);
        if(Math.abs(dx*c-dz*s)<box[0]+CLEARANCE&&Math.abs(dx*s+dz*c)<box[2]+CLEARANCE){free=false;break;}
      }
    }
    if(free)for(const block of this.landmarks) {
      if(block.position[1]-block.halfExtents[1]>at.y+1||block.position[1]+block.halfExtents[1]<at.y-1)continue;
      const dx=at.x-block.position[0],dz=at.z-block.position[2],c=Math.cos(block.yaw),s=Math.sin(block.yaw);
      if(Math.abs(dx*c-dz*s)<block.halfExtents[0]+CLEARANCE&&Math.abs(dx*s+dz*c)<block.halfExtents[2]+CLEARANCE){free=false;break;}
    }
    if(free)for(const block of this.cityIndex.get(`${Math.floor(at.x/CITY_BUCKET)},${Math.floor(at.z/CITY_BUCKET)}`)??[]) {
      if(!this.blockActive(block)||block.position[1]-block.halfExtents[1]>at.y+1.6||block.position[1]+block.halfExtents[1]<=at.y-.95)continue;
      const dx=at.x-block.position[0],dz=at.z-block.position[2],c=Math.cos(block.yaw),s=Math.sin(block.yaw);
      if(Math.abs(dx*c-dz*s)<block.halfExtents[0]+CLEARANCE&&Math.abs(dx*s+dz*c)<block.halfExtents[2]+CLEARANCE){free=false;break;}
    }
    if(free)for(const block of this.streetRuins){
      if(block.position[1]-block.halfExtents[1]>at.y+1.6||block.position[1]+block.halfExtents[1]<=at.y-.95)continue;
      if(Math.abs(at.x-block.position[0])<block.halfExtents[0]+CLEARANCE&&Math.abs(at.z-block.position[2])<block.halfExtents[2]+CLEARANCE){free=false;break;}
    }
    if(free) for(const [dx,dz] of [[CELL,0],[-CELL,0],[0,CELL],[0,-CELL]]) {
      if(Math.abs(terrainHeight(at.x+dx,at.z+dz,this.seed)-(at.y-1))>CELL*.58){free=false;break;}
    }
    this.occupancy.set(id,free);return free;
  }
  private lampSegmentFree279(a:Vec3,b:Vec3):boolean {
    const band={minY:Math.min(a.y,b.y)-1,maxY:Math.max(a.y,b.y)+2.2};
    for(let x=Math.floor((Math.min(a.x,b.x)-18)/64);x<=Math.floor((Math.max(a.x,b.x)+18)/64);x++)for(let z=Math.floor((Math.min(a.z,b.z)-18)/64);z<=Math.floor((Math.max(a.z,b.z)+18)/64);z++){
      const id=x+','+z;let props=this.props.get(id);if(!props){props=generateChunk(this.seed,x,z).props;this.props.set(id,props);}
      for(const prop of props)if(prop.kind==='lamp'&&this.propActive(prop)&&lampNavigationBlocked279(prop,a,b,band,CLEARANCE))return false;
    }return true;
  }
  private nearest(p:Cell):Cell|undefined {
    if(this.free(p))return p;
    for(let radius=1;radius<=5;radius++) for(let x=-radius;x<=radius;x++) for(let z=-radius;z<=radius;z++) {
      if(Math.abs(x)!==radius&&Math.abs(z)!==radius)continue;
      const candidate={x:p.x+x,z:p.z+z};if(this.free(candidate))return candidate;
    }
  }
  path(from:Vec3,to:Vec3):Vec3[] {
    if(!this.onPathTiming)return this.findPath(from,to);
    const at=performance.now(),observer=this.onPathTiming,prior=this.trace,trace:NavigationPathTrace={from:{...from},to:{...to},durationMs:0,result:0,freeHits:0,freeMisses:0,pointCalls:0,grids:[],street:{nodes:0,edges:0,samples:0,durationMs:0,result:0}};this.trace=trace;
    try{const path=this.findPath(from,to);trace.result=path.length;return path;}finally{trace.durationMs=performance.now()-at;this.trace=prior;observer(trace);}
  }
  private findPath(from:Vec3,to:Vec3):Vec3[] {
    const direct=this.gridPath(from,to);if(direct.length)return direct;
    const at=this.trace?performance.now():0,street=cityStreetRoute(this.seed,from,to,p=>this.walkable(p),this.trace?.street);if(this.trace){this.trace.street.durationMs=performance.now()-at;this.trace.street.result=street?.length??0;}if(!street?.length)return [];
    const first=this.gridPath(from,street[0]),last=this.gridPath(street.at(-1)!,to);
    if(!first.length&&Math.hypot(from.x-street[0].x,from.z-street[0].z)>4)return [];
    const arrived=last.at(-1)??street.at(-1)!;
    if(Math.hypot(arrived.x-to.x,arrived.z-to.z)>4.5)return [];
    const route=[...first,...street,...last];let prior=from;for(const next of route){if(!this.lampSegmentFree279(prior,next))return [];prior=next;}return route;
  }
  private gridPath(from:Vec3,to:Vec3):Vec3[] {
    if(!this.trace)return this.searchGrid(from,to);
    const at=performance.now(),prior=this.gridTrace,trace:NavigationGridTrace={durationMs:0,cacheHit:false,explored:0,openMax:1,comparisons:0,pushes:0,duplicates:0,result:0};this.trace.grids.push(trace);this.gridTrace=trace;
    try{const path=this.searchGrid(from,to);trace.result=path.length;return path;}finally{trace.durationMs=performance.now()-at;this.gridTrace=prior;}
  }
  private searchGrid(from:Vec3,to:Vec3):Vec3[] {
    const start=this.nearest(this.cell(from)),end=this.nearest(this.cell(to));if(!start||!end)return [];
    const cacheKey=`${key(start)}>${key(end)}`,cached=this.paths.get(cacheKey);if(cached){if(this.gridTrace)this.gridTrace.cacheHit=true;return cached.map(p=>({...p}));}
    const heuristic=(p:Cell)=>Math.hypot(end.x-p.x,end.z-p.z);
    const open=new NavigationOpenSet(this.gridTrace),cost=new Map([[key(start),0]]),parent=new Map<string,Cell>(),closed=new Set<string>();open.offer(start,heuristic(start));
    let found=false;
    for(let explored=0;open.size&&explored<MAX_SEARCH;explored++) {
      if(this.gridTrace){this.gridTrace.openMax=Math.max(this.gridTrace.openMax,open.size);this.gridTrace.explored=explored+1;}
      const current=open.take(),id=key(current);closed.add(id);
      if(id===key(end)){found=true;break;}
      for(const dx of [-1,0,1]) for(const dz of [-1,0,1]) {
        if(!dx&&!dz)continue;const next={x:current.x+dx,z:current.z+dz},nid=key(next);
        if(closed.has(nid)||!this.free(next)||!this.free({x:current.x+dx,z:current.z})||!this.free({x:current.x,z:current.z+dz}))continue;
        if(Math.abs(this.point(next).y-this.point(current).y)>Math.hypot(dx,dz)*CELL*.58)continue;
        if(!this.lampSegmentFree279(this.point(current),this.point(next)))continue;
        const value=cost.get(id)!+Math.hypot(dx,dz);if(value>=(cost.get(nid)??Infinity))continue;
        parent.set(nid,current);cost.set(nid,value);open.offer(next,value+heuristic(next));if(this.gridTrace)this.gridTrace.pushes++;
      }
    }
    const path:Vec3[]=[];
    if(found){let p=end;while(key(p)!==key(start)){path.unshift(this.point(p));p=parent.get(key(p))!;}}
    if(this.paths.size>=128)this.paths.delete(this.paths.keys().next().value!);
    this.paths.set(cacheKey,path);return path.map(p=>({...p}));
  }
  clear(){this.occupancy.clear();this.props.clear();this.paths.clear();}
}
