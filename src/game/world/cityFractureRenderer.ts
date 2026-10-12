import {BatchedMesh,Color,Group,Mesh,MeshStandardMaterial,Object3D,RepeatWrapping,type Texture} from 'three';
import type {CityDistrict} from '../../../shared/cityDistrict';
import {cityFractureAssetFor,type CityFractureAsset} from '../../../shared/cityFracture';
import type {CityRubbleState} from '../../../shared/cityRubble';
import type {CityTextures} from '../rendering/cityTextures';
import {CITY_DEBRIS_LIMIT,sampleCityFragment,type CityFragment,type CityFragmentSurface} from './cityFragments';
import {buildCityFractureGeometry} from './cityFractureGeometry';

const surfaces:CityFragmentSurface[]=['brick','steel','concrete','panel','stone'];
const materialKeys=['map','normalMap','roughnessMap','metalnessMap','aoMap'] as const;
function surfaceFor(district:CityDistrict,cell:CityDistrict['blocks'][number]):CityFragmentSurface {
  const style=district.buildings.find(b=>b.id===cell.buildingId)?.style;
  return cell.id.includes(':panel-')&&style==='transit'?'panel':cell.id.includes(':panel-')&&style==='civic'?'stone':cell.material;
}
const geometryKey=(size:{x:number;y:number;z:number},piece:number,template:string)=>`${template}:${size.x},${size.y},${size.z}:${piece}`;

/** One scene owner; construction belongs to layout setup, including StrictMode
 * replay. Loaded source maps are never disposed by this owner. */
export class CityFractureRenderer {
  readonly group=new Group();
  private batches=new Map<CityFragmentSurface,{mesh:BatchedMesh;ids:number[];geometryIds:Map<string,number>}>();
  private materials:MeshStandardMaterial[]=[];
  private samplers=new Set<Texture>();
  private object=new Object3D();
  private physicalSources=new Map<string,{size:{x:number;y:number;z:number};surface:CityFragmentSurface;template:string}>();
  private disposed=false;
  constructor(district:CityDistrict,asset:CityFractureAsset,factory:Group,textures:CityTextures|null){
    for(const cell of district.structures.flatMap(s=>s.cells))this.physicalSources.set(cell.id,{size:{x:cell.halfExtents[0]*2,y:cell.halfExtents[1]*2,z:cell.halfExtents[2]*2},surface:surfaceFor(district,cell),template:cityFractureAssetFor(cell,asset).template});
    const originals=new Map<string,MeshStandardMaterial>();
    factory.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof MeshStandardMaterial)originals.set(material.name,material);});
    try{
      for(const surface of surfaces){
        const cells=district.structures.flatMap(s=>s.cells).filter(c=>surfaceFor(district,c)===surface);
        if(!cells.length)continue;
        const sourceName=surface==='steel'||surface==='panel'?'modular_factory_facade_garage':'modular_factory_facade_brick';
        const source=originals.get(sourceName);if(!source&&surface!=='concrete')throw Error(`Fracture material absent: ${sourceName}`);
        const material=surface==='concrete'?new MeshStandardMaterial({map:textures?.concrete??null,color:textures?'#ffffff':'#899187',roughness:.88}):source!.clone();this.materials.push(material);
        material.transparent=false;material.opacity=1;
        if(surface!=='concrete')for(const key of materialKeys){const map=material[key];if(map){const clone=map.clone();clone.wrapS=clone.wrapT=RepeatWrapping;this.samplers.add(clone);material[key]=clone;}}
        if(surface==='panel'){material.color.set('#9ebeb8');material.roughness=.48;}
        if(surface==='stone'){
          if(textures){material.map=textures.concrete;material.normalMap=material.roughnessMap=material.metalnessMap=material.aoMap=null;}
          material.color.set('#e2d8c1');material.roughness=.87;
        }
        const inner=new Color(surface==='brick'?'#9f8572':surface==='steel'||surface==='panel'?'#788689':'#a39b87');
        material.onBeforeCompile=shader=>{
          shader.uniforms.fractureInnerColor={value:inner};
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float fractureInterior;\nvarying float vFractureInterior;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFractureInterior = fractureInterior;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 fractureInnerColor;\nvarying float vFractureInterior;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, fractureInnerColor, vFractureInterior);').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = mix(normal, nonPerturbedNormal, vFractureInterior);');
        };
        material.customProgramCacheKey=()=>`city-fracture-v1-${surface}`;
        const sizes=new Map(cells.map(c=>{const size={x:c.halfExtents[0]*2,y:c.halfExtents[1]*2,z:c.halfExtents[2]*2},selected=cityFractureAssetFor(c,asset);return [geometryKey(size,0,selected.template),{size,selected}];}));
        const geometries=[...sizes.values()].flatMap(({size,selected})=>selected.pieces.map(piece=>({key:geometryKey(size,piece.id,selected.template),geometry:buildCityFractureGeometry(piece,size,surface==='brick'?2:4)})));
        let mesh:BatchedMesh|undefined;
        try{
          mesh=new BatchedMesh(CITY_DEBRIS_LIMIT,geometries.reduce((n,g)=>n+g.geometry.attributes.position.count,0),geometries.reduce((n,g)=>n+g.geometry.index!.count,0),material);
          mesh.frustumCulled=false;mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;mesh.visible=false;
          const geometryIds=new Map(geometries.map(g=>[g.key,mesh!.addGeometry(g.geometry)]));
          const first=geometryIds.values().next().value!,ids=Array.from({length:CITY_DEBRIS_LIMIT},()=>{const id=mesh!.addInstance(first);mesh!.setVisibleAt(id,false);return id;});
          this.batches.set(surface,{mesh,ids,geometryIds});this.group.add(mesh);
        }catch(error){mesh?.dispose();throw error;}
        finally{for(const g of geometries)g.geometry.dispose();}
      }
    }catch(error){this.dispose();throw error;}
  }
  update(fragments:readonly CityFragment[],time:number):void {
    if(this.disposed)return;
    for(const [surface,batch] of this.batches){
      let count=0;
      for(const fragment of fragments){
        if(fragment.surface!==surface)continue;
        const sample=sampleCityFragment(fragment,time);if(!sample.visible)continue;
        const source=this.physicalSources.get(fragment.blockId);if(!source)continue;
        const geometry=batch.geometryIds.get(geometryKey(fragment.size,fragment.piece,source.template));if(geometry===undefined)continue;
        if(count>=CITY_DEBRIS_LIMIT)break;
        const id=batch.ids[count++];batch.mesh.setGeometryIdAt(id,geometry);batch.mesh.setVisibleAt(id,true);
        this.object.position.copy(sample.position);this.object.quaternion.set(sample.quaternion.x,sample.quaternion.y,sample.quaternion.z,sample.quaternion.w);
        this.object.scale.setScalar(sample.size.x/fragment.size.x);this.object.updateMatrix();batch.mesh.setMatrixAt(id,this.object.matrix);
      }
      for(let i=count;i<batch.ids.length;i++)batch.mesh.setVisibleAt(batch.ids[i],false);
      batch.mesh.visible=count>0;
    }
  }
  diagnostics(){return {batches:this.batches.size,visible:[...this.batches.values()].reduce((n,b)=>n+b.ids.filter(i=>b.mesh.getVisibleAt(i)).length,0),geometries:[...this.batches.values()].reduce((n,b)=>n+b.geometryIds.size,0),disposed:this.disposed};}
  updateRubble(rubble:readonly CityRubbleState[],time:number):void {
    if(this.disposed)return;
    for(const [surface,batch] of this.batches){
      let count=0;
      for(const piece of rubble){
        const source=this.physicalSources.get(piece.blockId);
        if(!source||source.surface!==surface||time<piece.born||time>=piece.expires)continue;
        const geometry=batch.geometryIds.get(geometryKey(source.size,piece.piece,source.template));if(geometry===undefined||count>=CITY_DEBRIS_LIMIT)continue;
        const id=batch.ids[count++];batch.mesh.setGeometryIdAt(id,geometry);batch.mesh.setVisibleAt(id,true);
        this.object.position.copy(piece.position);this.object.quaternion.copy(piece.rotation);this.object.scale.setScalar(1);this.object.updateMatrix();batch.mesh.setMatrixAt(id,this.object.matrix);
      }
      for(let i=count;i<batch.ids.length;i++)batch.mesh.setVisibleAt(batch.ids[i],false);
      batch.mesh.visible=count>0;
    }
  }
  dispose():void {
    if(this.disposed)return;this.disposed=true;
    for(const batch of this.batches.values()){this.group.remove(batch.mesh);batch.mesh.dispose();}
    this.batches.clear();for(const material of this.materials)material.dispose();for(const texture of this.samplers)texture.dispose();this.materials=[];this.samplers.clear();
  }
}
