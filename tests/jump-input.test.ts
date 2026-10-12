import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {emptyInput,type ActorState,type GameSnapshot} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {MAX_INPUT_COUNTER} from '../shared/inputProtocol';
const hooks=vi.hoisted(()=>({cleanup:null as null|(()=>void),canvas:new EventTarget()}));
vi.mock('react',()=>({useEffect:(f:()=>()=>void)=>{hooks.cleanup=f();}}));
vi.mock('@react-three/fiber',()=>({useThree:()=>({gl:{domElement:hooks.canvas}})}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',Object.assign(new EventTarget(),{innerWidth:1200}));
const {runtime,acceptSnapshot,resetRuntime}=await import('../src/game/runtime');
const {controls,inspectJumpDelivery,markJumpSent,readInput,requestJump,resetControls,useInput}=await import('../src/game/input');
const {useGameStore}=await import('../src/state/store');
const actor=():ActorState=>({id:'p',hp:100,stance:'quadruped',climb:null,jumpEpoch:1,strikeProcessed:0,strikeEndedAt:-100,strike:null,jumpProcessed:0} as ActorState);
function snap(a=actor()):GameSnapshot{return {worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:1,time:0,room:'R',seed:1926,mode:'pvp',actors:[a],projectiles:[],events:[],fields:[],rubble:[],cover:[],supplies:[],objectives:[],structures:[],checkpoint:null,phase:'active',winner:null};}
function key(type:'keydown'|'keyup',repeat=false){const e=new Event(type,{cancelable:true});Object.assign(e,{code:'Space',repeat});Object.defineProperty(e,'target',{value:{matches:()=>false}});window.dispatchEvent(e);}
beforeEach(()=>{resetRuntime();runtime.localId='p';runtime.snapshot=snap();runtime.input=emptyInput();useGameStore.setState({phase:'playing'});useInput();readInput();});
afterEach(()=>{vi.restoreAllMocks();hooks.cleanup?.();hooks.cleanup=null;runtime.sendInput=null;});
describe('installed player input and synchronous lifecycle bridge',()=>{
  it('retains a short real handler down/up through a 300ms sampler hitch, drops the next tap until ACK, then accepts a fresh tap',()=>{
    const clock=vi.spyOn(performance,'now');clock.mockReturnValue(0);key('keydown');key('keyup');clock.mockReturnValue(300);
    expect(readInput().jumpId).toBe(1);expect(readInput().jump).toBe(true);key('keydown');key('keyup');expect(readInput().jumpId).toBe(1);
    const ack=snap();ack.tick=2;ack.time=.1;ack.actors[0].jumpProcessed=1;expect(acceptSnapshot(ack)).toBe(true);
    expect(readInput().jumpId).toBe(0);key('keydown');key('keyup');expect(readInput().jumpId).toBe(2);clock.mockRestore();
  });
  it('does not stamp an unsampled ID as sent from an earlier neutral physics input',()=>{
    const clock=vi.spyOn(performance,'now');clock.mockReturnValue(0);key('keydown');key('keyup');markJumpSent(runtime.input);expect(inspectJumpDelivery().sentAt).toBe(-1);
    clock.mockReturnValue(1500);expect(readInput().jumpId).toBe(1);markJumpSent(runtime.input);expect(inspectJumpDelivery().sentAt).toBe(1500);
    clock.mockReturnValue(2499);expect(readInput().jumpId).toBe(1);clock.mockReturnValue(2500);expect(readInput().jumpId).toBe(0);expect(runtime.input.jumpCancel).toBe(1);clock.mockRestore();
  });
  it('HUD pause synchronously neutralizes all shared inputs and sends once, without multiplying paused render traffic',()=>{
    requestJump();controls.keys.add('KeyW');controls.keys.add('Fire');controls.touchClimb=true;readInput();const send=vi.fn(()=>true);runtime.sendInput=send;
    useGameStore.getState().setPhase('paused');expect(runtime.input).toMatchObject({jump:false,jumpId:0,jumpCancel:1,forward:0,fire:false,climb:false});expect(send).toHaveBeenCalledTimes(1);
    for(let i=0;i<500;i++)readInput();expect(send).toHaveBeenCalledTimes(1);useGameStore.setState({phase:'playing'});expect(readInput().jumpId).toBe(0);
  });
  it('blur cancels immediately and a held repeat cannot rearm on resume',()=>{
    key('keydown');readInput();window.dispatchEvent(new Event('blur'));expect(runtime.input.jump).toBe(false);expect(runtime.input.jumpCancel).toBe(1);
    useGameStore.setState({phase:'playing'});key('keydown',true);expect(readInput().jumpId).toBe(0);key('keyup');key('keydown');expect(readInput().jumpId).toBe(2);
  });
  it('latest admitted death/respawn life resets retire pending before the next sampler; invalid ACK does not touch it',()=>{
    requestJump();readInput();const bad=snap();bad.tick=2;bad.actors[0].jumpEpoch=NaN;expect(acceptSnapshot(bad)).toBe(false);expect(inspectJumpDelivery().pending).toBe(1);
    const dead=snap();dead.tick=2;dead.actors[0].hp=0;dead.actors[0].jumpEpoch=2;acceptSnapshot(dead);expect(runtime.input.jumpId).toBe(0);
    const live=snap();live.tick=3;live.actors[0].jumpEpoch=3;acceptSnapshot(live);expect(readInput().jumpId).toBe(0);expect(requestJump()).toBe(true);expect(readInput().jumpEpoch).toBe(3);
  });
  it('same-life cleanup/remount keeps canceled IDs retired, and diagnostics are bounded detached copies',()=>{
    requestJump();readInput();hooks.cleanup?.();useInput();expect(readInput().jumpCancel).toBe(1);expect(requestJump()).toBe(true);expect(readInput().jumpId).toBe(2);
    for(let i=0;i<100;i++)requestJump();const copy=inspectJumpDelivery();expect(copy.events.length).toBeLessThanOrEqual(64);copy.events[0].kind='forged';expect(inspectJumpDelivery().events[0].kind).not.toBe('forged');resetControls();
  });
  it('temporary admitted local-actor absence cancels without reusing an ID or losing its watermark',()=>{
    requestJump();readInput();resetControls();const missing=snap();missing.tick=2;missing.actors=[];expect(acceptSnapshot(missing)).toBe(true);readInput();
    const returned=snap();returned.tick=3;expect(acceptSnapshot(returned)).toBe(true);expect(requestJump()).toBe(true);expect(readInput()).toMatchObject({jumpId:2,jumpCancel:1});
  });
  it('rejects impossible local ACK before adopting either snapshot pointer, then accepts a genuine ACK including through a hook gap',()=>{
    requestJump();readInput();const current=runtime.snapshot,previous=runtime.previous,received=runtime.receivedAt;
    const impossible=snap();impossible.tick=2;impossible.time=.1;impossible.actors[0].jumpProcessed=99;
    expect(acceptSnapshot(impossible)).toBe(false);expect(runtime.snapshot).toBe(current);expect(runtime.previous).toBe(previous);expect(runtime.receivedAt).toBe(received);expect(inspectJumpDelivery().pending).toBe(1);
    const genuine=snap();genuine.tick=2;genuine.time=.1;genuine.actors[0].jumpProcessed=1;expect(acceptSnapshot(genuine)).toBe(true);expect(inspectJumpDelivery().pending).toBe(0);
    requestJump();readInput();hooks.cleanup?.();hooks.cleanup=null;impossible.tick=3;expect(acceptSnapshot(impossible)).toBe(false);
    genuine.tick=3;genuine.actors[0].jumpProcessed=2;expect(acceptSnapshot(genuine)).toBe(true);useInput();readInput();expect(inspectJumpDelivery().processed).toBe(2);
    const missing=snap();missing.tick=4;missing.time=.1;missing.actors=[];expect(acceptSnapshot(missing)).toBe(true);const stale=snap();stale.tick=5;stale.time=.1;stale.actors[0].jumpProcessed=1;expect(acceptSnapshot(stale)).toBe(false);
  });
  it('safe sample exhaustion cancels pending and does not wrap or retain movement',()=>{
    requestJump();controls.keys.add('KeyW');runtime.input.seq=MAX_INPUT_COUNTER;expect(readInput()).toMatchObject({seq:MAX_INPUT_COUNTER,jump:false,jumpId:0,forward:0});
  });
});
