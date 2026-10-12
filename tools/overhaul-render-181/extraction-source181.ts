import {Matrix4,Quaternion,Vector3} from 'three';
import type {CityBlock} from '../../shared/cityDistrict';
import {getOverhaulComponent} from '../../shared/overhaulDistrict';
export function moduleFor(block:CityBlock):string {
 const component=getOverhaulComponent(block);
 switch(component?.kind){
  case 'foundation':return 'foundation';
  case 'column':return 'column';
  case 'beam':return 'beam';
  case 'slab':return block.id.includes(':roof-')?'roof':'slab';
  case 'facade':{
   const family=component.usage==='works'?'freight':component.usage==='utility'?'utility':'transit';
   const match=block.id.match(/facade-[a-z]+-(\d+)-(\d+)$/),upper=match?.[1]!=='0',bay=Number(match?.[2]??0);
   return family+(upper?'_upper':bay===0?'_label':'_ground');
  }
  default:throw Error('Extraction039 component kind has no authored module: '+block.id);
 }
}
export function moduleYaw(block:CityBlock):number {
 const c=getOverhaulComponent(block);return c?.kind!=='facade'?0:c.side==='east'?Math.PI/2:c.side==='west'?-Math.PI/2:c.side==='north'?Math.PI:0;
}
export function rainlineExtractionArtMatrix(block:CityBlock):Matrix4 {
 const c=getOverhaulComponent(block),swap=c?.kind==='facade'&&(c.side==='west'||c.side==='east'),[x,y,z]=block.halfExtents;
 return new Matrix4().compose(new Vector3(...block.position),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),block.yaw+moduleYaw(block)),new Vector3(swap?z:x,y,swap?x:z));
}
