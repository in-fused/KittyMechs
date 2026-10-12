import {getOverhaulComponent} from '../../../shared/overhaulDistrict';
import type {CityBlock} from '../../../shared/cityDistrict';
export interface IdentityRhythmTile {module:string;x:number;y:number;sx:number;sy:number;}
/** Geometry stays inside its original canonical cell and damage owner. */
export function identityRhythmTiles(block:CityBlock,module:string):IdentityRhythmTile[]{
 const component=getOverhaulComponent(block);
 if(component?.kind!=='facade')return [{module,x:0,y:0,sx:1,sy:1}];
 const side=component.side,swap=side==='west'||side==='east';
 const width=2*block.halfExtents[swap?2:0],height=2*block.halfExtents[1];
 const columns=Math.max(1,Math.round(width/3.8)),rows=Math.max(1,Math.round(height/3.2));
 const family=module.split('_')[0],ground=/facade-[a-z]+-0-\d+$/.test(block.id);
 if(!['loading','transit','residential','control'].includes(family))throw Error('Unrecognized facade family '+module);
 const tiles:IdentityRhythmTile[]=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)tiles.push({
  module:ground&&y===0?(x===0?module:family+'_ground'):family+'_upper',
  x:(x+.5)/columns-.5,y:(y+.5)/rows-.5,sx:1/columns,sy:1/rows,
 });
 return tiles;
}
