import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';

/** Extract shipping triangles only. Node world transforms are baked once;
 * prop uniform scale/yaw/translation remain the responsibility of the caller. */
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const names={cargo:'SM_RainCargoCover',tower:'SM_RainStormTower',pipes:'SM_RainPipeBank',wall:'SM_RainRetainingWall',crane:'SM_RainDockCrane'} as const;
type Bounds={min:number[];max:number[]};
const emptyBounds=():Bounds=>({min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const include=(b:Bounds,p:number[])=>p.forEach((v,i)=>{b.min[i]=Math.min(b.min[i],v);b.max[i]=Math.max(b.max[i],v);});
const rows:Record<string,unknown>={};
for(const [kind,name] of Object.entries(names)){
  const source=`public/assets/models/${name}.glb`,bytes=await readFile(source),document=await io.readBinary(bytes);
  const vertices:number[]=[],indices:number[]=[],lookup=new Map<string,number>(),bounds=emptyBounds(),components=[],patches=[],primitives=[];
  const triangleNormals:number[][]=[],trianglePlanes:number[]=[];let skippedDegenerate=0;
  const point=new Vector3(),matrix=new Matrix4(),nodes=document.getRoot().listNodes();
  for(let ni=0;ni<nodes.length;ni++){
    const node=nodes[ni],mesh=node.getMesh();if(!mesh)continue;
    if(node.getSkin())throw Error(`${source}: expected static mesh`);
    matrix.fromArray(node.getWorldMatrix());if(matrix.determinant()<=0)throw Error(`${source}: reflected/singular node requires explicit winding review`);
    for(const [pi,primitive] of mesh.listPrimitives().entries()){
      if(primitive.getMode()!==4)throw Error(`${source}: expected TRIANGLES`);
      const position=primitive.getAttribute('POSITION');if(!position)throw Error(`${source}: missing positions`);
      const elements=primitive.getIndices(),local:number[]=[],remap:number[]=[],sourceVertices:number[]=[],sourceTriangles:number[]=[],start=indices.length/3;
      for(let i=0;i<position.getCount();i++){
        position.getElement(i,local);point.fromArray(local).applyMatrix4(matrix);
        const xyz=[Math.fround(point.x),Math.fround(point.y),Math.fround(point.z)];if(!xyz.every(Number.isFinite))throw Error(`${source}: invalid world vertex`);
        const key=xyz.join(','),found=lookup.get(key),id=found??vertices.length/3;
        if(found===undefined){lookup.set(key,id);vertices.push(...xyz);include(bounds,xyz);}remap.push(id);
      }
      const count=elements?.getCount()??position.getCount();if(count%3)throw Error(`${source}: incomplete triangles`);
      for(let i=0;i<count;i+=3){
        const abc=[0,1,2].map(k=>remap[elements?elements.getScalar(i+k):i+k]),[a,b,c]=abc.map(id=>vertices.slice(id*3,id*3+3));
        const u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
        if(new Set(abc).size<3||length<1e-12){skippedDegenerate++;continue;}
        sourceVertices.push(...[0,1,2].map(k=>elements?elements.getScalar(i+k):i+k));sourceTriangles.push(i/3);
        indices.push(...abc);const normal=n.map(v=>v/length);triangleNormals.push(normal);trianglePlanes.push(normal.reduce((d,v,j)=>d+v*a[j],0));
      }
      const end=indices.length/3,id=`${kind}:node-${ni}:primitive-${pi}`,edges=new Map<string,number[]>(),adjacency=new Map<number,Set<number>>();
      for(let t=start;t<end;t++)for(let e=0;e<3;e++){
        const a=indices[t*3+e],b=indices[t*3+(e+1)%3],edge=a<b?`${a}:${b}`:`${b}:${a}`,list=edges.get(edge)??[];
        for(const other of list){(adjacency.get(t)??adjacency.set(t,new Set()).get(t)!).add(other);(adjacency.get(other)??adjacency.set(other,new Set()).get(other)!).add(t);}list.push(t);edges.set(edge,list);
      }
      const unseen=new Set(Array.from({length:end-start},(_,i)=>i+start));let ci=0;
      while(unseen.size){
        const first=unseen.values().next().value!,queue=[first],triangles:number[]=[];unseen.delete(first);
        for(let q=0;q<queue.length;q++){const t=queue[q];triangles.push(t);for(const next of adjacency.get(t)??[])if(unseen.delete(next))queue.push(next);}
        const componentId=`${id}:component-${ci++}`,componentBounds=emptyBounds();
        for(const t of triangles)for(let k=0;k<3;k++)include(componentBounds,vertices.slice(indices[t*3+k]*3,indices[t*3+k]*3+3));
        let signedVolume=0;const componentEdges=new Map<string,number>();
        for(const t of triangles){const [a,b,c]=[0,1,2].map(k=>vertices.slice(indices[t*3+k]*3,indices[t*3+k]*3+3));signedVolume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
          for(let e=0;e<3;e++){const u=indices[t*3+e],v=indices[t*3+(e+1)%3],key=u<v?`${u}:${v}`:`${v}:${u}`;componentEdges.set(key,(componentEdges.get(key)??0)+1);}}
        const boundaryEdges=[...componentEdges.values()].filter(n=>n===1).length,nonManifoldEdges=[...componentEdges.values()].filter(n=>n>2).length;
        components.push({id:componentId,primitiveId:id,triangleIds:triangles,bounds:componentBounds,signedVolume,boundaryEdges,nonManifoldEdges,closed:boundaryEdges===0&&nonManifoldEdges===0});
        const pending=new Set(triangles);let patchIndex=0;
        while(pending.size){
          const seed=pending.values().next().value!,normal=triangleNormals[seed],plane=trianglePlanes[seed],patchQueue=[seed],patchTriangles:number[]=[];pending.delete(seed);
          for(let q=0;q<patchQueue.length;q++){const t=patchQueue[q];patchTriangles.push(t);for(const next of adjacency.get(t)??[]){
            if(!pending.has(next))continue;const dot=normal.reduce((sum,v,j)=>sum+v*triangleNormals[next][j],0);
            // Classification groups triangles; exact indices retain their surface
            // truth. These tolerances never fill the projected patch rectangle.
            if(dot>1-1e-7&&Math.abs(trianglePlanes[next]-plane)<1e-5){pending.delete(next);patchQueue.push(next);}
          }}
          const patchBounds=emptyBounds();for(const t of patchTriangles)for(let k=0;k<3;k++)include(patchBounds,vertices.slice(indices[t*3+k]*3,indices[t*3+k]*3+3));
          const patchId=`${componentId}:patch-${patchIndex++}`;
          if(normal[1]>.95||Math.abs(normal[1])<.05)patches.push({id:patchId,componentId,orientation:normal[1]>.95?'up':'wall',normal,plane,triangleIds:patchTriangles,bounds:patchBounds});
        }
      }
      const encode=(values:number[])=>{const buffer=Buffer.alloc(values.length*4);values.forEach((v,i)=>buffer.writeUInt32LE(v,i*4));return buffer.toString('base64');};
      primitives.push({id,nodeIndex:ni,nodeName:node.getName(),meshName:mesh.getName(),primitiveIndex:pi,material:primitive.getMaterial()?.getName()??null,nodeWorldMatrix:matrix.toArray(),sourcePositionCount:position.getCount(),sourceTriangleCount:count/3,triangleStart:start,triangleCount:end-start,
        uvAttributes:primitive.listSemantics().filter(s=>s.startsWith('TEXCOORD_')).map(semantic=>({semantic,count:primitive.getAttribute(semantic)!.getCount()})),sourceVertexIndicesLE:encode(sourceVertices),sourceTriangleIndicesLE:encode(sourceTriangles)});
    }
  }
  const positions=Buffer.alloc(vertices.length*4),faces=Buffer.alloc(indices.length*4);vertices.forEach((v,i)=>positions.writeFloatLE(v,i*4));indices.forEach((v,i)=>faces.writeUInt32LE(v,i*4));
  rows[kind]={source,sourceSha256:sha(bytes),bounds,vertexCount:vertices.length/3,triangleCount:indices.length/3,skippedDegenerate,positionsSha256:sha(positions),indicesSha256:sha(faces),primitives,components,patches,positionsLE:positions.toString('base64'),indicesLE:faces.toString('base64')};
  console.log(JSON.stringify({kind,vertices:vertices.length/3,triangles:indices.length/3,skippedDegenerate,components:components.length,patches:patches.length,wallPatches:patches.filter(p=>p.orientation==='wall').length,upPatches:patches.filter(p=>p.orientation==='up').length,sourceSha256:sha(bytes)}));
}
await writeFile('shared/data/structuralPropCollision.json',JSON.stringify({version:1,method:'Exact shipping static oriented triangle geometry; nodeWorldMatrix baked once to Float32. Zero-area triangles omitted; no hulls, cavity fills or render edits. Components are edge-connected within source primitives, not fracture semantics. Patch bounds classify/query exact triangle unions only.',meshes:rows})+'\n');
