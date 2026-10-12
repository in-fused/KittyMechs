import type {MechStance} from './types';
import {inputCounter} from './inputProtocol';

export interface StanceFeedback {
  requestSeq:number;inputSeq:number;life:number;target:MechStance;
  status:'accepted'|'blocked'|'deferred';
  reason:'accepted'|'headroom'|'ground'|'cooldown'|'climbing'|'paired'|'destroyed';
  time:number;blocker?:{handle:number;owner:string|null};
}
export function validStanceRequest(value:unknown,inputSeq:number):value is {seq:number;life:number} {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  return inputCounter(v.seq)&&Number(v.seq)<=inputSeq&&inputCounter(v.life)&&Number(v.life)>0;
}
/** Undefined rejects malformed data; null is the legacy/no-request state. */
export function parseStanceFeedback(value:unknown,life:number,lastInput:number,time:number,previous?:StanceFeedback|null):StanceFeedback|null|undefined {
  if(value==null)return previous?.life===life?undefined:null;
  if(typeof value!=='object')return undefined;
  const v=value as StanceFeedback;
  // Existing neutral stale-input samples report lastInput=0. The persistent
  // outcome still belongs to its original processed sequence/life.
  if(!inputCounter(lastInput)||!inputCounter(v.requestSeq)||v.requestSeq===0||!inputCounter(v.inputSeq)||v.inputSeq<v.requestSeq||lastInput!==0&&v.inputSeq>lastInput||v.life!==life||
    !['quadruped','upright'].includes(v.target)||!['accepted','blocked','deferred'].includes(v.status)||!Number.isFinite(v.time)||v.time<0||v.time>time||
    (v.status==='accepted'?v.reason!=='accepted':v.status==='blocked'?!['headroom','destroyed'].includes(v.reason):!['ground','cooldown','climbing','paired'].includes(v.reason)))return undefined;
  if(v.blocker!==undefined&&(v.status!=='blocked'||v.reason!=='headroom'||!v.blocker||!Number.isFinite(v.blocker.handle)||v.blocker.handle<0||v.blocker.owner!==null&&(typeof v.blocker.owner!=='string'||!v.blocker.owner.length||v.blocker.owner.length>256)))return undefined;
  if(previous?.life===life&&(v.requestSeq<previous.requestSeq||v.requestSeq===previous.requestSeq&&(v.target!==previous.target||v.inputSeq<previous.inputSeq||v.time<previous.time||previous.status!=='deferred'&&(v.status!==previous.status||v.reason!==previous.reason||v.time!==previous.time||v.inputSeq!==previous.inputSeq||v.blocker?.handle!==previous.blocker?.handle||v.blocker?.owner!==previous.blocker?.owner))))return undefined;
  return {...v,blocker:v.blocker?{...v.blocker}:undefined};
}
