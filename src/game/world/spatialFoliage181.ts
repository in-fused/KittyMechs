import type {PropDescriptor} from '../../../shared/world';
/** Half of an unchanged64m streamed tile. Every source prop belongs to exactly
 * one batch; Three tests its current bounds independently for every pass.
 * Detail selection and native solid-tree ownership remain outside this helper. */
export const FOLIAGE_CELL181=32;
export interface FoliageCell181 {key:string;indices:number[];}
export function spatialFoliage181(props:readonly Pick<PropDescriptor,'x'|'z'>[]):FoliageCell181[]{
 const cells=new Map<string,number[]>();
 for(let i=0;i<props.length;i++){const p=props[i],key=`${Math.floor(p.x/FOLIAGE_CELL181)},${Math.floor(p.z/FOLIAGE_CELL181)}`,indices=cells.get(key)??[];indices.push(i);cells.set(key,indices);}
 return [...cells].map(([key,indices])=>({key,indices}));
}
