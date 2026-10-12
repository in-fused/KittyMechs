import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const file of ['Pounce_Quadruped','Bastion_Quadruped','Pine_Evergreen','Coastal_Basalt']){
  const doc=await io.read(`public/assets/models/${file}.glb`),min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);let triangles=0;
  for(const node of doc.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;const matrix=new Matrix4().fromArray(node.getWorldMatrix());for(const primitive of mesh.listPrimitives()){const position=primitive.getAttribute('POSITION');if(!position)continue;triangles+=(primitive.getIndices()?.getCount()??position.getCount())/3;for(let i=0;i<position.getCount();i++){const p=new Vector3().fromArray(position.getElement(i,[])).applyMatrix4(matrix);min.min(p);max.max(p);}}}
  console.log(file,JSON.stringify({min:min.toArray(),max:max.toArray(),triangles}));
  if(file==='Pine_Evergreen')console.log(doc.getRoot().listMaterials().map(m=>({name:m.getName(),alpha:m.getAlphaMode(),factor:m.getBaseColorFactor(),texture:m.getBaseColorTexture()?.getName()})));
}
