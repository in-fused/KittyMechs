import type { ContactDiagnostic, ReadonlyContactDiagnostic } from '../game/entities/pawContact';

/** Detach one completed render/contact frame from the mutable pooled registry. */
export function copyContactDiagnostics(entries:Iterable<readonly [string,ReadonlyContactDiagnostic]>):(ContactDiagnostic&{id:string})[]{
  const rows:(ContactDiagnostic&{id:string})[]=[];
  for(const [id,value] of entries){
    if(rows.length>=64)break;
    rows.push({...value,id,position:{...value.position},climb:value.climb?{...value.climb,normal:{...value.climb.normal},contact:{...value.climb.contact}}:null,paws:value.paws.slice(0,4).map(paw=>({...paw}))});
  }
  return rows;
}
