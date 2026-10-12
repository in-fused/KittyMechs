import {useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {BatchedMesh,BufferGeometry,Float32BufferAttribute,Color,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {buildOverhaulDistrict,getOverhaulComponent} from '../../../shared/overhaulDistrict';
import {getOverhaulArchitectureComponent} from '../../../shared/overhaulArchitecture';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import {overhaulFragmentRecipe,overhaulFragmentKey} from '../../../shared/overhaulFracture';
import {clipOverhaulFragment} from './overhaulFragmentGeometry';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {identityRhythmTiles} from './rainlineFacadeRhythm001';
import type {CityPresentation} from './cityPresentation';
const URL='/assets/overhaul/city-v4/Rainline_Identity_v4.glb';
interface Placement {block:CityBlock;index:number;instance:number;matrix:Matrix4;piece?:number;}
interface Group {mesh:BatchedMesh;placements:Placement[];}
export function overhaulIdentityModule(block:CityBlock):string|undefined{
 const architecture=getOverhaulArchitectureComponent(block);if(architecture)return architecture.module;
 const component=getOverhaulComponent(block);if(component?.kind!=='facade')return undefined;
 const match=block.id.match(/facade-[a-z]+-(\d+)-(\d+)$/),ground=match?.[1]==='0',bay=Number(match?.[2]??0);
 const family=block.buildingId.endsWith(':spawn-west')||block.buildingId.endsWith(':east-relay-yard')?'loading':block.buildingId.endsWith(':west-relay-yard')?'transit':block.buildingId.endsWith(':spawn-east')||block.buildingId.endsWith(':core-west')?'control':block.buildingId.endsWith(':west-midrise')?'residential':component.usage==='works'?'loading':component.usage==='transit'?'transit':component.usage==='residential'?'residential':'control';
 if(!ground)return family+'_upper';
 if(bay!==1)return family+'_ground';
 // Label variants contain the same complete wall/profile as ordinary bays.
 // Every plaque remains part of this exact native intact/damaged/ruin owner.
 const parcels=new Map([
  ['spawn-west','loading_label_machine'],['relay-west-entry','loading_label_entry'],
  ['west-warehouse','loading_label_warehouse'],['east-workshop','loading_label_eastworks'],
  ['east-relay-yard','loading_label_freight'],['core-west-works','loading_label_corewest'],
  ['core-east-works','loading_label_coreeast'],['west-relay-yard','transit_label_west'],
  ['relay-east-entry','transit_label_east'],['rear-east-utility','transit_label_rear'],
  ['spawn-east','control_label_pump'],['core-west','control_label_grid'],
  ['core-east','control_label_power'],['east-midrise','control_label_city'],
  ['west-midrise','residential_label_quay'],['east-warehouse','residential_label_east'],
 ]);
 return parcels.get(block.buildingId.split(':').at(-1)??'')??family+'_label_'+(family==='loading'?'warehouse':family==='transit'?'rear':family==='residential'?'quay':'power');
}
function orientationOffset(block:CityBlock):number{
 const component=getOverhaulComponent(block);if(component?.kind!=='facade')return 0;
 return component.side==='east'?Math.PI/2:component.side==='west'?-Math.PI/2:component.side==='north'?Math.PI:0;
}
export function overhaulIdentityMatrix(block:CityBlock):Matrix4{
 const component=getOverhaulComponent(block),swap=component?.kind==='facade'&&(component.side==='west'||component.side==='east'),[x,y,z]=block.halfExtents;
 return new Matrix4().compose(new Vector3(...block.position),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+orientationOffset(block)),new Vector3(2*(swap?z:x),2*y,2*(swap?x:z)));
}
/** Four shared material batches, independently visible source instances. No
 * geometry is generated during ticks; intact and ruin use one module selection. */
export function OverhaulIdentityArt({seed,presentation,ruins=false,experimentalFragments=false}:{seed:number;presentation:CityPresentation;ruins?:boolean;experimentalFragments?:boolean}){
 const gltf=useGLTF(URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]);
 const groups=useMemo(()=>{
  if(!district)return [];
  gltf.scene.updateMatrixWorld(true);
  const selected=district.blocks.flatMap((block,index)=>{const module=overhaulIdentityModule(block);if(!module)return [];const tiles=identityRhythmTiles(block,module),variant=JSON.stringify(tiles),recipe=overhaulFragmentRecipe(block),whole={block,index,module,tiles,variant,piece:undefined as number|undefined};return ruins&&experimentalFragments&&recipe.length>1?[whole,...recipe.map(f=>({block,index,module,piece:f.piece}))]:[whole];});
  const sources=new Map<string,{material:Material;geometries:Map<string,BufferGeometry>}>();
  for(const module of new Set(selected.flatMap(p=>p.tiles.map(t=>t.module)))){const root=gltf.scene.getObjectByName(module);if(!root)throw Error('Rainline identity module absent '+module);
   root.traverse(object=>{if(!(object instanceof Mesh))return;if(Array.isArray(object.material))throw Error('Identity source requires one material per primitive');
    const material=object.material,group=sources.get(material.uuid)??{material,geometries:new Map<string,BufferGeometry>()},geometry=object.geometry.clone();
    // Shared batches must not copy normalized float colors into byte storage.
    // Decode once for intact and clipped geometry, preserving the same colors.
    for(const name of Object.keys(geometry.attributes)){const attribute=geometry.getAttribute(name);if(attribute.normalized)geometry.setAttribute(name,new Float32BufferAttribute(Array.from({length:attribute.count},(_,i)=>Array.from({length:attribute.itemSize},(_,j)=>attribute.getComponent(i,j))).flat(),attribute.itemSize));}
    geometry.applyMatrix4(object.matrixWorld);
    group.geometries.set(module,geometry);sources.set(material.uuid,group);
   });
  }
  const result:Group[]=[];
  for(const source of sources.values()){
   const originals=source.geometries;source.geometries=new Map();
   let placements=selected.filter(p=>p.tiles.some(t=>originals.has(t.module)));
   for(const p of placements)if(!source.geometries.has(p.variant)){
    const pieces=p.tiles.flatMap(t=>{const original=originals.get(t.module);return original?[original.clone().scale(t.sx,t.sy,1).translate(t.x,t.y,0)]:[];});
    const merged=mergeGeometries(pieces);for(const piece of pieces)piece.dispose();
    if(!merged)throw Error('Cannot merge retained facade rhythm '+p.module);
    merged.computeBoundingBox();merged.computeBoundingSphere();source.geometries.set(p.variant,merged);
   }
   for(const geometry of originals.values())geometry.dispose();
   const geometryKey=(p:typeof placements[number])=>p.piece===undefined?p.variant:p.variant+':'+overhaulFragmentRecipe(p.block)[p.piece].canonicalOffset.join(',');
   if(ruins)for(const p of placements)if(p.piece!==undefined){const key=geometryKey(p);if(!source.geometries.has(key))source.geometries.set(key,clipOverhaulFragment(source.geometries.get(p.variant)!,overhaulFragmentRecipe(p.block)[p.piece].canonicalOffset));}
   // A localized original detail may lie entirely in another quarter; it has
   // no triangles or instance here. The actual backing primitive remains.
   placements=placements.filter(p=>source.geometries.get(geometryKey(p))!.getAttribute('position').count>0);
   for(const [key,geometry] of source.geometries)if(!geometry.getAttribute('position').count){geometry.dispose();source.geometries.delete(key);}
   const geometries=[...source.geometries.values()];
   const mesh=new BatchedMesh(placements.length,geometries.reduce((n,g)=>n+g.getAttribute('position').count,0),geometries.reduce((n,g)=>n+(g.index?.count??g.getAttribute('position').count),0),source.material);
   mesh.name='RainlineIdentity_'+source.material.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;
   const ids=new Map<string,number>();for(const [module,geometry] of source.geometries){ids.set(module,mesh.addGeometry(geometry));geometry.dispose();}
   result.push({mesh,placements:placements.map(p=>({...p,instance:mesh.addInstance(ids.get(geometryKey(p))!),matrix:overhaulIdentityMatrix(p.block)}))});
  }
  if(result.length>4)throw Error('Rainline identity exceeds four material batches');
  return result;
 },[gltf,district,ruins,experimentalFragments]);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),position=new Vector3(),scale=new Vector3(),rotation=new Quaternion(),offset=new Quaternion(),color=new Color();
  const apply=(state:ReturnType<CityPresentation['read']>)=>{
   const poses=new Map(state?.ruins?.map(p=>[overhaulFragmentKey(p.block,p.piece),p])??[]),banks=new Map(state?.structures.map(s=>[s.id,s])??[]);
   for(const group of groups)for(const p of group.placements){
    if(ruins){const pose=poses.get(overhaulFragmentKey(p.index,p.piece)),matching=!!pose&&(p.piece===undefined?overhaulFragmentRecipe(p.block).length===1||pose.piece===undefined:pose.piece===p.piece);group.mesh.setVisibleAt(p.instance,matching);if(!pose||!matching)continue;
     p.matrix.decompose(position,rotation,scale);position.set(pose.position.x,pose.position.y,pose.position.z);offset.setFromAxisAngle(new Vector3(0,1,0),orientationOffset(p.block));rotation.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w).multiply(offset);matrix.compose(position,rotation,scale);group.mesh.setMatrixAt(p.instance,matrix);group.mesh.setColorAt(p.instance,color.setRGB(.72,.72,.72));
    }else{
     const live=cityBlockActive(p.block,state?.structures??[]);group.mesh.setVisibleAt(p.instance,live);if(!live)continue;group.mesh.setMatrixAt(p.instance,p.matrix);
     const max=getOverhaulComponent(p.block)?.maxHp??1,hp=p.block.cellId===undefined?max:banks.get(p.block.structureId!)?.hp[p.block.cellId]??max,wear=1-Math.max(0,Math.min(1,hp/max));group.mesh.setColorAt(p.instance,color.setRGB(1-wear*.5,1-wear*.58,1-wear*.62));
    }
   }
  };
  apply(presentation.read());return presentation.register(apply);
 },[groups,presentation,ruins]);
 useEffect(()=>()=>{for(const group of groups)group.mesh.dispose();},[groups]);
 return <>{groups.map(group=><primitive key={group.mesh.uuid} object={group.mesh} dispose={null}/>)}</>;
}
useGLTF.preload(URL);
