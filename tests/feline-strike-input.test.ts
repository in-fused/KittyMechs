import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {emptyInput,type ActorState,type GameSnapshot} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
const hooks=vi.hoisted(()=>({cleanup:null as null|(()=>void),canvas:new EventTarget()}));
vi.mock('react',()=>({useEffect:(f:()=>()=>void)=>{hooks.cleanup=f();}}));
vi.mock('@react-three/fiber',()=>({useThree:()=>({gl:{domElement:hooks.canvas}})}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',Object.assign(new EventTarget(),{innerWidth:1200}));
// Installed key handlers use Element identity and read browser focus state.
class InputElement {tagName='CANVAS';id='';getAttribute(_name:string){return null;}matches(_selector:string){return false;}}
vi.stubGlobal('Element',InputElement);
vi.stubGlobal('document',{activeElement:null,pointerLockElement:null,hasFocus:()=>true,visibilityState:'visible',exitPointerLock:vi.fn()});
vi.stubGlobal('location',{search:'?debug=1'});
const {runtime,acceptSnapshot,resetRuntime}=await import('../src/game/runtime');
const {controls,inspectStrikeDelivery,markJumpSent,readInput,requestStrike,requestLevelView,resetControls,useInput}=await import('../src/game/input');
const {useGameStore}=await import('../src/state/store');
function snap(tick=1):GameSnapshot{return {worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick,time:tick/60,room:'STRIKE',seed:1926,mode:'pvp',actors:[{id:'p',hp:100,stance:'quadruped',climb:null,jumpEpoch:1,jumpProcessed:0,strikeProcessed:0,strikeEndedAt:-100,strike:null} as ActorState],projectiles:[],events:[],fields:[],rubble:[],cover:[],supplies:[],objectives:[],structures:[],checkpoint:null,phase:'active',winner:null};}
function key(type:'keydown'|'keyup',code='ShiftLeft',repeat=false){const e=new Event(type,{cancelable:true});Object.assign(e,{code,repeat});Object.defineProperty(e,'target',{value:new InputElement()});window.dispatchEvent(e);}
beforeEach(()=>{resetRuntime();runtime.localId='p';runtime.snapshot=snap();runtime.input=emptyInput();useGameStore.setState({phase:'playing'});useInput();readInput();});
afterEach(()=>{hooks.cleanup?.();hooks.cleanup=null;runtime.sendInput=null;resetRuntime();useGameStore.setState({phase:'hangar'});vi.restoreAllMocks();});
describe('feline strike intent through installed controls',()=>{
  it('retains a real short Shift press through a sampler hitch and waits for the actual ACK',()=>{
    const clock=vi.spyOn(performance,'now').mockReturnValue(0);key('keydown');key('keyup');clock.mockReturnValue(300);
    expect(readInput()).toMatchObject({strike:true,strikeId:1,strikeEpoch:1});expect(requestStrike()).toBe(false);markJumpSent(runtime.input);
    const ack=snap(2);ack.actors[0].strikeProcessed=1;expect(acceptSnapshot(ack)).toBe(true);expect(inspectStrikeDelivery().pending).toBe(0);
    key('keydown');expect(readInput().strikeId).toBe(2);
  });
  it('does not rearm either held Shift key after ACK, repeat, or the second Shift going down',()=>{
    key('keydown');readInput();const ack=snap(2);ack.actors[0].strikeProcessed=1;acceptSnapshot(ack);
    key('keydown','ShiftLeft',true);key('keydown','ShiftRight');expect(readInput().strikeId).toBe(0);
    key('keyup','ShiftLeft');key('keydown','ShiftLeft');expect(readInput().strikeId).toBe(0);
    key('keyup','ShiftLeft');key('keyup','ShiftRight');key('keydown','ShiftRight');expect(readInput().strikeId).toBe(2);
  });
  it('rejects impossible strike ACK atomically while retaining jump admission too',()=>{
    requestStrike();readInput();const state=runtime.snapshot,previous=runtime.previous,bad=snap(2);bad.actors[0].strikeProcessed=99;
    expect(acceptSnapshot(bad)).toBe(false);expect(runtime.snapshot).toBe(state);expect(runtime.previous).toBe(previous);expect(inspectStrikeDelivery().pending).toBe(1);
    bad.actors[0].strikeProcessed=1;bad.actors[0].jumpProcessed=99;expect(acceptSnapshot(bad)).toBe(false);
  });
  it('pause sends a neutral cancellation once and never resurrects it across a hook gap',()=>{
    requestStrike();readInput();const send=vi.fn(()=>true);runtime.sendInput=send;useGameStore.getState().setPhase('paused');expect(runtime.input).toMatchObject({strike:false,strikeId:0,strikeCancel:1,boost:false});expect(send).toHaveBeenCalledTimes(1);
    for(let i=0;i<50;i++)readInput();expect(send).toHaveBeenCalledTimes(1);hooks.cleanup?.();hooks.cleanup=null;useGameStore.setState({phase:'playing'});useInput();expect(requestStrike()).toBe(true);expect(readInput().strikeId).toBe(2);
  });
  it('preserves the cancel watermark across actor omission and retires it on the new life',()=>{
    requestStrike();resetControls();const omitted=snap(2);omitted.actors=[];expect(acceptSnapshot(omitted)).toBe(true);readInput();expect(acceptSnapshot(snap(3))).toBe(true);expect(requestStrike()).toBe(true);expect(readInput()).toMatchObject({strikeId:2,strikeCancel:1});
    const dead=snap(4);dead.actors[0].hp=0;dead.actors[0].jumpEpoch=2;expect(acceptSnapshot(dead)).toBe(true);expect(inspectStrikeDelivery().pending).toBe(0);
    const next=snap(5);next.actors[0].jumpEpoch=3;expect(acceptSnapshot(next)).toBe(true);expect(requestStrike()).toBe(true);expect(readInput()).toMatchObject({strikeId:1,strikeEpoch:3,strikeCancel:0});
  });
  it('touch edges use the same durable delivery and diagnostic copies are detached',()=>{
    controls.touchBoost=true;expect(readInput()).toMatchObject({strike:true,strikeId:1});expect(controls.touchBoost).toBe(false);markJumpSent(runtime.input);const copy=inspectStrikeDelivery();copy.pending=99;expect(inspectStrikeDelivery().pending).toBe(1);
    const clock=vi.spyOn(performance,'now').mockReturnValue(copy.sentAt+1001);expect(readInput()).toMatchObject({strikeId:0,strikeCancel:1});clock.mockRestore();
  });
});

describe('explicit level view through installed player controls',()=>{
  it('smoothly recovers from a dive without changing yaw, movement or issuing action edges',()=>{
    const clock=vi.spyOn(performance,'now').mockReturnValue(100000);readInput();
    controls.pitch=-.8;controls.yaw=1.2;controls.shotPitch=-.42;key('keydown','KeyW');
    const actor=runtime.snapshot!.actors[0],prior={...readInput()};key('keydown','KeyV');key('keyup','KeyV');
    clock.mockReturnValue(100016);const first={...readInput()};expect(controls.pitch).toBeGreaterThan(-.8);expect(controls.pitch).toBeLessThan(-.5);
    for(let n=2;n<=80;n++){clock.mockReturnValue(100000+n*16);readInput();}
    expect(controls.pitch).toBeGreaterThanOrEqual(.03);expect(controls.pitch).toBeLessThanOrEqual(.09);expect(controls.levelView).toBe(false);
    expect(controls.yaw).toBe(1.2);expect(runtime.snapshot!.actors[0]).toBe(actor);
    expect(first).toMatchObject({forward:1,yaw:1.2,pitch:-.42,jump:false,strike:false,stance:prior.stance,jumpId:prior.jumpId,jumpEpoch:prior.jumpEpoch,strikeId:prior.strikeId,strikeEpoch:prior.strikeEpoch});
    key('keydown','KeyV',true);expect(controls.levelView).toBe(false);
  });
  it('manual vertical keyboard and mouse aim override recovery immediately',()=>{
    const clock=vi.spyOn(performance,'now').mockReturnValue(200000);readInput();controls.pitch=-.4;requestLevelView();key('keydown','KeyK');clock.mockReturnValue(200016);readInput();expect(controls.levelView).toBe(false);expect(controls.pitch).toBeLessThan(-.4);key('keyup','KeyK');
    requestLevelView();controls.dragging=true;const e=new Event('mousemove');Object.assign(e,{movementX:0,movementY:25});window.dispatchEvent(e);expect(controls.levelView).toBe(false);
    const manual=controls.pitch;clock.mockReturnValue(200032);readInput();expect(controls.pitch).toBe(manual);
  });
  it('pause and blur cancel recovery and cannot queue it outside live play',()=>{
    controls.pitch=.7;expect(requestLevelView()).toBe(true);useGameStore.setState({phase:'paused'});expect(controls.levelView).toBe(false);expect(requestLevelView()).toBe(false);
    useGameStore.setState({phase:'playing'});expect(requestLevelView()).toBe(true);window.dispatchEvent(new Event('blur'));expect(controls.levelView).toBe(false);expect(controls.pitch).toBe(.7);
  });
});
