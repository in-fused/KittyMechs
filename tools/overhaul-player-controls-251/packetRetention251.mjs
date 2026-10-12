/** Retain an observed action receipt even after the diagnostic sent ring evicts
 * it. This is delivery evidence only: released neutral and native ACK remain
 * separate requirements, and actor/generation/life must stay unchanged. */
export function retainPacket251(retained,rows,pre,mark,matches){
 if(retained)return retained;
 return rows.find(s=>s.at>=mark&&s.localId===pre.actor.id&&s.generation===pre.localReadiness.generation&&s.input.jumpEpoch===pre.actor.jumpEpoch&&matches(s.input))??null;
}
