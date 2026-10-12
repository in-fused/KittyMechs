import type {ActorState} from '../../../shared/types';
import {useGameStore} from '../../state/store';
import {runtime} from '../runtime';
import {readIdentity57Runtime005} from './identity57Runtime005Control';

export const FELINE_PROTOTYPE_EVENT008='kitty-feline-prototype-008';
const fallback=new Map<string,{generation:number;reason:unknown}>();

/** Unsupported source actions keep ordinary gameplay on the complete standard rig.
 * A fallback stays for this actor/round until the player explicitly restarts preview.
 * No native actor, collision, damage, input or animation source is changed here. */
export function publicFelineSelected008(actor:Pick<ActorState,'id'|'bot'|'chassis'>){
 return useGameStore.getState().settings.felinePrototype&&!actor.bot&&actor.chassis==='pounce'&&fallback.get(actor.id)?.generation!==runtime.generation;
}
export function fallbackFeline008(actor:string,reason:unknown){
 if(fallback.get(actor)?.generation===runtime.generation)return;
 fallback.set(actor,{generation:runtime.generation,reason});
 window.dispatchEvent(new Event(FELINE_PROTOTYPE_EVENT008));
}
export function resetFelineFallback008(){
 if(!fallback.size)return;
 fallback.clear();window.dispatchEvent(new Event(FELINE_PROTOTYPE_EVENT008));
}
export function readFelinePrototype008(){
 return {enabled:useGameStore.getState().settings.felinePrototype,generation:runtime.generation,
  fallbacks:[...fallback].filter(([,v])=>v.generation===runtime.generation).map(([actor,v])=>({actor,...v})),
  diagnostics:readIdentity57Runtime005().diagnostics};
}
declare global{interface Window{kittyFelinePrototype008?:{read:typeof readFelinePrototype008};}}
if(typeof window!=='undefined')window.kittyFelinePrototype008={read:readFelinePrototype008};
