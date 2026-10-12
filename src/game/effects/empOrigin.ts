import type {CombatEvent,Vec3} from '../../../shared/types';
/** Paired authority events share actor and exact simulation time. Missing
 * source evidence hides a link instead of choosing another objective's mast. */
export function empOrigin(event:CombatEvent,events:readonly CombatEvent[]):Vec3|null {
  const pulse=events.find(e=>e.type==='area'&&e.effect==='emp'&&e.actor===event.actor&&e.at===event.at);
  return pulse&&[pulse.position.x,pulse.position.y,pulse.position.z].every(Number.isFinite)?pulse.position:null;
}
