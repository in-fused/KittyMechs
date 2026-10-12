import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';

/** CPU-only extraction of the shipping static triangles. No hulls, wall fills,
 * roof raises, texture changes or render-asset writes are permitted here. */
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles={factory:'public/assets/models/Factory_Workshop.glb',stock:'public/assets/models/SM_RainWorkshop.glb'} as const;
const rows:Record<string,unknown>={};
const roofs:Record<string,unknown>={};
for(const [key,source] of Object.entries(sourceFiles)){
  const input=await readFile(source),document=await io.readBinary(input);
  const vertices:number[]=[],indices:number[]=[],lookup=new Map<string,number>(),point=new Vector3(),matrix=new Matrix4();
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  let skippedDegenerate=0;const roofTriangles:number[][]=[];
  for(const node of document.getRoot().listNodes()){
    const mesh=node.getMesh();if(!mesh)continue;
    if(node.getSkin())throw new Error(`${source}: collision extraction requires static geometry`);
    matrix.fromArray(node.getWorldMatrix());
    for(const primitive of mesh.listPrimitives()){
      if(primitive.getMode()!==4)throw new Error(`${source}: expected oriented triangles`);
      const position=primitive.getAttribute('POSITION');if(!position)throw new Error(`${source}: missing positions`);
      const local:number[]=[],remap:number[]=[],elements=primitive.getIndices();
      for(let i=0;i<position.getCount();i++){
        position.getElement(i,local);point.fromArray(local).applyMatrix4(matrix);
        const xyz=[Math.fround(point.x),Math.fround(point.y),Math.fround(point.z)];
        if(xyz.some(v=>!Number.isFinite(v)))throw new Error(`${source}: nonfinite world vertex`);
        const signature=xyz.join(','),existing=lookup.get(signature),id=existing??vertices.length/3;
        if(existing===undefined){lookup.set(signature,id);vertices.push(...xyz);xyz.forEach((v,axis)=>{bounds.min[axis]=Math.min(bounds.min[axis],v);bounds.max[axis]=Math.max(bounds.max[axis],v);});}
        remap.push(id);
      }
      const count=elements?.getCount()??position.getCount();if(count%3)throw new Error(`${source}: incomplete triangle`);
      for(let i=0;i<count;i+=3){
        const abc=[0,1,2].map(k=>remap[elements?elements.getScalar(i+k):i+k]);
        if(new Set(abc).size<3){skippedDegenerate++;continue;}
        const [a,b,c]=abc.map(id=>vertices.slice(id*3,id*3+3));
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
        const normal=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx],length=Math.hypot(...normal);
        if(length<1e-12){skippedDegenerate++;continue;}
        indices.push(...abc);
        if(normal[1]/length>.95&&Math.min(a[1],b[1],c[1])>11.99)roofTriangles.push([...a,...b,...c]);
      }
    }
  }
  const positions=Buffer.alloc(vertices.length*4),faces=Buffer.alloc(indices.length*4);
  vertices.forEach((v,i)=>positions.writeFloatLE(v,i*4));indices.forEach((v,i)=>faces.writeUInt32LE(v,i*4));
  rows[key]={source,sourceSha256:sha(input),vertexCount:vertices.length/3,triangleCount:indices.length/3,skippedDegenerate,bounds,
    positionsSha256:sha(positions),indicesSha256:sha(faces),positionsLE:positions.toString('base64'),indicesLE:faces.toString('base64')};
  roofs[key]={sourceSha256:sha(input),triangles:roofTriangles,maxY:Math.max(...roofTriangles.flatMap(t=>[t[1],t[4],t[7]]))};
}
const output='shared/data/workshopCollision.json';
await writeFile(output,JSON.stringify({version:1,method:'Exact decoded shipping static triangles, Float32 world positions, identical oriented indices; only zero-area triangles omitted.',meshes:rows})+'\n');
await writeFile('shared/data/workshopRoofPatches.json',JSON.stringify({version:1,method:'Exact upward shipping triangles at roof level; no analytic surface fills.',meshes:roofs})+'\n');
for(const [key,row] of Object.entries(rows)){const {positionsLE,indicesLE,...receipt}=row as Record<string,unknown>;console.log(JSON.stringify({key,...receipt,encodedBytes:String(positionsLE).length+String(indicesLE).length}));}
