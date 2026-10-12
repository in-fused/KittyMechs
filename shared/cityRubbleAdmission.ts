import {cityDistrict} from './cityDistrict';
import {CITY_RUBBLE_LIFETIME,MAX_CITY_RUBBLE_BODIES,type CityRubbleState} from './cityRubble';
import type {StructureState} from './types';

export interface RubbleHistory {born:number;retired:boolean;}
/** Whole source components only. Sender arrays/vectors never become live state. */
export function parseCityRubble(value:unknown,seed:number,time:number,structures:readonly StructureState[],history:ReadonlyMap<string,RubbleHistory>=new Map()):CityRubbleState[]|null {
  if(!Array.isArray(value)||value.length>MAX_CITY_RUBBLE_BODIES)return null;
  const cells=new Map(cityDistrict(seed)?.structures.flatMap(s=>s.cells).map(c=>[c.id,c])??[]);
  const states=new Map(structures.map(s=>[s.id,s]));
  const groups=new Map<string,CityRubbleState[]>(),ids=new Set<string>(),result:CityRubbleState[]=[];
  for(const raw of value){
    if(!raw||typeof raw!=='object')return null;
    const r=raw as CityRubbleState,cell=cells.get(r.blockId),state=cell?.structureId?states.get(cell.structureId):undefined;
    if(!cell||cell.cellId===undefined||!state||state.hp[cell.cellId]!==0||!((state.brokenMask>>>cell.cellId)&1))return null;
    if(!Number.isInteger(r.piece)||r.piece<0||r.piece>=8||r.id!==`${r.blockId}:${r.piece}`||ids.has(r.id))return null;
    ids.add(r.id);
    if(!Number.isFinite(r.born)||r.born<0||r.born>time||!Number.isFinite(r.expires)||r.expires!==r.born+CITY_RUBBLE_LIFETIME||time>=r.expires)return null;
    const old=history.get(r.blockId);if(old&&(old.retired||old.born!==r.born))return null;
    if(!r.position||!r.rotation||!['x','y','z'].every(k=>typeof r.position[k as 'x']==='number'&&Number.isFinite(r.position[k as 'x'])&&Math.abs(r.position[k as 'x'])<10000))return null;
    const q=r.rotation;if(!['x','y','z','w'].every(k=>typeof q[k as 'x']==='number'&&Number.isFinite(q[k as 'x']))||Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)>.001)return null;
    const accepted={id:r.id,blockId:r.blockId,piece:r.piece,born:r.born,expires:r.expires,position:{...r.position},rotation:{...r.rotation}};
    result.push(accepted);const group=groups.get(r.blockId)??[];group.push(accepted);groups.set(r.blockId,group);
  }
  for(const group of groups.values())if(group.length!==8||group.some(r=>r.born!==group[0].born))return null;
  return result;
}
