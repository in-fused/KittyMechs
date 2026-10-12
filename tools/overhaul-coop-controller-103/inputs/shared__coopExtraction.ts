import {ACTOR_HEIGHT} from './config';
import {distance} from './math';
import type {ActorState,Vec3} from './types';

export const OBJECTIVE_REACH=4.5;
export function withinObjectiveReach(actor:Pick<ActorState,'position'>,position:Vec3):boolean {
  return distance(actor.position,{...position,y:position.y+ACTOR_HEIGHT})<OBJECTIVE_REACH;
}
/** The connected authority roster is the squad; bots never count toward extraction. */
export function coopExtractionWait(actors:readonly Pick<ActorState,'bot'|'hp'|'downed'|'position'>[],position:Vec3):'revive'|'assemble'|null {
  const pilots=actors.filter(a=>!a.bot);
  if(!pilots.length)return 'assemble';
  if(pilots.some(a=>a.hp<=0||!!a.downed))return 'revive';
  return pilots.every(a=>withinObjectiveReach(a,position))?null:'assemble';
}
