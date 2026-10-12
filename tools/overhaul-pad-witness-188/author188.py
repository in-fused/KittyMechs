from pathlib import Path
p=Path('src/game/entities/sourceCoordination164.ts')
s=p.read_text()
s=s.replace('points:Float64Array;affine:Matrix4','points:Float64Array;vertexIndices:number[];affine:Matrix4')
s=s.replace("type Mesh164=", "export interface MaterialPoint188 {readonly limb:FootLimb123;readonly meshUUID:string;readonly geometryUUID:string;readonly vertexIndex:number;readonly skinIndices:readonly number[];readonly skinWeights:readonly number[];}\ntype PointBinding188={group:Group164;offset:number;source:Vector3;parents:{node:Object3D;parent:Object3D|null}[];layout:{attribute:any;count:number;itemSize:number}[]};\ntype Mesh164=")
s=s.replace('private inverse=new Matrix4();','private inverse=new Matrix4();private ready188=false;private points188=new WeakMap<MaterialPoint188,PointBinding188>();private meshMaps188=new Map<SkinnedMesh,{world:Matrix4;inverse:Matrix4}>();private currentMap188=new Matrix4();')
s=s.replace('weights:number[];points:Vector3[]}>','weights:number[];points:Vector3[];vertices:number[]}>').replace('bin={indices,weights,points:[]}','bin={indices,weights,points:[],vertices:[]}').replace('bin.points.push(new Vector3().fromBufferAttribute(p,i));','bin.points.push(new Vector3().fromBufferAttribute(p,i));bin.vertices.push(i);')
s=s.replace('let points=bin.points;try{','const sourceVertices=new Map(bin.points.map((p,i)=>[p,bin.vertices[i]]));let points=bin.points;try{').replace('points:packed,affine:new Matrix4()','points:packed,vertexIndices:points.map(p=>sourceVertices.get(p)!),affine:new Matrix4()')
s=s.replace('beginPose(refresh=true):void{','beginPose(refresh=true):void{\n  this.ready188=false;')
s=s.replace('g.affine.multiplyMatrices(this.post,this.weighted).multiply(this.inverse);\n  }','g.affine.multiplyMatrices(this.post,this.weighted).multiply(this.inverse);\n  }\n  for(const m of this.meshes){let maps=this.meshMaps188.get(m.mesh);if(!maps){maps={world:new Matrix4(),inverse:new Matrix4()};this.meshMaps188.set(m.mesh,maps);}maps.world.copy(m.mesh.matrixWorld);maps.inverse.copy(m.mesh.bindMatrixInverse);}this.ready188=true;')
needle=' minimum(limb:FootLimb123'
api=''' /** Select once from the current complete-pad plane minimum. This immutable
  * descriptor identifies an original POSITION vertex, not a bone pivot or a
  * later arg-min. Caller owns life/contact release and calls beginPose first. */
 selectMaterialPoint188(limb:FootLimb123,point:Vector3,normal:Vector3):MaterialPoint188{
  if(!this.ready188)throw Error('188_CURRENT_POSE_REQUIRED');
  let best=Infinity,winner:Group164|undefined,index=0;const d=normal.dot(point);
  for(const g of this.groups.get(limb)!){const e=g.affine.elements,a=normal.x*e[0]+normal.y*e[1]+normal.z*e[2],b=normal.x*e[4]+normal.y*e[5]+normal.z*e[6],c=normal.x*e[8]+normal.y*e[9]+normal.z*e[10],k=normal.x*e[12]+normal.y*e[13]+normal.z*e[14]-d;for(let i=0;i<g.points.length;i+=3){const gap=a*g.points[i]+b*g.points[i+1]+c*g.points[i+2]+k;if(gap<best){best=gap;winner=g;index=i;}}}
  if(!winner||!Number.isFinite(best))throw Error('188_INVALID_CURRENT_MATERIAL_POINT');
  const handle:MaterialPoint188=Object.freeze({limb,meshUUID:winner.mesh.uuid,geometryUUID:winner.mesh.geometry.uuid,vertexIndex:winner.vertexIndices[index/3],skinIndices:Object.freeze([...winner.indices]),skinWeights:Object.freeze([...winner.weights])});
  const parents:PointBinding188['parents']=[];for(let node:Object3D|null=winner.mesh;node;node=node.parent){parents.push({node,parent:node.parent});if(node===this.model){parents.push({node:this.model,parent:this.model.parent});break;}}
  this.points188.set(handle,{group:winner,offset:index,source:new Vector3().fromArray(winner.points,index),parents,layout:['position','skinIndex','skinWeight'].map(name=>{const attribute=winner!.mesh.geometry.getAttribute(name);return{attribute,count:attribute.count,itemSize:attribute.itemSize};})});
  this.sampleMaterialPoint188(handle);return handle;
 }
 /** Sample the SAME source weighted vertex after current beginPose. No point
  * reacquisition, handle on minimum(), or cyclic public diagnostic is added. */
 sampleMaterialPoint188(handle:MaterialPoint188):Vector3{
  const b=this.points188.get(handle);if(!b||!this.ready188)throw Error('188_FOREIGN_POINT_OR_CURRENT_POSE_REQUIRED');
  const g=b.group,m=this.meshes.find(m=>m.mesh===g.mesh)!,s=this.skeletons.find(s=>s.skeleton===g.mesh.skeleton),maps=this.meshMaps188.get(g.mesh);
  if(!s||!maps||b.parents.some(p=>p.node.parent!==p.parent)||!b.parents.some(p=>p.node===this.model)||g.mesh.geometry!==m.geometry||g.mesh.skeleton!==m.skeleton||!g.mesh.bindMatrix.equals(m.bind)||m.attributes.some(a=>m.geometry.getAttribute(a.name)!==a.attribute||(a.attribute.array??a.attribute.data?.array)!==a.array||(a.attribute.version??a.attribute.data?.version)!==a.version)||b.layout.some(a=>a.attribute.count!==a.count||a.attribute.itemSize!==a.itemSize))throw Error('188_MATERIAL_POINT_OWNER_OR_LAYOUT_CHANGED');
  if(!maps.world.equals(g.mesh.matrixWorld)||!maps.inverse.equals(g.mesh.bindMatrixInverse))throw Error('188_STALE_CURRENT_SKIN_MAP');
  const position=m.geometry.getAttribute('position'),ix=m.geometry.getAttribute('skinIndex'),weights=m.geometry.getAttribute('skinWeight'),v=handle.vertexIndex;
  if(v<0||v>=position.count||position.getX(v)!==b.source.x||position.getY(v)!==b.source.y||position.getZ(v)!==b.source.z)throw Error('188_SOURCE_POSITION_MUTATION');
  for(let j=0;j<4;j++){const i=g.indices[j];if(ix.getComponent(v,j)!==g.indices[j]||weights.getComponent(v,j)!==g.weights[j]||s.skeleton.bones[i]!==s.bones[i]||s.skeleton.boneInverses[i]!==s.inverses[i]||!s.inverses[i].equals(s.inverseValues[i]))throw Error('188_SOURCE_PALETTE_OR_WEIGHT_MUTATION');this.currentMap188.multiplyMatrices(s.bones[i].matrixWorld,s.inverses[i]);affine(this.currentMap188);normalizeAffine(this.currentMap188);if(!this.currentMap188.equals(s.maps[i]))throw Error('188_STALE_CURRENT_SKIN_MAP');}
  const world=b.source.clone().applyMatrix4(g.affine);if(!world.toArray().every(Number.isFinite))throw Error('188_NONFINITE_CURRENT_POINT');return world;
 }
'''
s=s.replace(needle,api+needle)
p.write_text(s)
