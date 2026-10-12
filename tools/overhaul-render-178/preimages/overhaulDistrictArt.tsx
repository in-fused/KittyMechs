import {isRainlineExtraction039Block} from '../../../shared/rainlineExtraction039';
import {Suspense,useEffect,useLayoutEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Color,BufferGeometry,InstancedMesh,Matrix4,Mesh,Quaternion,Vector3,type Material} from 'three';
import {buildOverhaulDistrict,getOverhaulComponent} from '../../../shared/overhaulDistrict';
import {isOverhaulDressingBlock} from '../../../shared/overhaulDressing';
import {isRainlineStreetBlock} from '../../../shared/rainlineStreetAdmission';
import {cityBlockActive,type CityBlock} from '../../../shared/cityDistrict';
import type {StructureState} from '../../../shared/types';
import type {CityPresentation} from './cityPresentation';
import {OverhaulIdentityArt,overhaulIdentityModule} from './overhaulIdentityArt';

const URL='/assets/overhaul/city-v2/Rainline_Modular_City_v2.glb';
type Module='frame'|'foundation'|'facade_apartment'|'facade_shop'|'facade_workshop'|'facade_factory'|'facade_utility'|'facade_transit'|'facade_civic'|'roof'|'roof_utility'|'roof_residential'|'slab'|'gantry'|'bridge'|'rail'|'props';
interface RuinPose {block:number;position:{x:number;y:number;z:number};rotation:{x:number;y:number;z:number;w:number};settled:boolean;born:number;}
interface Placement {block:CityBlock;index:number;matrix:Matrix4;}
interface Batch {key:string;geometry:BufferGeometry;material:Material|Material[];placements:Placement[];mesh:InstancedMesh|null;}
/** The shared compiler owns every visible component. No whole-building proxy or
 * additional solid scenery is created by this adapter. GLB details share the
 * instance transform and active mask of their owning gameplay component. */
export function OverhaulDistrictArt({seed,presentation}:{seed:number;presentation:CityPresentation}) {
  return <Suspense fallback={null}><DistrictInstances seed={seed} presentation={presentation}/></Suspense>;
}
export function OverhaulRuinsArt({seed,presentation}:{seed:number;presentation:CityPresentation}) {
  return <Suspense fallback={null}><DistrictInstances seed={seed} presentation={presentation} ruins/></Suspense>;
}
function moduleFor(block:CityBlock):Module {
  const component=getOverhaulComponent(block);
  if(block.part==='fixture')return 'props';
  switch(component?.kind){
    case 'column':return 'frame';
    case 'foundation':return 'foundation';
    case 'slab':return !block.id.includes(':roof-')?'slab':component.usage==='utility'?'roof_utility':component.usage==='residential'||component.usage==='civic'?'roof_residential':'roof';
    case 'beam':return 'gantry';
    case 'bridge-deck':return 'bridge';
    case 'rail':return 'rail';
    case 'facade': {
      const match=block.id.match(/facade-[a-z]+-(\d+)-(\d+)$/),ground=match?.[1]==='0',bay=Number(match?.[2]??0);
      // Retained source profiles identify individual parcels. Only one bay per
      // frontage bears a large sign; intact/ruin ownership is still the facade.
      if(block.buildingId.endsWith(':spawn-west'))return ground&&bay===1?'facade_workshop':'facade_civic';
      if(block.buildingId.endsWith(':relay-west-entry'))return ground&&bay===1?'facade_utility':ground?'facade_civic':'facade_apartment';
      if(block.buildingId.endsWith(':east-relay-yard'))return ground&&bay===1?'facade_workshop':ground?'facade_factory':'facade_apartment';
      if(component.usage==='works')return ground&&bay===1?'facade_workshop':'facade_factory';
      if(component.usage==='utility')return ground&&bay===1?'facade_utility':'facade_civic';
      if(component.usage==='transit')return ground&&bay===1?'facade_transit':'facade_civic';
      if(component.usage==='civic')return ground&&bay===1?'facade_shop':'facade_civic';
      return ground&&bay===1?'facade_shop':'facade_apartment';
    }
    default:return block.part==='foundation'?'foundation':block.part==='deck'?'slab':'frame';
  }
}
function moduleYaw(block:CityBlock):number {
  const component=getOverhaulComponent(block);if(component?.kind!=='facade')return 0;
  return component.side==='east'?Math.PI/2:component.side==='west'?-Math.PI/2:component.side==='north'?Math.PI:0;
}
function componentMatrix(block:CityBlock):Matrix4 {
  const meta=getOverhaulComponent(block),swap=meta?.kind==='facade'&&(meta.side==='west'||meta.side==='east');
  const [hx,hy,hz]=block.halfExtents;
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+moduleYaw(block));
  return new Matrix4().compose(new Vector3(...block.position),rotation,new Vector3(2*(swap?hz:hx),2*hy,2*(swap?hx:hz)));
}
function update(batches:Batch[],states:readonly StructureState[],ruinPoses?:readonly RuinPose[]) {
  const ruins=ruinPoses?new Map(ruinPoses.map(pose=>[pose.block,pose])):null;
  const banks=new Map(states.map(state=>[state.id,state])),color=new Color();
  const matrix=new Matrix4(),translation=new Vector3(),scale=new Vector3(),orientation=new Quaternion(),originalOrientation=new Quaternion();
  for(const batch of batches){
    const mesh=batch.mesh;if(!mesh)continue;let count=0;
    for(const placement of batch.placements){
      if(ruins){
        const pose=ruins.get(placement.index);if(!pose)continue;
        placement.matrix.decompose(translation,originalOrientation,scale);
        // Ruin pose is already the complete collider world orientation.
        originalOrientation.setFromAxisAngle(new Vector3(0,1,0),moduleYaw(placement.block));
        translation.set(pose.position.x,pose.position.y,pose.position.z);
        orientation.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w).multiply(originalOrientation);
        matrix.compose(translation,orientation,scale);mesh.setColorAt(count,color.setRGB(.72,.72,.72));mesh.setMatrixAt(count++,matrix);
      }else if(cityBlockActive(placement.block,states)){
        const block=placement.block,hp=block.cellId===undefined?1:(banks.get(block.structureId!)?.hp[block.cellId]??getOverhaulComponent(block)?.maxHp??1),max=getOverhaulComponent(block)?.maxHp??hp;
        const wear=1-Math.max(0,Math.min(1,hp/max));mesh.setColorAt(count,color.setRGB(1-wear*.5,1-wear*.58,1-wear*.62));mesh.setMatrixAt(count++,placement.matrix);
      }
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
}
function DistrictInstances({seed,presentation,ruins=false}:{seed:number;presentation:CityPresentation;ruins?:boolean}) {
  const gltf=useGLTF(URL),district=useMemo(()=>buildOverhaulDistrict(seed),[seed]);
  const batches=useMemo(()=>{
    if(!district)return [];
    gltf.scene.updateMatrixWorld(true);
    const placements=new Map<Module,Placement[]>();
    for(const [index,block] of district.blocks.entries()){if(isRainlineExtraction039Block(block)||isOverhaulDressingBlock(block)||isRainlineStreetBlock(block)||overhaulIdentityModule(block))continue;const module=moduleFor(block),group=placements.get(module)??[];group.push({block,index,matrix:componentMatrix(block)});placements.set(module,group);}
    const result:Batch[]=[];
    for(const [module,group] of placements){
      const root=gltf.scene.getObjectByName(module);
      if(!root)throw new Error(`Rainline art module missing: ${module}`);
      root.traverse(object=>{if(object instanceof Mesh){
        // Bake asset transforms once, then instance the exact shared collider box.
        const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
        result.push({key:object.name,geometry,material:object.material,placements:group,mesh:null});
      }});
    }
    return result;
  },[gltf,district]);
  useLayoutEffect(()=>{
    const apply=(state:ReturnType<CityPresentation['read']>)=>update(batches,state?.structures??[],ruins?((state as (NonNullable<typeof state>&{ruins?:readonly RuinPose[]})|null)?.ruins??[]):undefined);
    apply(presentation.read());
    return presentation.register(apply);
  },[batches,presentation,ruins]);
  useLayoutEffect(()=>ruins?undefined:presentation.registerMesh(()=>{
    const states=presentation.read()?.structures??[],blocks=(district?.blocks??[]).filter(block=>!isRainlineExtraction039Block(block)&&!isOverhaulDressingBlock(block)&&!isRainlineStreetBlock(block));
    const removedBlocks=blocks.filter(block=>!cityBlockActive(block,states)).map(block=>block.id);
    return {surface:'pbr',activeBlocks:blocks.length-removedBlocks.length,removedBlocks,cells:blocks.filter(block=>block.structureId!==undefined).length};
  }),[district,presentation,ruins]);
  useEffect(()=>()=>{for(const batch of batches)batch.geometry.dispose();},[batches]);
  return <><OverhaulIdentityArt seed={seed} presentation={presentation} ruins={ruins}/>{batches.map(batch=><instancedMesh key={batch.key} ref={mesh=>{batch.mesh=mesh;}} args={[batch.geometry,batch.material,batch.placements.length]} frustumCulled={false} castShadow receiveShadow dispose={null}/>)}</>;
}
useGLTF.preload(URL);
