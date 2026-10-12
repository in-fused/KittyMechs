/** Detached opt-in transport evidence; observing packets never admits them. */
export interface NetworkReceipt {
  packets:number;snapshots:number;admitted:number;schemaRejected:number;localAckRejected:number;decodeFailures:number;
  lastType:string|null;lastBytes:number;lastReceivedAt:number|null;rawTick:number|null;rawTime:number|null;
  admittedTick:number|null;admittedTime:number|null;lastAdmittedAt:number|null;firstFailure:string|null;
  close:{code:number;reason:string;wasClean:boolean;at:number}|null;
}
let receipt:NetworkReceipt|null=null;
export function beginNetworkReceipt(enabled:boolean){receipt=enabled?{packets:0,snapshots:0,admitted:0,schemaRejected:0,localAckRejected:0,decodeFailures:0,lastType:null,lastBytes:0,lastReceivedAt:null,rawTick:null,rawTime:null,admittedTick:null,admittedTime:null,lastAdmittedAt:null,firstFailure:null,close:null}:null;}
export function noteNetworkPacket(value:unknown,bytes:number,at:number){
  if(!receipt)return;receipt.packets++;receipt.lastBytes=bytes;receipt.lastReceivedAt=at;
  const message=value as {type?:unknown;state?:{tick?:unknown;time?:unknown}}|null;
  receipt.lastType=typeof message?.type==='string'?message.type:null;
  if(message?.type==='snapshot'){receipt.snapshots++;receipt.rawTick=typeof message.state?.tick==='number'&&Number.isFinite(message.state.tick)?message.state.tick:null;receipt.rawTime=typeof message.state?.time==='number'&&Number.isFinite(message.state.time)?message.state.time:null;}
}
export function noteNetworkAdmission(stage:'admitted'|'schema'|'local-ack',tick:number,time:number,at:number){
  if(!receipt)return;if(stage==='schema'){receipt.schemaRejected++;return;}if(stage==='local-ack'){receipt.localAckRejected++;return;}
  receipt.admitted++;receipt.admittedTick=tick;receipt.admittedTime=time;receipt.lastAdmittedAt=at;
}
export function noteNetworkDecodeFailure(){if(receipt)receipt.decodeFailures++;}
export function noteNetworkFailure(message:string){if(receipt)receipt.firstFailure??=message;}
export function noteNetworkClose(event:Pick<CloseEvent,'code'|'reason'|'wasClean'>,at:number){if(receipt)receipt.close={code:event.code,reason:event.reason,wasClean:event.wasClean,at};}
export function readNetworkReceipt():NetworkReceipt|null{return receipt?{...receipt,close:receipt.close?{...receipt.close}:null}:null;}
export function networkCloseMessage(event:Pick<CloseEvent,'code'|'reason'>){
  const cause=event.reason?` (${event.code}: ${event.reason})`:event.code===1000?'':` (code ${event.code})`;
  return `Connection to the arena ended${cause}. Return to hangar to reconnect.`;
}
