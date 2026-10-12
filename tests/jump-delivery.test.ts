import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState,type InputState} from '../shared/types';
import {INPUT_PROTOCOL_VERSION,MAX_INPUT_COUNTER} from '../shared/inputProtocol';
import {parseInput,parseJoin} from '../shared/protocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {cancelJumpOutbox,createJumpOutbox,expireJump,pressJump,sentJump,syncJumpOutbox} from '../src/game/jumpOutbox';
beforeAll(async()=>{await RAPIER.init();});
function run(f:(s:Simulation,a:ActorState)=>void){const w=new RAPIER.World({x:0,y:-22,z:0}),s=new Simulation(w,7734,'pvp');try{const a=s.addActor('p','P','pounce');for(let i=0;i<90;i++)s.step(1/60);expect(a.grounded).toBe(true);f(s,a);}finally{s.dispose();w.free();}}
function packet(a:ActorState,seq:number,id=0,cancel=0):InputState {return {...emptyInput(),seq,jumpEpoch:a.jumpEpoch,jumpId:id,jumpCancel:cancel,jump:id>cancel};}
const advance=(s:Simulation,n=180)=>{for(let i=0;i<n;i++)s.step(1/60);};
describe('one outstanding life-scoped client press',()=>{
  it('survives an unsampled hitch, drops a second genuine press, then accepts a fresh press after ACK',()=>{
    const b=createJumpOutbox();syncJumpOutbox(b,'A',1,0,true);expect(pressJump(b)).toBe(true);
    expireJump(b,5000);expect(b.pending).toBe(1);expect(pressJump(b)).toBe(false);
    sentJump(b,5000);expireJump(b,5999);expect(b.pending).toBe(1);
    syncJumpOutbox(b,'A',1,1,true);expect(b.pending).toBe(0);expect(pressJump(b)).toBe(true);expect(b.pending).toBe(2);
  });
  it('ignores impossible and backward ACKs but initializes a new owner/life from a real processed watermark',()=>{
    const b=createJumpOutbox();syncJumpOutbox(b,'A',1,0,true);pressJump(b);
    syncJumpOutbox(b,'A',1,2,true);expect(b.pending).toBe(1);expect(b.issued).toBe(1);
    for(const bad of [NaN,Infinity,.5,-1,MAX_INPUT_COUNTER+1])syncJumpOutbox(b,'A',1,bad,true);
    expect(b.pending).toBe(1);syncJumpOutbox(b,'B',2,8,true);expect(b.issued).toBe(8);expect(b.pending).toBe(0);
    pressJump(b);syncJumpOutbox(b,'B',1,0,true);expect(b.pending).toBe(9);
  });
  it('keeps cancellation across same-owner remount, times out only sent intent, and never wraps exhausted IDs',()=>{
    const b=createJumpOutbox();syncJumpOutbox(b,'A',1,0,true);pressJump(b);cancelJumpOutbox(b);syncJumpOutbox(b,'A',1,0,true);
    expect(b.cancel).toBe(1);pressJump(b);expect(b.pending).toBe(2);sentJump(b,100);expireJump(b,1100);expect(b.pending).toBe(0);expect(b.cancel).toBe(2);
    syncJumpOutbox(b,'A',2,MAX_INPUT_COUNTER,true);expect(pressJump(b)).toBe(false);
  });
});
describe('actual Rapier authority delivery',()=>{
  it('retains a parsed short edge followed by neutral before physics and consumes it exactly once',()=>run((s,a)=>{
    const start=a.position.y;s.setInput(a.id,parseInput(packet(a,10,1))!);s.setInput(a.id,parseInput(packet(a,11))!);s.step(1/60);
    expect(a.velocity.y).toBeCloseTo(12.2-22/60,7);expect(a.jumpProcessed).toBe(1);
    for(let i=0;i<180;i++){s.setInput(a.id,packet(a,12+i,1));s.step(1/60);}expect(a.grounded).toBe(true);expect(a.position.y).toBeCloseTo(start,1);
  }));
  it('processes equal/stale cancellation first without refreshing movement or rearming a canceled edge',()=>run((s,a)=>{
    s.setInput(a.id,packet(a,20,1));s.setInput(a.id,{...packet(a,19,0,1),forward:1});s.step(1/60);
    expect(a.jumpProcessed).toBe(1);expect(a.grounded).toBe(true);expect(a.velocity.z).toBe(0);
    s.setInput(a.id,packet(a,21,1));s.step(1/60);expect(a.grounded).toBe(true);
    s.setInput(a.id,packet(a,22,2));s.step(1/60);expect(a.grounded).toBe(false);
  }));
  it('durably rejects an unexpected second ID without ACKing over the unprocessed first or queuing a landing launch',()=>run((s,a)=>{
    s.setInput(a.id,packet(a,10,1));s.setInput(a.id,packet(a,11,2));expect(a.jumpProcessed).toBe(0);s.step(1/60);expect(a.jumpProcessed).toBe(2);
    advance(s);s.setInput(a.id,packet(a,12,2));s.step(1/60);expect(a.grounded).toBe(true);
    s.setInput(a.id,packet(a,13,3));s.step(1/60);expect(a.grounded).toBe(false);
  }));
  it('also rejects an unexpected ID durably when the first pending press is canceled',()=>run((s,a)=>{
    s.setInput(a.id,packet(a,10,1));s.setInput(a.id,packet(a,11,2));s.setInput(a.id,packet(a,9,0,1));s.setInput(a.id,packet(a,12,2));s.step(1/60);
    expect(a.jumpProcessed).toBe(2);expect(a.grounded).toBe(true);
  }));
  it('repeated catch-up steps using the exact same input object and seq cannot bounce under a low ceiling',()=>run((s,a)=>{
    const floor=a.position.y-1;s.world.createCollider(RAPIER.ColliderDesc.cuboid(8,.3,8).setTranslation(a.position.x,floor+2.6+.06+.3,a.position.z));s.world.step();
    const held=packet(a,10,1),before=structuredClone(held);let launches=0,previousY=a.position.y;
    for(let i=0;i<180;i++){s.setInput(a.id,held);s.step(1/60);if(a.position.y-previousY>.01)launches++;previousY=a.position.y;expect(a.position.y-1+2.6).toBeLessThanOrEqual(floor+2.6+.085);}
    expect(launches).toBe(1);expect(a.grounded).toBe(true);expect(a.jumpProcessed).toBe(1);expect(held).toEqual(before);
  }));
  it('retires once on lethal damage and once on successful respawn; unseen pre-death packets cannot launch the new life',()=>run((s,a)=>{
    // First real admitted neutral ends loading protection after2.5s. Waiting
    // without admission leaves the initial45s loading protection in force.
    s.setInput(a.id,packet(a,1));advance(s,151);const old=packet(a,1000,1);
    (s as unknown as {damage(a:ActorState,n:number,id:string,p:ActorState['position']):void}).damage(a,10000,'other',a.position);
    expect(a.hp).toBe(0);expect(a.jumpEpoch).toBe(2);advance(s,120);expect(a.jumpEpoch).toBe(2);
    advance(s,240);expect(a.hp).toBeGreaterThan(0);expect(a.jumpEpoch).toBe(3);
    s.setInput(a.id,old);s.step(1/60);expect(a.grounded).toBe(true);expect(a.velocity.y).toBe(0);expect(a.jumpProcessed).toBe(0);
    s.setInput(a.id,packet(a,1001,1));s.step(1/60);expect(a.velocity.y).toBeGreaterThan(10);
  }));
});
describe('strict mixed-build and counter admission',()=>{
  it('rejects boolean legacy jumps, unsafe counters, and contradictory jump projections',()=>{
    expect(parseInput({...emptyInput(),jump:true})).toBeNull();
    for(const field of ['seq','jumpId','jumpCancel','jumpEpoch'])for(const n of [-1,.1,NaN,Infinity,MAX_INPUT_COUNTER+1])expect(parseInput({...emptyInput(),[field]:n})).toBeNull();
    expect(parseInput({...emptyInput(),jumpId:1,jumpEpoch:1,jump:false})).toBeNull();
    const join={type:'join',layoutVersion:WORLD_LAYOUT_VERSION,name:'P',chassis:'pounce',mode:'pvp',room:'A'};
    expect(parseJoin(join)).toBeNull();expect(parseJoin({...join,inputVersion:1})).toBeNull();expect(parseJoin({...join,inputVersion:INPUT_PROTOCOL_VERSION})).not.toBeNull();
  });
  it('admits safe latest ACKs before client reconciliation, rejecting backward or malformed actor life/ACK atomically',()=>run((s,a)=>{
    const first=s.snapshot();expect(admitStructuralSnapshot(first,null)).not.toBeNull();
    for(const n of [NaN,Infinity,.5,-1,MAX_INPUT_COUNTER+1])for(const field of ['jumpProcessed','jumpEpoch']){const bad=structuredClone(first);bad.actors[0][field as 'jumpProcessed']=n;expect(admitStructuralSnapshot(bad,first)).toBeNull();}
    const old=structuredClone(first);old.inputVersion=1 as typeof INPUT_PROTOCOL_VERSION;expect(admitStructuralSnapshot(old,null)).toBeNull();
    s.setInput(a.id,packet(a,10,1));s.step(1/60);const ack=s.snapshot();expect(admitStructuralSnapshot(ack,first)).not.toBeNull();
    const regression=structuredClone(ack);regression.actors[0].jumpProcessed=0;expect(admitStructuralSnapshot(regression,ack)).toBeNull();
  }));
});
