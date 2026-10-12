import {breakableCover} from './traversal';
import type {CoverState} from './types';

export const MAX_AUTHORED_COVER=12;
const catalogs=new Map<number,ReadonlyMap<string,number>>();
function catalog(seed:number):ReadonlyMap<string,number>|null {
  if(![7734,1926,4107].includes(seed))return null;
  let result=catalogs.get(seed);if(!result){result=new Map(breakableCover(seed).slice(0,MAX_AUTHORED_COVER).map(p=>[p.id!,p.breakableHp!]));catalogs.set(seed,result);}return result;
}
/** Partial packets may omit known cover. Only canonical IDs and finite,
 * monotonically damaged state enter retained presentation or network history. */
export function parseCoverState(value:unknown,seed:number,time:number,previous:readonly CoverState[]=[]):CoverState[]|null {
  const expected=catalog(seed);if(!expected||!Number.isFinite(time)||time<0||!Array.isArray(value)||value.length>expected.size||previous.length>expected.size)return null;
  const read=(entry:unknown):CoverState|null=>{
    if(!entry||typeof entry!=='object')return null;const row=entry as Record<string,unknown>;
    if(typeof row.id!=='string'||!expected.has(row.id))return null;
    const maxHp=expected.get(row.id)!;
    if(row.maxHp!==maxHp||typeof row.hp!=='number'||!Number.isFinite(row.hp)||row.hp<0||row.hp>maxHp)return null;
    if(row.hp>0?row.destroyedAt!==null:typeof row.destroyedAt!=='number'||!Number.isFinite(row.destroyedAt)||row.destroyedAt<0||row.destroyedAt>time)return null;
    return {id:row.id,hp:row.hp,maxHp,destroyedAt:row.destroyedAt as number|null};
  };
  const before=new Map<string,CoverState>();
  for(const entry of previous){const row=read(entry);if(!row||before.has(row.id))return null;before.set(row.id,row);}
  const ids=new Set<string>();
  for(const entry of value){const row=read(entry);if(!row||ids.has(row.id))return null;
    const old=before.get(row.id);if(old&&(row.hp>old.hp||old.destroyedAt!==null&&row.destroyedAt!==old.destroyedAt))return null;
    ids.add(row.id);before.set(row.id,row);
  }return [...before.values()];
}
