import {distance,horizontalDistance} from './math';
import type {ActorState,EnemyRole,InputState,Vec3} from './types';

type EncounterActor=Pick<ActorState,'id'|'bot'|'role'|'hp'|'position'>;
export const OVERHAUL_ENCOUNTER={staging:{minX:-72,maxX:72,minZ:0,maxZ:72},telegraph:.9,maxPressure:3} as const;
const PROFILE:Record<EnemyRole,{detect:number;leash:number}>={scout:{detect:28,leash:20},anchor:{detect:24,leash:9},mortar:{detect:32,leash:14}};
export interface EncounterDecision {home:Vec3;target:string|null;telegraphUntil:number;}
interface Admission {target:string;telegraphUntil:number;}
export function inOverhaulStaging(p:Vec3):boolean {const s=OVERHAUL_ENCOUNTER.staging;return p.x>=s.minX&&p.x<=s.maxX&&p.z>=s.minZ&&p.z<=s.maxZ;}

/** Local home encounters replace global spawn-corridor aggregation. Selection
 * gates enemy intent only; accepted weapons and damage remain ordinary authority. */
export class OverhaulEncounter {
  private homes=new Map<string,{position:Vec3;role:EnemyRole}>();
  private engaged=new Set<string>();
  private admitted=new Map<string,Admission>();

  register(actor:EncounterActor):void {if(actor.bot)this.homes.set(actor.id,{position:{...actor.position},role:actor.role??'scout'});}
  engage(id:string):void {this.engaged.add(id);}
  reset():void {this.engaged.clear();this.admitted.clear();}
  decision(id:string):EncounterDecision|undefined {
    const home=this.homes.get(id);if(!home)return;
    const active=this.admitted.get(id);return {home:{...home.position},target:active?.target??null,telegraphUntil:active?.telegraphUntil??0};
  }
  advance(actors:readonly EncounterActor[],time:number,input:(id:string)=>Pick<InputState,'fire'|'rocket'|'strike'>|null,clearRay:(from:Vec3,to:Vec3)=>boolean):void {
    const live=new Map(actors.map(a=>[a.id,a]));
    for(const id of this.homes.keys())if(!live.has(id)){this.homes.delete(id);this.admitted.delete(id);}
    for(const id of this.engaged)if(!live.has(id))this.engaged.delete(id);
    const players=actors.filter(a=>!a.bot&&a.hp>0);
    for(const p of players){const command=input(p.id);if(!inOverhaulStaging(p.position)||command&&(command.fire||command.rocket||command.strike))this.engaged.add(p.id);}
    const candidates:{enemy:string;target:string;distance:number;retained:boolean}[]=[];
    for(const [id,home] of this.homes){
      const enemy=live.get(id);if(!enemy||enemy.hp<=0)continue;
      const profile=PROFILE[home.role];
      if(horizontalDistance(enemy.position,home.position)>profile.leash+1)continue;
      const visible=players.filter(p=>this.engaged.has(p.id)&&distance(p.position,enemy.position)<=profile.detect&&horizontalDistance(p.position,home.position)<=profile.leash+profile.detect*.5&&clearRay({...enemy.position,y:enemy.position.y+.65},{...p.position,y:p.position.y+.4}));
      visible.sort((a,b)=>distance(a.position,enemy.position)-distance(b.position,enemy.position)||a.id.localeCompare(b.id));
      const previous=this.admitted.get(id),target=visible.find(p=>p.id===previous?.target)??visible[0];
      if(target)candidates.push({enemy:id,target:target.id,distance:distance(target.position,enemy.position),retained:previous?.target===target.id});
    }
    // Keep admitted local threats stable rather than rotating enemies every tick.
    // Disconnection, downing, occlusion or leaving the sector immediately releases pressure.
    candidates.sort((a,b)=>Number(b.retained)-Number(a.retained)||a.distance-b.distance||a.enemy.localeCompare(b.enemy));
    const pressure=Math.min(OVERHAUL_ENCOUNTER.maxPressure,players.length),next=new Map<string,Admission>();
    for(const c of candidates.slice(0,pressure)){
      const previous=this.admitted.get(c.enemy);
      next.set(c.enemy,{target:c.target,telegraphUntil:previous?.target===c.target?previous.telegraphUntil:time+OVERHAUL_ENCOUNTER.telegraph});
    }
    this.admitted=next;
  }

  /** Apply before existing navigation path construction, including flank/retreat.
   * Homes are authored once, never retargeted to a different unfinished objective. */
  constrainGoal(id:string,goal:Vec3):Vec3 {
    const home=this.homes.get(id);if(!home)return {...goal};
    const radius=PROFILE[home.role].leash,d=horizontalDistance(home.position,goal),scale=d>radius?radius/d:1;
    const result={x:home.position.x+(goal.x-home.position.x)*scale,y:goal.y,z:home.position.z+(goal.z-home.position.z)*scale};
    if(!inOverhaulStaging(home.position))result.z=Math.min(result.z,-3);
    return result;
  }
}
