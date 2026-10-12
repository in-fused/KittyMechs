import type {Vec3} from './types';
/** Existing public-planning clearance/arrival contract. These allowances reserve
 * placement space; they do not alter native hulls or ordinary movement. */
export const SQUAD_MARGIN168=1.1,SQUAD_ARRIVAL168=1.1;
export interface SquadOccupant168 {id:string;position:Vec3;radius:number;height:number;arrival:number;}
export interface SquadRequest168 {id:string;origin:Vec3;radius:number;height:number;slot:number;occupants:readonly SquadOccupant168[];}
export function squadPairDistance168(a:number,b:number,bArrival=SQUAD_ARRIVAL168){return a+b+SQUAD_MARGIN168+SQUAD_ARRIVAL168+bArrival;}
/** A metre lattice is a deterministic search topology, not a universal spacing
 * constant: its pitch derives from the actual requested/peer hull envelopes.
 * Native support/geometry certifies every candidate; no unchecked fallback. */
export function chooseSquadPlacement168(request:SquadRequest168,native:(x:number,z:number,envelopeRadius:number)=>Vec3|undefined):Vec3|undefined {
 const {id,origin,radius,height,slot,occupants}=request;
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(height)||height<=0||!Number.isSafeInteger(slot)||slot<0)throw Error('Invalid owned squad placement request');
 const peerRadius=Math.max(radius,...occupants.filter(a=>a.arrival>0).map(a=>a.radius)),pitch=Math.ceil(squadPairDistance168(radius,peerRadius)),preferred={x:slot%4,z:Math.floor(slot/4)},cells=[preferred];
 for(let ring=0;ring<=4;ring++)for(let x=-ring;x<=ring;x++)for(let z=-ring;z<=ring;z++){if(ring&&Math.abs(x)!==ring&&Math.abs(z)!==ring)continue;if(x===preferred.x&&z===preferred.z)continue;cells.push({x,z});}
 for(const cell of cells){const candidate=native(origin.x+cell.x*pitch,origin.z+cell.z*pitch,radius+SQUAD_MARGIN168+SQUAD_ARRIVAL168);if(!candidate)continue;
  let blocked=false;for(const other of occupants){if(other.id===id)continue;const bottom=candidate.y-1,otherBottom=other.position.y-1;if(bottom+height<=otherBottom||bottom>=otherBottom+other.height)continue;
   if(Math.hypot(candidate.x-other.position.x,candidate.z-other.position.z)<=squadPairDistance168(radius,other.radius,other.arrival)){blocked=true;break;}}
  if(!blocked)return candidate;
 }return undefined;
}
