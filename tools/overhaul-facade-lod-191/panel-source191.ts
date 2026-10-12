import {BufferGeometry,Box3,Vector3} from 'three';
/** Author distant microdetail from its actual source cap triangles. Exact
 * position welding identifies closed authored components; attributes are
 * never welded, reinterpolated, or resampled. Uncertain parts remain whole. */
export function panelIndices191(g:BufferGeometry,maxWorldScale:number){
 const p=g.getAttribute('position'),source=Array.from(g.index!.array,Number),triangles=source.length/3,parent=Array.from({length:triangles},(_,i)=>i),vertexOwner=new Map<string,number>();
 const root=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let t=0;t<triangles;t++)for(let j=0;j<3;j++){const v=source[t*3+j],key=[p.getX(v),p.getY(v),p.getZ(v)].join(','),other=vertexOwner.get(key);if(other===undefined)vertexOwner.set(key,t);else parent[root(t)]=root(other);}
 const parts=new Map<number,number[]>();for(let t=0;t<triangles;t++){const key=root(t),list=parts.get(key)??[];list.push(t);parts.set(key,list);}
 const removed=new Set<number>(),records:{triangles:number;retained:number;worldThickness:number;worldSpan:number;axis:number}[]=[];
 for(const ts of parts.values()){
  const box=new Box3();for(const t of ts)for(let j=0;j<3;j++){const v=source[t*3+j];box.expandByPoint(new Vector3(p.getX(v),p.getY(v),p.getZ(v)));}
  const dims=box.getSize(new Vector3()).toArray(),axis=dims.indexOf(Math.min(...dims)),thickness=dims[axis]*maxWorldScale,span=Math.max(...dims)*maxWorldScale;
  // Major profiles/long trim and zero-thickness open faces remain original.
  if(!Number.isFinite(thickness)||thickness<=0||thickness>.08||span>1.2)continue;
  const cap:number[]=[],edges=new Map<string,number>();let low=false,high=false,axisAligned=true;
  for(const t of ts){const vs=source.slice(t*3,t*3+3),xyz=vs.map(v=>[p.getX(v),p.getY(v),p.getZ(v)]),plane=xyz[0][axis];
   if(xyz.every(v=>v[axis]===plane)&&(plane===box.min.getComponent(axis)||plane===box.max.getComponent(axis))){cap.push(t);low ||= plane===box.min.getComponent(axis);high ||= plane===box.max.getComponent(axis);}
   // Every source face must be planar and axis-aligned; curved/nonplanar
   // profiles are retained, rather than interpreted as removable side strips.
   if(![0,1,2].some(a=>xyz.every(v=>v[a]===xyz[0][a])))axisAligned=false;
   for(let j=0;j<3;j++){const a=xyz[j].join(','),b=xyz[(j+1)%3].join(','),key=a<b?a+'|'+b:b+'|'+a;edges.set(key,(edges.get(key)??0)+1);}
  }
  if(!low||!high||!axisAligned||cap.length===ts.length||[...edges.values()].some(n=>n!==2))continue;
  const caps=new Set(cap);for(const t of ts)if(!caps.has(t))removed.add(t);records.push({triangles:ts.length,retained:cap.length,worldThickness:thickness,worldSpan:span,axis});
 }
 const indices=source.filter((_,i)=>!removed.has(Math.floor(i/3)));return {indices,records};
}
