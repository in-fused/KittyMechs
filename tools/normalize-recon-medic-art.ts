/** Private normalization with actual oriented-attribute geometry proof. */
import assert from 'node:assert/strict';
import {NodeIO,type Primitive} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,meshopt,joinPrimitives} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {createHash} from 'node:crypto';
import {access,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
const privateRoot=resolve('.sites-runtime'),source=resolve(process.argv[2]??''),destination=resolve(process.argv[3]??'');
assert.ok(source.startsWith(privateRoot+sep)&&destination.startsWith(privateRoot+sep),'Ignored private normalization only');
assert.equal(dirname(source),dirname(destination),'Retain exact local atlas resolution');
assert.notEqual(source,destination);
for(const p of [destination,destination+'.normalization.json']){try{await access(p);throw Error('Fresh destination already exists: '+p);}catch(e){assert.equal((e as NodeJS.ErrnoException).code,'ENOENT');}}
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const original=await readFile(source),doc=await io.read(source);
await doc.transform(weld(),dedup(),prune());
function streams(primitives:Primitive[]){
  const rows:string[]=[];
  for(const p of primitives){assert.equal(p.getMode(),4);const semantics=p.listSemantics().sort(),indices=p.getIndices();assert.ok(indices);const schema=semantics.map(s=>{const a=p.getAttribute(s)!;return[s,a.getType(),a.getComponentType(),a.getNormalized()];});
    for(let i=0;i<indices.getCount();i+=3){const row=[];for(let j=0;j<3;j++){const v=indices.getScalar(i+j);row.push(semantics.map(s=>p.getAttribute(s)!.getElement(v,[])));}rows.push(JSON.stringify([p.getMaterial()!.getName(),schema,row]));}
  }return rows.sort();
}
let before=0,after=0;const evidence=[];
for(const mesh of doc.getRoot().listMeshes()){
  const old=mesh.listPrimitives();before+=old.length;const proof=streams(old);
  const groups=new Map<object,Primitive[]>();for(const p of old){const mat=p.getMaterial();assert.ok(mat);const list=groups.get(mat)??[];list.push(p);groups.set(mat,list);}
  for(const group of groups.values())if(group.length>1){const joined=joinPrimitives(group);group.forEach(p=>p.dispose());mesh.addPrimitive(joined);}
  const current=mesh.listPrimitives();assert.deepEqual(streams(current),proof,'Consolidation changed oriented position/normal/UV/joints/weights');after+=current.length;
  evidence.push({mesh:mesh.getName(),orientedTriangles:proof.length,streamSha256:createHash('sha256').update(JSON.stringify(proof)).digest('hex')});
}
assert.ok(after<=7);await doc.transform(prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write(destination,doc);
const bytes=await readFile(destination),report={passed:true,source,destination,sourceSha256:createHash('sha256').update(original).digest('hex'),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,primitivesBefore:before,primitivesAfter:after,evidence,method:'Compatible same-material identity primitive concatenation inside retained skinned mesh only; exact oriented triangle attribute arrays before/after join. Admitted medium Meshopt normalization follows. Exact decoded baseline channel/bind/sole/material/UV and posed runtime gates remain separate.'};
await writeFile(destination+'.normalization.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
