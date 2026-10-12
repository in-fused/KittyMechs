import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {BufferGeometry,BufferAttribute,Float32BufferAttribute,InstancedMesh,MeshBasicMaterial,Matrix4,Vector3,Quaternion,PerspectiveCamera,Frustum} from 'three';
import {spatialPlacements281,refreshInstanceBounds281} from '../overhaul-spatial-render-281/spatial281';
import {buildOverhaulDistrict} from '../../shared/overhaulDistrict';
const bytes=readFileSync('public/assets/overhaul/city-v2/Rainline_Modular_City_v2.glb');
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8')),bin=bytes.subarray(28+jsonLength);
const geometries:BufferGeometry[]=[];
for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
 const a=gltf.accessors[primitive.attributes.POSITION],v=gltf.bufferViews[a.bufferView];assert([5122,5126].includes(a.componentType));assert.equal(a.type,'VEC3');assert(!a.sparse&&!v.extensions);assert.equal(v.buffer??0,0);
 const size=a.componentType===5122?2:4,stride=v.byteStride??3*size;assert(stride>=3*size&&stride%size===0);assert(((v.byteOffset??0)+(a.byteOffset??0))%size===0);
 const positions:number[]=[];for(let i=0;i<a.count;i++)for(let k=0;k<3;k++){const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*stride+k*size;assert(offset+size<=bin.length&&offset+size<=(v.byteOffset??0)+v.byteLength);positions.push(a.componentType===5122?bin.readInt16LE(offset):bin.readFloatLE(offset));}
 const raw=a.componentType===5122?new Int16Array(positions):new Float32Array(positions);assert(a.componentType!==5126||!a.normalized);
 geometries.push(new BufferGeometry().setAttribute('position',new BufferAttribute(raw,3,a.normalized===true)));
}
assert(geometries.length>0);
const district=buildOverhaulDistrict(7734)!;assert(district.blocks.length>0);
const placements=district.blocks.map((block,index)=>({block,index})),cells=spatialPlacements281(placements);
assert.equal(cells.flatMap(c=>c.placements).length,placements.length);assert.equal(new Set(cells.flatMap(c=>c.placements)).size,placements.length);
for(const cell of cells)for(const p of cell.placements)assert.equal(cell.key,Math.floor(p.block.position[0]/32)+','+Math.floor(p.block.position[2]/32));
let verticesChecked=0,maxExcess=-Infinity;
const point=new Vector3(),matrix=new Matrix4(),material=new MeshBasicMaterial();
for(const geometry of geometries){
 const inst=new InstancedMesh(geometry,material,3);
 const transforms=[new Matrix4().compose(new Vector3(-41,2,12),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.7),new Vector3(8,6,.3)),new Matrix4().compose(new Vector3(42,1,-60),new Quaternion().setFromAxisAngle(new Vector3(1,0,0),1.3),new Vector3(3,.5,11)),new Matrix4().makeTranslation(-2,20,5)];
 for(let i=0;i<3;i++)inst.setMatrixAt(i,transforms[i]);refreshInstanceBounds281(inst);
 const check=()=>{const sphere=inst.boundingSphere!,position=geometry.getAttribute('position');for(let i=0;i<inst.count;i++){inst.getMatrixAt(i,matrix);for(let j=0;j<position.count;j++){point.fromBufferAttribute(position,j).applyMatrix4(matrix);const excess=point.distanceTo(sphere.center)-sphere.radius;maxExcess=Math.max(maxExcess,excess);assert(excess<=1e-8);verticesChecked++;}}};
 check();inst.count=1;refreshInstanceBounds281(inst);check();inst.count=0;refreshInstanceBounds281(inst);inst.count=3;inst.setMatrixAt(2,new Matrix4().makeTranslation(120,-4,35));refreshInstanceBounds281(inst);check();inst.dispose();
}
const camera=new PerspectiveCamera(60,1440/900,.1,150);camera.position.set(-8,8,24);camera.lookAt(-8,2,12);camera.updateMatrixWorld();const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
let visible=0;for(const c of cells){const mesh=new InstancedMesh(geometries[0],material,c.placements.length);c.placements.forEach((p,i)=>mesh.setMatrixAt(i,new Matrix4().makeTranslation(...p.block.position)));refreshInstanceBounds281(mesh);if(frustum.intersectsObject(mesh))visible++;mesh.dispose();}
assert(visible<cells.length);for(const g of geometries)g.dispose();material.dispose();
const result={writer:'CLOSED',status:'NUMERIC_BOUNDING_AND_OWNERSHIP_PASS',sourceMeshes:geometries.length,components:placements.length,cells:cells.length,visibleProxyCells:visible,verticesChecked,maxExcess,scope:'Actual retained GLB positions across scaled/rotated/compacted/restored/moved instance bounds; actual district ownership preserved. Proxy-cell frustum count is not GPU/performance or actual destruction pixels.'};
writeFileSync('tools/overhaul-spatial-fixture-282/result282.json',JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));
