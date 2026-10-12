import type {ActorState,Vec3} from './types';

export type PairStyle='quadruped'|'upright'|'uprightAgainstQuad';
export type PairOpponent='pounce'|'scout'|'mortar'|'anchor';
export type PairPhase='impact'|'pin'|'release';
export interface PairedAction {
  id:string;other:string;life:number;otherLife:number;role:'attacker'|'victim';
  phase:PairPhase;startedAt:number;phaseAt:number;endsAt:number;yaw:number;
  style:PairStyle;opponent:PairOpponent;anchor:Vec3;offset:number;escape:number;combo:number;comboAt:number;outcome?:'completed'|'escaped';
}
export const PAIR_TIMING={impact:.28,pin:.8,release:.35,comboContact:.13,escapeWindow:.12,escapeNeeded:.22,immunity:1.2} as const;
export const PAIR_PROFILE={
  pounce:{duration:.8,comboDamage:12,escapeRate:1,reach:2.56},
  bastion:{duration:1,comboDamage:18,escapeRate:.8,reach:3.0},
  lynx:{duration:.5,comboDamage:9,escapeRate:1.3,reach:2.25},
  caracal:{duration:.65,comboDamage:8,escapeRate:1.1,reach:2.56},
} as const;

export function pairCapability(attacker:ActorState,victim:ActorState):{style:PairStyle;opponent:PairOpponent;spacing:number}|null {
  if(attacker.bot||attacker.chassis!=='pounce')return null;
  if(!victim.bot){if(victim.chassis!=='pounce'||victim.stance!==attacker.stance)return null;return {style:attacker.stance,opponent:'pounce',spacing:3.5};}
  // V3 has a measured retarget only for the actual retained Scout quadruped.
  // Missing choreography remains the ordinary admitted strike path.
  if(victim.stance!=='quadruped'||victim.role!=='scout'||attacker.stance!=='quadruped')return null;
  return {style:'quadruped',opponent:'scout',spacing:3.2};
}
export function pairClipName(pair:PairedAction,time=pair.phaseAt):string {
  const prefix=pair.style==='upright'?'FelineUprightPair':pair.style==='uprightAgainstQuad'?'FelineUprightAgainstQuadPair':'FelinePair';
  const suffix=pair.opponent==='pounce'?'':pair.opponent[0].toUpperCase()+pair.opponent.slice(1);
  const beat=pair.phase==='pin'&&pair.comboAt>=pair.phaseAt&&time>=pair.comboAt&&time-pair.comboAt<.24?'Claw':pair.phase==='release'&&pair.outcome==='escaped'?'Escape':pair.phase[0].toUpperCase()+pair.phase.slice(1);
  return prefix+beat+pair.role[0].toUpperCase()+pair.role.slice(1)+suffix;
}
/** Called only after an admitted physical swept contact. It does not discover
 * proximity hits, move actors, or bypass the authority's damage/team rules. */
export function createPair(attacker:ActorState,victim:ActorState,time:number,normal:Vec3,contactId:number):[PairedAction,PairedAction]|null {
  if(attacker.pair||victim.pair||attacker.hp<=0||victim.hp<=0||attacker.climb||victim.climb||!victim.grounded||victim.shieldUntil>time||
    (victim.pairImmuneUntil??0)>time||!Number.isFinite(time)||!Number.isFinite(normal.x)||!Number.isFinite(normal.z))return null;
  const capability=pairCapability(attacker,victim),separation=Math.hypot(attacker.position.x-victim.position.x,attacker.position.z-victim.position.z);
  if(!capability||Math.abs(separation-capability.spacing)>.06||Math.abs(attacker.position.y-victim.position.y)>.35)return null;
  const length=Math.hypot(normal.x,normal.z);if(length<.5)return null;
  const yaw=Math.atan2(normal.x,normal.z),anchor={...victim.position},id=`${attacker.id}:${attacker.jumpEpoch}:${contactId}`;
  const common={id,style:capability.style,opponent:capability.opponent,phase:'impact' as const,startedAt:time,phaseAt:time,endsAt:time+PAIR_TIMING.impact,yaw,anchor,escape:0,combo:0,comboAt:-100};
  // Positive local Z is behind the attacker-facing direction. The simulation
  // retains both accepted roots and constrains motion; clips contain no root travel.
  return [{...common,anchor:{...anchor},other:victim.id,life:attacker.jumpEpoch,otherLife:victim.jumpEpoch,role:'attacker',offset:separation},
          {...common,anchor:{...anchor},other:attacker.id,life:victim.jumpEpoch,otherLife:attacker.jumpEpoch,role:'victim',offset:0}];
}

export function validPair(actor:ActorState,other:ActorState|undefined):boolean {
  const pair=actor.pair,opposite=other?.pair;
  const attacker=pair?.role==='attacker'?actor:other,victim=pair?.role==='attacker'?other:actor;
  const capability=attacker&&victim?pairCapability(attacker,victim):null;
  return !!(pair&&other&&opposite&&pair.id===opposite.id&&pair.other===other.id&&opposite.other===actor.id&&pair.role!==opposite.role&&pair.style===opposite.style&&pair.opponent===opposite.opponent&&pair.comboAt===opposite.comboAt&&pair.outcome===opposite.outcome&&
    pair.phase===opposite.phase&&pair.startedAt===opposite.startedAt&&pair.phaseAt===opposite.phaseAt&&pair.endsAt===opposite.endsAt&&pair.combo===opposite.combo&&pair.escape===opposite.escape&&pair.yaw===opposite.yaw&&
    pair.anchor.x===opposite.anchor.x&&pair.anchor.y===opposite.anchor.y&&pair.anchor.z===opposite.anchor.z&&
    capability&&pair.style===capability.style&&pair.opponent===capability.opponent&&
    pair.life===actor.jumpEpoch&&pair.otherLife===other.jumpEpoch&&opposite.life===other.jumpEpoch&&opposite.otherLife===actor.jumpEpoch&&actor.hp>0&&other.hp>0&&!actor.climb&&!other.climb);
}

/** Strict finite network schema, then reciprocal ownership is checked after
 * the entire actor roster is admitted. Late joining needs no local action history. */
export function parsePair(value:unknown,life:number,time:number):PairedAction|null|undefined {
  if(value==null)return null;
  if(typeof value!=='object')return undefined;
  const p=value as PairedAction,a=p.anchor;
  if(typeof p.id!=='string'||p.id.length>256||typeof p.other!=='string'||!p.other||p.other.length>128||p.life!==life||!Number.isSafeInteger(p.otherLife)||p.otherLife<1||
    !['quadruped','upright','uprightAgainstQuad'].includes(p.style)||!['pounce','scout','mortar','anchor'].includes(p.opponent)||!['attacker','victim'].includes(p.role)||!['impact','pin','release'].includes(p.phase)||!a||![a.x,a.y,a.z,p.startedAt,p.phaseAt,p.endsAt,p.yaw,p.offset,p.escape,p.combo,p.comboAt].every(Number.isFinite)||
    (p.outcome!==undefined&&(p.phase!=='release'||!['completed','escaped'].includes(p.outcome)))||(p.combo===0?p.comboAt!==-100:p.comboAt<p.startedAt||p.comboAt>time)||(p.phase==='pin'&&p.combo>0&&p.comboAt<p.phaseAt)||
    p.startedAt<0||p.startedAt>p.phaseAt||p.phaseAt>time||p.endsAt<p.phaseAt||p.endsAt>time+2||p.offset<0||p.offset>8||p.escape<0||p.escape>2||!Number.isInteger(p.combo)||p.combo<0||p.combo>3||Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(a.z))>10000)return undefined;
  return {...p,anchor:{...a}};
}
