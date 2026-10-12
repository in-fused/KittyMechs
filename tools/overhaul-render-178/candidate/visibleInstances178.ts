import {BatchedMesh,BufferGeometry,InstancedMesh,Matrix4,Quaternion,Vector3,type Material} from 'three';
import {getOverhaulComponent} from '../../../shared/overhaulDistrict';
import type {CityBlock} from '../../../shared/cityDistrict';
/** Exact geometry/active masks; Three chooses each color or shadow pass's frustum.
 * Keep instancing on contexts without multi-draw: its BatchedMesh fallback emits
 * one draw per visible object and can be more expensive than the retained path. */
export interface VisibleInstances178 {
 mesh:BatchedMesh|InstancedMesh;
 capacity:number;
 visibleCount:number;
 diagnostic:{name:string;mode:'per-instance-batched'|'legacy-instanced';multiDrawAvailable:boolean;reason:string|null;capacity:number;activeInstances:number;trianglesPerInstance:number;lastPassFrame:number|null;lastPassCamera:string|null;lastPassKind:'color'|'shadow'|null;lastPassSubmittedInstances:number|null;lastPassSubmittedTriangles:number|null};
}
const registry=new Map<VisibleInstances178,symbol>();
export const MAX_VISIBLE_BATCHES178=256;
export function readVisibleInstances178(){return {policy:'EXACT_GEOMETRY_PER_RENDER_PASS_FRUSTUM178',registered:registry.size,limit:MAX_VISIBLE_BATCHES178,batches:[...registry.keys()].map(b=>({...b.diagnostic}))};}
if(typeof window!=='undefined')(window as unknown as {__kittyVisibleInstances178:typeof readVisibleInstances178}).__kittyVisibleInstances178=readVisibleInstances178;
export function registerVisibleInstances178(batch:VisibleInstances178){
 const token=Symbol();if(registry.size>=MAX_VISIBLE_BATCHES178&&!registry.has(batch))return()=>{};
 registry.set(batch,token);return()=>{if(registry.get(batch)===token)registry.delete(batch);};
}
export function createVisibleInstances178(geometry:BufferGeometry,material:Material|Material[],capacity:number,multiDrawAvailable:boolean,name:string):VisibleInstances178{
 const enabled=multiDrawAvailable&&!Array.isArray(material),triangles=(geometry.index?.count??geometry.getAttribute('position').count)/3;
 const mesh=enabled?new BatchedMesh(capacity,geometry.getAttribute('position').count,geometry.index?.count??0,material):new InstancedMesh(geometry,material,capacity);
 mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
 if(mesh instanceof BatchedMesh){mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;const id=mesh.addGeometry(geometry);for(let i=0;i<capacity;i++){mesh.addInstance(id);mesh.setVisibleAt(i,false);}}
 else mesh.count=0;
 const batch:VisibleInstances178={mesh,capacity,visibleCount:0,diagnostic:{name,mode:enabled?'per-instance-batched':'legacy-instanced',multiDrawAvailable,reason:enabled?null:Array.isArray(material)?'MATERIAL_GROUPS_RETAIN_LEGACY':'NO_WEBGL_MULTI_DRAW_RETAIN_LEGACY',capacity,activeInstances:0,trianglesPerInstance:triangles,lastPassFrame:null,lastPassCamera:null,lastPassKind:null,lastPassSubmittedInstances:null,lastPassSubmittedTriangles:null}};
 const original=mesh.onBeforeRender;
 mesh.onBeforeRender=function(renderer,scene,camera,geometry,material,group){
  original.call(this,renderer,scene,camera,geometry,material,group);
  const submitted=this instanceof BatchedMesh?(this as unknown as {_multiDrawCount:number})._multiDrawCount:(this as InstancedMesh).count;
  batch.diagnostic.lastPassFrame=renderer.info.render.frame;batch.diagnostic.lastPassCamera=camera.uuid;batch.diagnostic.lastPassKind=scene===null?'shadow':'color';batch.diagnostic.lastPassSubmittedInstances=submitted;batch.diagnostic.lastPassSubmittedTriangles=submitted*(group?group.count/3:triangles);
 };
 return batch;
}
/** Call only after the existing city owner wrote its dense active prefix.
 * Camera selection NEVER changes this prefix or any native/damage state. */
export function commitVisibleInstances178(batch:VisibleInstances178,count:number){
 if(!Number.isInteger(count)||count<0||count>batch.capacity)throw Error('178_ACTIVE_PREFIX_OUTSIDE_CAPACITY');
 if(batch.mesh instanceof BatchedMesh){for(let i=Math.min(count,batch.visibleCount);i<Math.max(count,batch.visibleCount);i++)batch.mesh.setVisibleAt(i,i<count);}
 else{batch.mesh.count=count;batch.mesh.instanceMatrix.needsUpdate=true;if(batch.mesh.instanceColor)batch.mesh.instanceColor.needsUpdate=true;}
 batch.visibleCount=count;batch.diagnostic.activeInstances=count;
}
export function disposeVisibleInstances178(batch:VisibleInstances178){registry.delete(batch);batch.mesh.dispose();}

export type DistrictModule178='frame'|'foundation'|'facade_apartment'|'facade_shop'|'facade_workshop'|'facade_factory'|'facade_utility'|'facade_transit'|'facade_civic'|'roof'|'roof_utility'|'roof_residential'|'slab'|'gantry'|'bridge'|'rail'|'props';
export function districtModule178(block:CityBlock):DistrictModule178 {
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
export function districtModuleYaw178(block:CityBlock):number {
  const component=getOverhaulComponent(block);if(component?.kind!=='facade')return 0;
  return component.side==='east'?Math.PI/2:component.side==='west'?-Math.PI/2:component.side==='north'?Math.PI:0;
}
export function districtMatrix178(block:CityBlock):Matrix4 {
  const meta=getOverhaulComponent(block),swap=meta?.kind==='facade'&&(meta.side==='west'||meta.side==='east');
  const [hx,hy,hz]=block.halfExtents;
  const rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+districtModuleYaw178(block));
  return new Matrix4().compose(new Vector3(...block.position),rotation,new Vector3(2*(swap?hz:hx),2*hy,2*(swap?hx:hz)));
}
