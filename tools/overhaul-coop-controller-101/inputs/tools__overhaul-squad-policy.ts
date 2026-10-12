import type {ActorState} from '../shared/types.ts';
export type SightEnemy=ActorState&{visible:boolean;fireClear:boolean};
export interface SquadView {actor:ActorState;enemies:SightEnemy[];time:number;}

/** An already-down ally is the reason for a rescue combat turn, not an abort.
 * New damage to a living ally still hands over that ordinary combat turn. */
export function squadCombatInterruption(ally:ActorState|undefined,began:number,now:number,allowDownedAlly=false):'teammate-downed'|'teammate-under-fire'|null{
  if(ally&&ally.hp<=0&&!allowDownedAlly)return 'teammate-downed';
  if(ally&&ally.hp>0&&now!==began&&ally.hurtAt>began)return 'teammate-under-fire';
  return null;
}

/** Same static-world sight reader as the visible HUD. Unknown or blocked LOS
 * cannot justify ordinary firing; patrol outside recent acquisition is not a
 * reason to stop the squad's route. Native impacts still decide actual contact. */
export function squadThreats(view:SquadView):SightEnemy[]{
  return view.enemies.filter(e=>e.hp>0&&e.visible===true&&e.fireClear===true&&
    (e.aiState!=='patrol'||e.windupUntil>view.time||view.time-e.fireAt<2)&&
    Math.hypot(e.position.x-view.actor.position.x,e.position.y-view.actor.position.y,e.position.z-view.actor.position.z)<32)
    .sort((a,b)=>Math.hypot(a.position.x-view.actor.position.x,a.position.z-view.actor.position.z)-Math.hypot(b.position.x-view.actor.position.x,b.position.z-view.actor.position.z));
}

/** Rescue is symmetric. Otherwise the threatened squad member gets the combat
 * turn, instead of a protected leader repeatedly firing through cover while
 * an unattended teammate dies. This chooses ordinary keyboard actions only. */
export function squadDecision(views:SquadView[]):{kind:'rescue';name:string}|{kind:'fight';name:string;enemy:string}|{kind:'move'}{
  const down=views.find(v=>v.actor.hp<=0&&v.actor.downed);
  if(down)return {kind:'rescue',name:down.actor.name};
  const candidates=views.filter(v=>v.actor.hp>0&&squadThreats(v).length>0);
  candidates.sort((a,b)=>b.actor.hurtAt-a.actor.hurtAt||a.actor.hp/a.actor.maxHp-b.actor.hp/b.actor.maxHp);
  const next=candidates[0];return next?{kind:'fight',name:next.actor.name,enemy:squadThreats(next)[0].id}:{kind:'move'};
}
