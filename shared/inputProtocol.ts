/** Input compatibility is separate from the deterministic world layout. */
export const INPUT_PROTOCOL_VERSION=4 as const;
export const MAX_INPUT_COUNTER=1_000_000_000;
/** Omission keeps legacy weapon-pitch strike selection within protocol4. */
export function validStrikePitch(value:unknown):value is number|undefined {return value===undefined||typeof value==='number'&&Number.isFinite(value)&&value>=-1.3&&value<=1.3;}
export function inputCounter(value:unknown):value is number {return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=MAX_INPUT_COUNTER;}
export function jumpEnvelope(id:unknown,cancel:unknown,epoch:unknown,jump:unknown):boolean {
  return inputCounter(id)&&inputCounter(cancel)&&inputCounter(epoch)&&typeof jump==='boolean'&&
    (epoch>0||id===0&&cancel===0)&&jump===(id>0&&id>cancel);
}
