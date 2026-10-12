import source from '../../shared/data/rainlineLampMeshCollision001.json';
export type LampPlacement279={kind:string;x:number;y:number;z:number;rotation:number;scale:number};
export type LampBand279={minY:number;maxY:number};
type Point={x:number;z:number};type V={x:number;y:number;z:number};
type Polygon={points:V[];minX:number;maxX:number;minZ:number;maxZ:number};
type Compiled={signature:number[];polygons:Polygon[];minX:number;maxX:number;minZ:number;maxZ:number};
const cache=new WeakMap<object,Compiled>();
function clip(p:V[],height:number,above:boolean){const out:V[]=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ia=above?a.y>=height:a.y<=height,ib=above?b.y>=height:b.y<=height;if(ia)out.push(a);if(ia!==ib){const t=(height-a.y)/(b.y-a.y);out.push({x:a.x+(b.x-a.x)*t,y:height,z:a.z+(b.z-a.z)*t});}}return out;}
function compile(prop:LampPlacement279,band:LampBand279):Compiled{
 const signature=[prop.x,prop.y,prop.z,prop.rotation,prop.scale,band.minY,band.maxY],old=cache.get(prop);if(old&&signature.every((v,i)=>v===old.signature[i]))return old;
 // Identical retained native vertex scaling: ColliderDesc receives Float32Array.
 const vertices=Float32Array.from(source.vertices,n=>n*prop.scale),c=Math.cos(prop.rotation),s=Math.sin(prop.rotation),world:V[]=[];
 for(let i=0;i<vertices.length;i+=3){const x=vertices[i],z=vertices[i+2];world.push({x:prop.x+x*c+z*s,y:prop.y+vertices[i+1],z:prop.z-x*s+z*c});}
 const polygons:Polygon[]=[];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<source.indices.length;i+=3){let p=[world[source.indices[i]],world[source.indices[i+1]],world[source.indices[i+2]]];p=clip(p,band.minY,true);p=clip(p,band.maxY,false);if(!p.length)continue;const polygon={points:p,minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minZ:Math.min(...p.map(v=>v.z)),maxZ:Math.max(...p.map(v=>v.z))};polygons.push(polygon);minX=Math.min(minX,polygon.minX);maxX=Math.max(maxX,polygon.maxX);minZ=Math.min(minZ,polygon.minZ);maxZ=Math.max(maxZ,polygon.maxZ);}
 const value={signature,polygons,minX,maxX,minZ,maxZ};cache.set(prop,value);return value;
}
function pointSegmentSquared(p:Point,a:Point,b:Point){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;return (p.x-a.x-t*dx)**2+(p.z-a.z-t*dz)**2;}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function intersects(a:Point,b:Point,c:Point,d:Point){const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),x=cross(c,d,b);if(u===0&&pointSegmentSquared(c,a,b)===0||v===0&&pointSegmentSquared(d,a,b)===0||w===0&&pointSegmentSquared(a,c,d)===0||x===0&&pointSegmentSquared(b,c,d)===0)return true;return (u>0)!==(v>0)&&(w>0)!==(x>0);}
function inside(p:Point,poly:V[]){let value=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)value=!value;}return value;}
function polygonDistanceSquared(poly:V[],a:Point,b:Point){if(inside(a,poly)||inside(b,poly))return 0;let min=Infinity;for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length];if(intersects(a,b,c,d))return 0;min=Math.min(min,pointSegmentSquared(c,a,b),pointSegmentSquared(d,a,b),pointSegmentSquared(a,c,d),pointSegmentSquared(b,c,d));}return min;}
/** Continuous horizontal cylinder segment/arrival-region query against the
 * vertically clipped retained triangle union. AABBs only prune; no whole-lamp
 * box, point sampling, native collision changes or altered clearance. */
export function lampNavigationBlocked279(prop:LampPlacement279,a:Point,b:Point,band:LampBand279,clearance:number,stats?:{clippedTriangles:number;testedTriangles:number}):boolean{
 if(stats){stats.clippedTriangles=stats.testedTriangles=0;}if(prop.kind!=='lamp')return false;
 if(![prop.x,prop.y,prop.z,prop.rotation,prop.scale,a.x,a.z,b.x,b.z,band.minY,band.maxY,clearance].every(Number.isFinite)||prop.scale<=0||clearance<0||band.maxY<band.minY)throw Error('279_INVALID_LAMP_NAVIGATION_QUERY');
 const mesh=compile(prop,band);if(stats)stats.clippedTriangles=mesh.polygons.length;
 const minX=Math.min(a.x,b.x)-clearance,maxX=Math.max(a.x,b.x)+clearance,minZ=Math.min(a.z,b.z)-clearance,maxZ=Math.max(a.z,b.z)+clearance;
 if(mesh.maxX<minX||mesh.minX>maxX||mesh.maxZ<minZ||mesh.minZ>maxZ)return false;
 for(const p of mesh.polygons){if(p.maxX<minX||p.minX>maxX||p.maxZ<minZ||p.minZ>maxZ)continue;if(stats)stats.testedTriangles++;if(polygonDistanceSquared(p.points,a,b)<=clearance*clearance)return true;}return false;
}
