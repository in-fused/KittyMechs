import {distance} from './math';
import type {ActorState,CoopMissionState,InputState,ObjectiveState,Vec3} from './types';

export const COOP_REVIVE={reach:4.5,seconds:3,healthFraction:.4,retryDelay:1} as const;
export interface CoopHooks {
  /** Return only authoritative inputs received within the normal input timeout. */
  input:(id:string)=>InputState|null;
  clearRay:(from:Vec3,to:Vec3)=>boolean;
  /** Restore the collider in-place only when the full hull fits; false keeps it downed. */
  restore:(target:ActorState,reviver:ActorState)=>boolean;
  /** Clear transient combat and collision-safely respawn the current human roster. */
  retry:()=>void;
}

/** Interaction priority is based on proximity even when the rescue ray is blocked.
 * This reserves E for rescue instead of accidentally capturing a relay/claiming a cache. */
export function coopReviveTarget(actors:readonly ActorState[],reviver:ActorState):ActorState|undefined {
  if(reviver.bot||reviver.hp<=0||reviver.downed)return;
  return actors.filter(a=>!a.bot&&a.id!==reviver.id&&a.hp<=0&&a.downed&&distance(a.position,reviver.position)<=COOP_REVIVE.reach)
    .sort((a,b)=>distance(a.position,reviver.position)-distance(b.position,reviver.position)||a.id.localeCompare(b.id))[0];
}

/** Pure authority lifecycle. Simulation owns physics, combat retirement and checkpoints.
 * No wall-clock timers, local-player assumptions, transport commands or implicit rebuilds. */
export class OverhaulCoop {
  readonly state:CoopMissionState={status:'active',failedAt:null,retryReadyAt:null,attempt:1};
  private held=new Map<string,boolean>();

  down(actor:ActorState,time:number):void {
    if(actor.bot||actor.downed)return;
    actor.hp=0;actor.downed={at:time,reviveProgress:0,reviverId:null};
    // Zero is finite in JSON. The simulation must branch on downed, never this deadline.
    actor.respawnAt=0;
  }

  /** Joining a failed attempt cannot silently revive it. Current roster participates in retry. */
  join(actor:ActorState,time:number):void {if(this.state.status==='failed')this.down(actor,time);}

  snapshot():CoopMissionState {return {...this.state};}

  advance(actors:readonly ActorState[],objectives:readonly ObjectiveState[],time:number,dt:number,hooks:CoopHooks):void {
    const players=actors.filter(a=>!a.bot);
    const inputs=new Map(players.map(a=>[a.id,hooks.input(a.id)]));
    const rising=players.filter(a=>inputs.get(a.id)?.interact&&!this.held.get(a.id));
    for(const id of this.held.keys())if(!players.some(a=>a.id===id))this.held.delete(id);
    // An expired packet cannot fabricate the release required for a new press.
    for(const actor of players){const input=inputs.get(actor.id);if(input)this.held.set(actor.id,input.interact);}

    if(this.state.status==='failed'){
      if(time<(this.state.retryReadyAt??Infinity)||!rising.length)return;
      for(const o of objectives)if(!o.complete)o.progress=0;
      for(const actor of players)actor.downed=null;
      this.state.status='active';this.state.failedAt=null;this.state.retryReadyAt=null;this.state.attempt++;
      hooks.retry();
      return;
    }
    // Spawn-pending (hp=0, no downed receipt) is distinct from accepted lethal damage.
    if(players.length&&players.every(a=>!!a.downed)){
      this.state.status='failed';this.state.failedAt=time;this.state.retryReadyAt=time+COOP_REVIVE.retryDelay;
      for(const actor of players)if(actor.downed){actor.downed.reviveProgress=0;actor.downed.reviverId=null;}
      return;
    }

    const candidates=new Map<string,ActorState[]>();
    for(const reviver of players){
      const input=inputs.get(reviver.id);
      if(!input?.interact||!reviver.grounded||reviver.climb||reviver.pair||reviver.strike||time-reviver.hurtAt<.3||Math.hypot(reviver.velocity.x,reviver.velocity.z)>1.5)continue;
      const target=coopReviveTarget(players,reviver);
      if(!target||!target.grounded||!hooks.clearRay({...reviver.position,y:reviver.position.y+.4},{...target.position,y:target.position.y+.4}))continue;
      const list=candidates.get(target.id)??[];list.push(reviver);candidates.set(target.id,list);
    }
    for(const target of players){
      const downed=target.downed;if(!downed)continue;
      const list=candidates.get(target.id)??[];
      // Keep one channel owner. Extra pilots never multiply revival speed.
      const reviver=list.find(a=>a.id===downed.reviverId)??list.sort((a,b)=>a.id.localeCompare(b.id))[0];
      if(!reviver){downed.reviveProgress=0;downed.reviverId=null;continue;}
      if(downed.reviverId!==reviver.id)downed.reviveProgress=0;
      downed.reviverId=reviver.id;
      downed.reviveProgress=Math.min(1,downed.reviveProgress+Math.max(0,Math.min(dt,.1))/COOP_REVIVE.seconds);
      if(downed.reviveProgress>=1-1e-9&&hooks.restore(target,reviver)){
        // Restart armor regeneration cooldown without counterfeiting a damage event.
        target.hp=Math.max(1,Math.round(target.maxHp*COOP_REVIVE.healthFraction));target.downed=null;target.diedAt=-100;target.hitAt=time;target.respawnAt=0;
      }
    }
  }
}
