import {BufferAttribute,BufferGeometry,Matrix4,Vector3} from 'three';
import type {CityBlock,CityDistrict} from '../../../shared/cityDistrict';
import {cityBlockActive} from '../../../shared/cityDistrict';
import type {StructureState} from '../../../shared/types';
import {cityAtlasRect} from './cityAtlas';

export type CitySurface='brick'|'steel'|'concrete'|'window'|'trim'|'road'|'marking'|'sign'|'panel'|'stone';
interface BoxPart {id:string;position:[number,number,number];halfExtents:[number,number,number];yaw:number;surface:CitySurface;structureId?:string;cellId?:number;ownerId?:string;atlasSlot?:number;}
interface Range {block:CityBlock;start:number;count:number;indices:number[];}
export interface CityBatch {surface:CitySurface;geometry:BufferGeometry;ranges:Range[];}

/** Meter-scale UVs and one material batch across the district, including
 * fracture cells. Visible masks change indexed faces, never a hidden wall. */
export function buildCityGeometry(district:CityDistrict,packedAtlases=false):CityBatch[]{
  const buildingById=new Map(district.buildings.map(b=>[b.id,b]));
  const blockById=new Map(district.blocks.map(b=>[b.id,b]));
  const parts:BoxPart[]=district.blocks.filter(b=>b.part!=='fixture').map(b=>({...b,surface:b.id.includes(':panel-')&&buildingById.get(b.buildingId)?.style==='transit'?'panel':b.id.includes(':panel-')&&buildingById.get(b.buildingId)?.style==='civic'?'stone':b.material}));
  const box=(id:string,surface:CitySurface,position:BoxPart['position'],halfExtents:BoxPart['halfExtents'],yaw=0,ownerId?:string,atlasSlot?:number)=>parts.push({id,surface,position,halfExtents,yaw,ownerId,atlasSlot});
  for(const building of district.buildings){
    const {x,y,z}=building.position,h=building.height,w=building.width/2,d=building.depth/2;
    if(building.id.includes(':extension-')){
      // Every attached detail belongs to one fracture cell. A blown facade
      // takes its glazing/rims with it instead of leaving floating decoration.
      for(const cell of district.blocks.filter(b=>b.buildingId===building.id&&b.id.includes(':panel-'))){
        const anchor=building.anchors.find(a=>a.id===cell.anchorId)!,normal=anchor.normal;
        const alongX=Math.abs(normal.z)>.5,[cx,cy,cz]=cell.position,[hx,hy,hz]=cell.halfExtents;
        const rows=Math.max(1,Math.floor(hy*2/2.7));
        for(let level=0;level<rows;level++){
          const wy=cy-hy+(level+.5)*hy*2/rows;
          const length=building.style==='transit'?1.85:building.style==='civic'?.65:1.15;
          const wh=building.style==='civic'?Math.min(1.15,hy*.65):.7;
          const wx=cx+normal.x*(hx+.001),wz=cz+normal.z*(hz+.001);
          const windowId=`${cell.id}:window-${level}`;
          box(windowId,'window',[wx,wy,wz],alongX?[length,wh,.001]:[.001,wh,length],0,cell.id,building.style==='residential'?1+((cell.cellId??0)+level)%4:0);
          for(const side of [-1,1])box(`${windowId}:rim-${side}`,'trim',[wx+(alongX?side*(length+.035):0),wy,wz+(alongX?0:side*(length+.035))],alongX?[.035,wh+.035,.0015]:[.0015,wh+.035,.035],0,cell.id);
          box(`${windowId}:sill`,'trim',[wx,wy-wh-.035,wz],alongX?[length+.07,.035,.0015]:[.0015,.035,length+.07],0,cell.id);
          if(building.style==='residential')box(`${windowId}:mullion`,'trim',[wx,wy,wz],alongX?[.025,wh,.0015]:[.0015,wh,.025],0,cell.id);
        }
      }
      const signCell=district.blocks.find(b=>b.buildingId===building.id&&b.id.endsWith(':panel-west-1'))!;
      const slot=building.style==='transit'?4:building.style==='works'?2:1;
      box(`${building.id}:district-sign`,'sign',[signCell.position[0]-.151,y+3.3,signCell.position[2]],[.001,1.05,1.05],0,signCell.id,slot);
    }else{
    // Shallow attached trim stays inside the wall/deck proxy; it is not cover.
    for(const side of [-1,1]){
      box(`${building.id}:eave-${side}`,'trim',[x,y+h-.15,z+side*(d-.04)],[w-.05,.10,.035]);
      box(`${building.id}:corner-${side}`,'trim',[x-w+.04,y+h/2,z+side*(d-.08)],[.035,h/2-.12,.065]);
      box(`${building.id}:corner-east-${side}`,'trim',[x+w-.04,y+h/2,z+side*(d-.08)],[.035,h/2-.12,.065]);
    }
    const front=x-building.anchor.normal.x*w,outer=-building.anchor.normal.x;
    for(const side of [-1,1])for(let level=0;level<(h>9?3:2);level++)for(let column=0;column<4;column++){
      const wx=x-w+3+column*4.65,wy=y+2.1+level*2.75,wz=z+side*(d+.001);
      box(`${building.id}:window-${side}-${level}-${column}`,'window',[wx,wy,wz],[1.15,.70,.001]);
      for(const frame of [-1,1])box(`${building.id}:window-rim-${side}-${level}-${column}-${frame}`,'trim',[wx+frame*1.18,wy,wz],[.035,.74,.0015]);
      box(`${building.id}:window-sill-${side}-${level}-${column}`,'trim',[wx,wy-.73,wz],[1.215,.035,.0015]);
      box(`${building.id}:window-mullion-${side}-${level}-${column}`,'trim',[wx,wy,wz],[.025,.70,.0015]);
    }
    // No signage, glass or trim crosses a breakable bank: every hole is real.
    if(building.facade!=='panel-bank'){
      box(`${building.id}:loading-door`,'steel',[front+outer*.001,y+1.55,z],[.001,1.55,2.2]);
      for(let rib=0;rib<9;rib++)box(`${building.id}:door-rib-${rib}`,'trim',[front+outer*.002,y+.18+rib*.34,z],[.001,.018,2.2]);
      box(`${building.id}:works-sign`,'sign',[front+outer*.003,y+4.55,z],[.001,.58,2.7]);
    }
    }
    // Details are segmented with their exact owning roof, so a dependent sector
    // cannot leave a floating drain or seam over its new physical hole.
    for(const deck of district.blocks.filter(b=>b.buildingId===building.id&&b.part==='deck')){
      const [dx,dy,dz]=deck.position,[dw,dh,dd]=deck.halfExtents;
      for(const side of [-1,1])box(`${deck.id}:drain-${side}`,'trim',[dx,dy+dh+.001,dz+side*(dd-.25)],[dw-.25,.001,.06],deck.yaw,deck.id);
      for(let seam=-dw+.3;seam<dw-.3;seam+=3)box(`${deck.id}:seam-${seam}`,'trim',[dx+seam,dy+dh+.001,dz],[.014,.001,dd-.18],deck.yaw,deck.id);
    }
  }
  for(const street of district.streets){
    const {x,y,z}=street.center,hx=street.halfExtents.x,hz=street.halfExtents.z;
    // Canonical roads and lane paint already come from buildRoadGeometry;
    // adding a second coplanar road here would fight its shared graded surface.
    const c=Math.cos(street.yaw),s=Math.sin(street.yaw);
    for(const side of [-1,1]){
      const offset=side*(hx+.75);
      box(`${street.id}:sidewalk-${side}`,'concrete',[x+c*offset,y+.015,z-s*offset],[.75,.002,hz],street.yaw);
      const gutter=side*(hx-.14);
      box(`${street.id}:gutter-${side}`,'trim',[x+c*gutter,y+.018,z-s*gutter],[.065,.001,hz],street.yaw);
    }
  }
  const batches:CityBatch[]=[];
  for(const surface of ['brick','steel','concrete','window','trim','road','marking','sign','panel','stone'] as CitySurface[]){
    const selected=parts.filter(p=>p.surface===surface);if(!selected.length)continue;
    const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[],ranges:Range[]=[];
    const transform=new Matrix4(),point=new Vector3(),normal=new Vector3();
    for(const part of selected){
      transform.makeRotationY(part.yaw);transform.setPosition(...part.position);
      const start=indices.length,base=positions.length/3,[hx,hy,hz]=part.halfExtents;
      const faces:{corners:number[][];normal:number[];dimensions:number[]}[]=[
        {corners:[[hx,-hy,hz],[hx,-hy,-hz],[hx,hy,-hz],[hx,hy,hz]],normal:[1,0,0],dimensions:[hz*2,hy*2]},
        {corners:[[-hx,-hy,-hz],[-hx,-hy,hz],[-hx,hy,hz],[-hx,hy,-hz]],normal:[-1,0,0],dimensions:[hz*2,hy*2]},
        {corners:[[-hx,hy,hz],[hx,hy,hz],[hx,hy,-hz],[-hx,hy,-hz]],normal:[0,1,0],dimensions:[hx*2,hz*2]},
        {corners:[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,-hy,hz],[-hx,-hy,hz]],normal:[0,-1,0],dimensions:[hx*2,hz*2]},
        {corners:[[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]],normal:[0,0,1],dimensions:[hx*2,hy*2]},
        {corners:[[hx,-hy,-hz],[-hx,-hy,-hz],[-hx,hy,-hz],[hx,hy,-hz]],normal:[0,0,-1],dimensions:[hx*2,hy*2]},
      ];
      for(let face=0;face<faces.length;face++){
        const f=faces[face],unit=surface==='sign'||surface==='window'?null:surface==='brick'?2:4;
        const [u,v]=unit?f.dimensions.map(n=>n/unit):[1,1];normal.fromArray(f.normal).transformDirection(transform);
        const rect=packedAtlases&&(surface==='sign'||surface==='window')?cityAtlasRect(part.atlasSlot??0):null;
        for(let i=0;i<4;i++){point.fromArray(f.corners[i]).applyMatrix4(transform);positions.push(point.x,point.y,point.z);normals.push(normal.x,normal.y,normal.z);uvs.push(rect?(i===1||i===2?rect[2]:rect[0]):i===1||i===2?u:0,rect?(i>=2?rect[1]:rect[3]):i>=2?v:0);}
        const offset=base+face*4;indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
      }
      const block=blockById.get(part.ownerId??part.id);
      if(block)ranges.push({block,start,count:indices.length-start,indices:indices.slice(start)});
    }
    const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('normal',new BufferAttribute(new Float32Array(normals),3));geometry.setAttribute('uv',new BufferAttribute(new Float32Array(uvs),2));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    batches.push({surface,geometry,ranges});
  }
  return batches;
}
export function applyCityDamage(batches:readonly CityBatch[],states:readonly StructureState[]):void {
  for(const batch of batches){const index=batch.geometry.index;if(!index||!batch.ranges.length)continue;let changed=false;
    for(const range of batch.ranges){const active=cityBlockActive(range.block,states);for(let i=0;i<range.count;i++){const value=active?range.indices[i]:range.indices[0];if(index.getX(range.start+i)!==value){index.setX(range.start+i,value);changed=true;}}}
    if(changed)index.needsUpdate=true;
  }
}
/** Inspect actual index buffers, independently of the requested damage state. */
export function cityMeshDiagnostic(batches:readonly CityBatch[]){
  const active=new Set<string>(),removed=new Set<string>(),cells=new Set<string>();
  for(const batch of batches)for(const range of batch.ranges){const index=batch.geometry.index!,visible=range.indices.some((_,i)=>index.getX(range.start+i)!==index.getX(range.start));
    if(visible)active.add(range.block.id);else removed.add(range.block.id);if(visible&&range.block.structureId!==undefined)cells.add(range.block.id);
  }
  return {activeBlocks:active.size,removedBlocks:[...removed],cells:cells.size};
}
