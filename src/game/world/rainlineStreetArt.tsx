import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {useRapier} from '@react-three/rapier';
import {BatchedMesh,BufferGeometry,Color,Float32BufferAttribute,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {buildOverhaulDistrict} from '../../../shared/overhaulDistrict';
import {isRainlineStreetBlock,rainlineStreetSource,readStreetNativeColliders,RAINLINE_STREET_REVISION} from '../../../shared/rainlineStreetAdmission';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import type {CityPresentation} from './cityPresentation';
const URL='/assets/overhaul/rainline-street-v1/Rainline_StreetPopulation_001.glb';
interface Placement {block:CityBlock;index:number;module:string;instance:number;}
interface Group {mesh:BatchedMesh;placements:Placement[];}
export function RainlineStreetArt({seed,presentation}:{seed:number;presentation:CityPresentation}){return seed===7734?<Suspense fallback={null}><StreetInstances seed={seed} presentation={presentation}/></Suspense>:null;}
function StreetInstances({seed,presentation}:{seed:number;presentation:CityPresentation}){
 const {world}=useRapier(),gltf=useGLTF(URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]);
 const groups=useMemo(()=>{
  if(!district)return [];
  const selected=district.blocks.flatMap((block,index)=>{const row=rainlineStreetSource(block);return row?[{block,index,module:row.module}]:[];}),sources=new Map<string,{material:Material;geometries:Map<string,BufferGeometry[]>}>(),result:Group[]=[];
  gltf.scene.updateMatrixWorld(true);
  try{
   const authored=new Set<string>();
   for(const p of selected){if(authored.has(p.module))continue;authored.add(p.module);const row=rainlineStreetSource(p.block)!,root=gltf.scene.getObjectByName(p.module);if(!root)throw Error('Unchanged street module missing '+p.module);
    root.traverse(object=>{if(!(object instanceof Mesh))return;if(Array.isArray(object.material))throw Error('Street primitive has ambiguous material');
     const group=sources.get(object.material.uuid)??{material:object.material,geometries:new Map<string,BufferGeometry[]>()},geometry=object.geometry.clone().applyMatrix4(object.matrixWorld).translate(-row.center[0],-row.center[1],-row.center[2]);
     for(const name of Object.keys(geometry.attributes)){const attribute=geometry.getAttribute(name);if(attribute.normalized)geometry.setAttribute(name,new Float32BufferAttribute(Array.from({length:attribute.count},(_,i)=>Array.from({length:attribute.itemSize},(_,j)=>attribute.getComponent(i,j))).flat(),attribute.itemSize));}
     const parts=group.geometries.get(p.module)??[];parts.push(geometry);group.geometries.set(p.module,parts);sources.set(object.material.uuid,group);
    });
   }
   if(sources.size>4)throw Error('Street admission exceeds four shared material groups');
   for(const group of sources.values()){
    const geometries=new Map<string,BufferGeometry>();
    try{for(const [module,parts] of group.geometries){const merged=mergeGeometries(parts,false);if(!merged)throw Error('Street material geometry cannot be merged '+module);geometries.set(module,merged);}
     const placements=selected.filter(p=>geometries.has(p.module)),mesh=new BatchedMesh(placements.length,[...geometries.values()].reduce((n,g)=>n+g.getAttribute('position').count,0),[...geometries.values()].reduce((n,g)=>n+(g.index?.count??0),0),group.material);
     result.push({mesh,placements:[]});mesh.name='RainlineStreet_'+group.material.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;
     const ids=new Map<string,number>();for(const [module,geometry] of geometries)ids.set(module,mesh.addGeometry(geometry));result.at(-1)!.placements=placements.map(p=>({...p,instance:mesh.addInstance(ids.get(p.module)!)}));
    }finally{for(const geometry of geometries.values())geometry.dispose();}
   }
   return result;
  }catch(error){for(const group of result)group.mesh.dispose();throw error;}
  finally{for(const group of sources.values())for(const parts of group.geometries.values())for(const geometry of parts)geometry.dispose();}
 },[gltf,district]);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),position=new Vector3(),rotation=new Quaternion(),unit=new Vector3(1,1,1),intactColor=new Color(1,1,1),wreckColor=new Color(.42,.34,.27);
  const apply=(state:ReturnType<CityPresentation['read']>)=>{const poses=new Map(state?.ruins?.map(p=>[p.block,p])??[]);
   for(const group of groups)for(const p of group.placements){const intact=cityBlockActive(p.block,state?.structures??[]),pose=poses.get(p.index);group.mesh.setVisibleAt(p.instance,intact||!!pose);if(!intact&&!pose)continue;
    if(intact){position.set(...p.block.position);rotation.setFromAxisAngle(new Vector3(0,1,0),p.block.yaw);}else{position.set(pose!.position.x,pose!.position.y,pose!.position.z);rotation.set(pose!.rotation.x,pose!.rotation.y,pose!.rotation.z,pose!.rotation.w);}
    matrix.compose(position,rotation,unit);group.mesh.setMatrixAt(p.instance,matrix);group.mesh.setColorAt(p.instance,intact?intactColor:wreckColor);
   }
  };apply(presentation.read());return presentation.register(apply);
 },[groups,presentation]);
 useLayoutEffect(()=>presentation.registerMesh(()=>{const blocks=district?.blocks.filter(isRainlineStreetBlock)??[],states=presentation.read()?.structures??[],removedBlocks=blocks.filter(b=>!cityBlockActive(b,states)).map(b=>b.id);
  return {surface:'pbr',activeBlocks:blocks.length-removedBlocks.length,removedBlocks,cells:blocks.length,street:{revision:RAINLINE_STREET_REVISION,materialGroups:groups.length,native:readStreetNativeColliders(world)}};
 }),[district,groups,presentation,world]);
 useEffect(()=>()=>{for(const group of groups)group.mesh.dispose();},[groups]);
 return <>{groups.map(group=><primitive key={group.mesh.uuid} object={group.mesh} dispose={null}/>)}</>;
}
useGLTF.preload(URL);
