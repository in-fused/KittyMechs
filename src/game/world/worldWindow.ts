import {getMap} from '../../../shared/maps';
import {renderChunkKeys} from '../../../shared/streaming';
import {chunkAt} from '../../../shared/world';
import type {ActorState} from '../../../shared/types';

/** Network play already has an accepted snapshot before scene entry. A late
 * join starts at its current pilot/checkpoint, rather than rebuilding spawn. */
export function initialWorldWindow(seed:number,radius:number,localId:string,actors:readonly Pick<ActorState,'id'|'position'|'velocity'>[]=[]){
  const actor=actors.find(a=>a.id===localId),position=actor?.position??getMap(seed).spawn,velocity=actor?.velocity??{x:0,y:0,z:0};
  return {center:`${chunkAt(position.x)},${chunkAt(position.z)}`,visibleKeys:renderChunkKeys(position,velocity,radius).join('|')};
}
