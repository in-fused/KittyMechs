/** Private evidence export; never writes the game's shipping/raw destinations. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, joinPrimitives } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import type { Primitive } from '@gltf-transform/core';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read('assets/source/bastion-art-v2/attempt-003/Bastion_Quadruped.textured-candidate.glb');
await doc.transform(weld(),dedup(),prune());
// Only concatenate compatible primitives inside the same existing skinned
// mesh. No node, bind, local transform or animation track is transformed.
function streams(primitives:Primitive[]):string[] {
  const rows:string[]=[];
  for(const p of primitives){const semantics=p.listSemantics().sort(),indices=p.getIndices()!,schema=semantics.map(s=>{const a=p.getAttribute(s)!;return[s,a.getType(),a.getComponentType(),a.getNormalized()];});
    for(let i=0;i<indices.getCount();i+=3){const row=[];for(let j=0;j<3;j++){const v=indices.getScalar(i+j);row.push(semantics.map(s=>p.getAttribute(s)!.getElement(v,[])));}rows.push(JSON.stringify([p.getMaterial()!.getName(),schema,row]));}
  }return rows.sort();
}
let before=0,after=0;const evidence=[];
for(const mesh of doc.getRoot().listMeshes()){
  const old=mesh.listPrimitives();before+=old.length;const proof=streams(old);
  const groups=new Map<string,Primitive[]>();for(const p of old){const name=p.getMaterial()!.getName();const list=groups.get(name)??[];list.push(p);groups.set(name,list);}
  for(const group of groups.values())if(group.length>1){const joined=joinPrimitives(group);group.forEach(p=>p.dispose());mesh.addPrimitive(joined);}
  const current=mesh.listPrimitives();assert.deepEqual(streams(current),proof,'Joining changed oriented triangle attribute streams');after+=current.length;
  evidence.push({mesh:mesh.getName(),orientedTriangles:proof.length,exactStreamSha256:createHash('sha256').update(JSON.stringify(proof)).digest('hex')});
}
assert.equal(after,4);await doc.transform(prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write('assets/source/bastion-art-v2/attempt-003/Bastion_Quadruped.optimized-candidate.glb',doc);
await writeFile('assets/source/bastion-art-v2/attempt-003/primitive-consolidation-receipt.json',JSON.stringify({passed:true,primitivesBefore:before,primitivesAfter:after,exactOrientedTriangleAttributeStreams:true,evidence,method:'Validated compatible same-material primitive concatenation within existing skinned mesh; sorted oriented triangles compare every position, normal, UV0, joint and weight component exactly before Meshopt. Hierarchy/binds/channels and final decoded sole bounds verified separately.'},null,2));
console.log('Private optimized candidate written; shipping/raw models unchanged.');
