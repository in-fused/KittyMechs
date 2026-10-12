import {inputCounter,MAX_INPUT_COUNTER} from '../../shared/inputProtocol';

/** One outstanding press; repeats/second presses DROP until ACK or cancel.
 * IDs are scoped to an authority-issued life epoch, not render pose time. */
export interface JumpOutbox {owner:string;epoch:number;processed:number;issued:number;pending:number;cancel:number;sentAt:number;}
export const JUMP_SEND_TIMEOUT=1000;
export function createJumpOutbox():JumpOutbox {return {owner:'',epoch:0,processed:0,issued:0,pending:0,cancel:0,sentAt:-1};}
export function syncJumpOutbox(out:JumpOutbox,owner:string,epoch:number,processed:number,alive:boolean):void {
  if(!inputCounter(epoch)||epoch===0||!inputCounter(processed)||(owner===out.owner&&epoch<out.epoch))return;
  if(owner!==out.owner||epoch!==out.epoch){out.owner=owner;out.epoch=epoch;out.processed=out.issued=out.cancel=processed;out.pending=0;out.sentAt=-1;}
  else {if(processed>out.issued||processed<out.processed)return;out.processed=processed;if(out.pending>0&&processed>=out.pending){out.pending=0;out.sentAt=-1;}}
  if(!alive)cancelJumpOutbox(out);
}
export function pressJump(out:JumpOutbox):boolean {
  if(!out.owner||out.epoch===0||out.pending!==0||out.issued>=MAX_INPUT_COUNTER)return false;
  out.pending=++out.issued;out.sentAt=-1;return true;
}
export function cancelJumpOutbox(out:JumpOutbox):void {out.cancel=Math.max(out.cancel,out.issued);out.pending=0;out.sentAt=-1;}
export function retireJumpOutbox(out:JumpOutbox):void {out.owner='';out.epoch=0;out.processed=out.issued=out.pending=out.cancel=0;out.sentAt=-1;}
/** Starts at the first real send/owned-step attempt, not at DOM press time. */
export function sentJump(out:JumpOutbox,now:number):void {if(out.pending>0&&out.sentAt<0)out.sentAt=now;}
export function expireJump(out:JumpOutbox,now:number):void {if(out.sentAt>=0&&now-out.sentAt>=JUMP_SEND_TIMEOUT)cancelJumpOutbox(out);}
