import type {ActorState} from '../../../shared/types';
import type {PracticalMotionDiagnostic001} from './practicalFelineMotionOwner001';
export const PRACTICAL_MOTION_EVENT001='kitty-practical-motion-001';
const diagnostics=new Map<string,PracticalMotionDiagnostic001>();
let enabled=false;let selection:Set<string>|null=null;
const rootLocal=()=>typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
export function configurePracticalMotion001(value:{enabled:boolean;actors?:string[]}){
  if(!rootLocal())throw new Error('Practical motion001 is a root-local pending candidate.');
  enabled=value.enabled;selection=value.actors?new Set(value.actors):null;window.dispatchEvent(new Event(PRACTICAL_MOTION_EVENT001));
}
export function practicalMotionSelected001(actor:Pick<ActorState,'id'|'bot'>){return rootLocal()&&enabled&&!actor.bot&&(!selection||selection.has(actor.id));}
export function registerPracticalMotion001(id:string,d:PracticalMotionDiagnostic001){diagnostics.set(id,d);return()=>{if(diagnostics.get(id)===d)diagnostics.delete(id);};}
export function readPracticalMotion001(){return JSON.parse(JSON.stringify({enabled,actors:selection?[...selection]:null,diagnostics:[...diagnostics.values()]})) as {enabled:boolean;actors:string[]|null;diagnostics:PracticalMotionDiagnostic001[]};}
declare global {interface Window {kittyPracticalMotion001?:{configure:typeof configurePracticalMotion001;read:typeof readPracticalMotion001};}}
if(typeof window!=='undefined'&&rootLocal())window.kittyPracticalMotion001={configure:configurePracticalMotion001,read:readPracticalMotion001};
