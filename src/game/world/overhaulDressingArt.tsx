import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {BufferGeometry,InstancedMesh,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {buildOverhaulDistrict} from '../../../shared/overhaulDistrict';
import {buildOverhaulDressing,isOverhaulDressingBlock,type DressingModule} from '../../../shared/overhaulDressing';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import type {CityPresentation,PresentedCityState} from './cityPresentation';
const URL='/assets/overhaul/dressing-v1/Rainline_Dressing_v1.glb';
const DENSITY_URL='/assets/overhaul/dressing-v2/Rainline_Dressing_v2.glb';
interface Placement {block:CityBlock;index:number;matrix:Matrix4;}
interface Batch {key:string;geometry:BufferGeometry;material:Material|Material[];placements:Placement[];mesh:InstancedMesh|null;}
/** Every cuboid comes from the published district compiler. This adapter
 * handles intact and persistent ruin poses in the same fifteen batches. */
export function OverhaulDressingArt({seed,presentation}:{seed:number;presentation:CityPresentation}){
 return <Suspense fallback={null}><DressingInstances seed={seed} presentation={presentation}/></Suspense>;
}
function update(batches:Batch[],state:PresentedCityState|null){
 const ruins=new Map(state?.ruins?.map(ruin=>[ruin.block,ruin])??[]),position=new Vector3(),scale=new Vector3(),rotation=new Quaternion(),matrix=new Matrix4();
 for(const batch of batches){const mesh=batch.mesh;if(!mesh)continue;let count=0;
  for(const placement of batch.placements){
   if(cityBlockActive(placement.block,state?.structures??[])){mesh.setMatrixAt(count++,placement.matrix);continue;}
   const ruin=ruins.get(placement.index);if(!ruin)continue;
   position.set(ruin.position.x,ruin.position.y,ruin.position.z);rotation.set(ruin.rotation.x,ruin.rotation.y,ruin.rotation.z,ruin.rotation.w);scale.set(...placement.block.halfExtents).multiplyScalar(2);matrix.compose(position,rotation,scale);mesh.setMatrixAt(count++,matrix);
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
 }
}
function DressingInstances({seed,presentation}:{seed:number;presentation:CityPresentation}){
 const gltf=useGLTF(URL),density=useGLTF(DENSITY_URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]);
 const batches=useMemo(()=>{
  if(!district)return [];
  const dressing=buildOverhaulDressing(district),groups=new Map<DressingModule,Placement[]>();
  for(const [index,block] of district.blocks.entries()){
   if(!isOverhaulDressingBlock(block))continue;const component=dressing.components.get(block.id);if(!component)throw Error('Published dressing component has no source recipe: '+block.id);
   const placements=groups.get(component.module)??[],matrix=new Matrix4().compose(new Vector3(...block.position),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw),new Vector3(...block.halfExtents).multiplyScalar(2));placements.push({block,index,matrix});groups.set(component.module,placements);
  }
  gltf.scene.updateMatrixWorld(true);density.scene.updateMatrixWorld(true);const result:Batch[]=[];
  for(const [module,placements] of groups){const root=density.scene.getObjectByName(module)??gltf.scene.getObjectByName(module);if(!root)throw Error('Dressing GLB module absent: '+module);
   root.traverse(object=>{if(object instanceof Mesh)result.push({key:object.name,geometry:object.geometry.clone().applyMatrix4(object.matrixWorld),material:object.material,placements,mesh:null});});
  }
  return result;
 },[gltf,density,district]);
 useLayoutEffect(()=>{update(batches,presentation.read());return presentation.register(state=>update(batches,state));},[batches,presentation]);
 useLayoutEffect(()=>presentation.registerMesh(()=>{
  const blocks=(district?.blocks??[]).filter(isOverhaulDressingBlock),states=presentation.read()?.structures??[];
  const removedBlocks=blocks.filter(block=>!cityBlockActive(block,states)).map(block=>block.id);
  return {surface:'pbr',activeBlocks:blocks.length-removedBlocks.length,removedBlocks,cells:blocks.length};
 }),[district,presentation]);
 useEffect(()=>()=>{for(const batch of batches)batch.geometry.dispose();},[batches]);
 return <>{batches.map(batch=><instancedMesh key={batch.key} ref={mesh=>{batch.mesh=mesh;}} args={[batch.geometry,batch.material,batch.placements.length]} frustumCulled={false} castShadow receiveShadow dispose={null}/>)}</>;
}
useGLTF.preload(URL);
useGLTF.preload(DENSITY_URL);
