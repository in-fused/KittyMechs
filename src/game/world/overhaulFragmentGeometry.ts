import {BufferGeometry,Float32BufferAttribute,ShapeUtils,Vector2} from 'three';
type Vertex=Record<string,number[]>;
const EPS=1e-7;
/** Load-time source-triangle clipping. Attributes interpolate; actual cut
 * contours, rather than a rectangular cover, close each material primitive. */
export function clipOverhaulFragment(source:BufferGeometry,offset:readonly number[]):BufferGeometry {
 const names=Object.keys(source.attributes).filter(n=>n!=='tangent'),position=source.getAttribute('position');
 if(!position||!source.getAttribute('normal'))throw Error('Fracture source lacks position/normal');
 const read=(i:number):Vertex=>Object.fromEntries(names.map(n=>{const a=source.getAttribute(n);return[n,Array.from({length:a.itemSize},(_,j)=>a.getComponent(i,j))];}));
 let triangles:Vertex[][]=[];
 for(let i=0;i<(source.index?.count??position.count);i+=3)triangles.push([0,1,2].map(j=>read(source.index?.getX(i+j)??i+j)));
 for(const axis of [0,1]){
  const sign=offset[axis]>0?1:-1,segments:[Vertex,Vertex][]=[];const next:Vertex[][]=[];
  for(const tri of triangles){const polygon:Vertex[]=[];
   for(let i=0;i<tri.length;i++){const a=tri[i],b=tri[(i+1)%tri.length],da=a.position[axis]*sign,db=b.position[axis]*sign,inside=da>=-EPS;
    if(inside)polygon.push(a);
    if((da>EPS&&db< -EPS)||(da< -EPS&&db>EPS)){const t=da/(da-db);polygon.push(Object.fromEntries(names.map(n=>[n,a[n].map((v,j)=>v+(b[n][j]-v)*t)])));}
   }
   if(polygon.length<3)continue;
   const cut=polygon.filter(v=>Math.abs(v.position[axis])<=EPS);
   if(cut.length===2&&cut.some((v,i)=>v.position.some((x,j)=>Math.abs(x-cut[1-i].position[j])>EPS)))segments.push([cut[0],cut[1]]);
   for(let i=1;i<polygon.length-1;i++)next.push([polygon[0],polygon[i],polygon[i+1]]);
  }
  const key=(v:Vertex)=>v.position.map(x=>Math.round(x/EPS)).join(','),unused=new Set(segments.map((_,i)=>i));
  while(unused.size){const first=unused.values().next().value!;unused.delete(first);const contour=[segments[first][0],segments[first][1]],start=key(contour[0]);let closed=key(contour[1])===start;
   while(!closed){const tail=key(contour[contour.length-1]);let found=-1,vertex:Vertex|undefined;
    for(const i of unused){const [a,b]=segments[i];if(key(a)===tail){found=i;vertex=b;break;}if(key(b)===tail){found=i;vertex=a;break;}}
    if(found<0)break;unused.delete(found);closed=key(vertex!)===start;if(!closed)contour.push(vertex!);
   }
   // Open decorative surfaces have no enclosed cut volume to cap.
   if(!closed||contour.length<3)continue;
   const uvAxes=axis===0?[1,2]:[2,0],points=contour.map(v=>new Vector2(v.position[uvAxes[0]],v.position[uvAxes[1]]));
   const cap=contour.map(v=>{const out=Object.fromEntries(names.map(n=>[n,[...v[n]]])) as Vertex;out.normal=[0,0,0];out.normal[axis]=-sign;return out;});
   for(const indices of ShapeUtils.triangulateShape(points,[])){
    const vertices=indices.map(i=>cap[i]),[a,b,c]=vertices.map(v=>v.position),u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(normal[axis]*(-sign)<0)vertices.reverse();next.push(vertices);
   }
  }
  triangles=next;
 }
 const geometry=new BufferGeometry();for(const name of names){const values=triangles.flatMap(tri=>tri.flatMap(v=>name==='position'?v.position.map((x,j)=>x-offset[j]):v[name]));geometry.setAttribute(name,new Float32BufferAttribute(values,source.getAttribute(name).itemSize));}
 if(source.index)geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
