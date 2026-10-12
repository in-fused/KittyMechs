import type {CityBlock,CityDistrict} from './cityDistrict';
export const OVERHAUL_FRACTURE_VERSION='facade-quad-1' as const;
export const OVERHAUL_FRAGMENT_STRIDE=4;
export interface OverhaulFragment {piece:number;id:string;offset:[number,number,number];halfExtents:[number,number,number];canonicalOffset:[number,number,number];}
export const overhaulFragmentKey=(block:number,piece?:number)=>block*OVERHAUL_FRAGMENT_STRIDE+(piece??0);
export function overhaulFragmentRecipe(block:CityBlock):readonly OverhaulFragment[] {
  if(!/:facade-(west|east|north|south)-\d+-\d+$/.test(block.id))return[{piece:0,id:block.id,offset:[0,0,0],halfExtents:[...block.halfExtents],canonicalOffset:[0,0,0]}];
  const horizontal=block.halfExtents[0]>block.halfExtents[2]?0:2,result:OverhaulFragment[]=[];
  for(let row=0;row<2;row++)for(let column=0;column<2;column++){
    const offset:[number,number,number]=[0,(row?1:-1)*block.halfExtents[1]/2,0];offset[horizontal]=(column?1:-1)*block.halfExtents[horizontal]/2;
    const halfExtents:[number,number,number]=[...block.halfExtents];halfExtents[horizontal]/=2;halfExtents[1]/=2;
    const reversed=/:facade-(east|north)-/.test(block.id),canonicalColumn=reversed?1-column:column;
    const piece=row*2+column;result.push({piece,id:`${block.id}:fracture:${piece}`,offset,halfExtents,canonicalOffset:[(canonicalColumn?1:-1)*.25,(row?1:-1)*.25,0]});
  }return result;
}
export function overhaulFragmentBlock(source:CityBlock,piece:number):CityBlock {
  const fragment=overhaulFragmentRecipe(source)[piece];if(!fragment)throw Error('Unknown source fracture piece');
  const [x,y,z]=fragment.offset,c=Math.cos(source.yaw),s=Math.sin(source.yaw);
  return{...source,id:fragment.id,halfExtents:[...fragment.halfExtents],position:[source.position[0]+x*c+z*s,source.position[1]+y,source.position[2]-x*s+z*c]};
}
export function overhaulFractureBudget(district:CityDistrict|null):number{return district?.blocks.reduce((n,b)=>n+overhaulFragmentRecipe(b).length,0)??0;}
