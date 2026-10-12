import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {ActorState,GameSnapshot} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {MAX_INPUT_COUNTER} from '../shared/inputProtocol';
const hooks=vi.hoisted(()=>({effects:0}));
vi.mock('react',()=>({useEffect:()=>{hooks.effects++;}}));
vi.mock('@react-three/fiber',()=>({useThree:()=>({gl:{}})}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',{innerWidth:1200});
beforeEach(()=>{vi.resetModules();hooks.effects=0;});
function actor(id='local',processed=0):ActorState{return {id,hp:100,stance:'quadruped',climb:null,jumpEpoch:1,strikeProcessed:0,strikeEndedAt:-100,strike:null,jumpProcessed:processed} as ActorState;}
function snapshot(tick=1,actors=[actor()]):GameSnapshot{return {inputVersion:INPUT_PROTOCOL_VERSION,worldLayoutVersion:WORLD_LAYOUT_VERSION,tick,time:tick/60,room:'R',mode:'pvp',seed:1926,actors,projectiles:[],events:[],fields:[],rubble:[],cover:[],supplies:[],objectives:[],structures:[],checkpoint:null,phase:'active',winner:null};}
async function fresh(){
  const {runtime,acceptSnapshot,resetRuntime}=await import('../src/game/runtime');
  const input=await import('../src/game/input');
  const {useGameStore}=await import('../src/state/store');
  useGameStore.setState({phase:'playing'});
  expect(runtime.reconcileInput).toBeNull();expect(hooks.effects).toBe(0);
  return {runtime,acceptSnapshot,resetRuntime,input};
}
describe('fresh-module ACK admission before first useInput effect',()=>{
  it('protects a real exported press/sample against future ACK poison and then recovers the genuine ACK',async()=>{
    const {runtime,acceptSnapshot,input}=await fresh();expect(acceptSnapshot(snapshot())).toBe(true);
    expect(input.requestJump()).toBe(true);expect(input.readInput().jumpId).toBe(1);
    const current=runtime.snapshot,previous=runtime.previous,receivedAt=runtime.receivedAt;
    expect(acceptSnapshot(snapshot(2,[actor('local',99)]))).toBe(false);
    expect(runtime.snapshot).toBe(current);expect(runtime.previous).toBe(previous);expect(runtime.receivedAt).toBe(receivedAt);expect(input.inspectJumpDelivery().pending).toBe(1);
    expect(acceptSnapshot(snapshot(2,[actor('local',1)]))).toBe(true);expect(input.readInput().jumpId).toBe(0);
    expect(input.inspectJumpDelivery()).toMatchObject({processed:1,pending:0,issued:1});expect(hooks.effects).toBe(0);
  });
  it('initializes a legitimate fresh owner and new life from processed>0 without applying old-owner issued limits',async()=>{
    const {runtime,acceptSnapshot,resetRuntime,input}=await fresh();acceptSnapshot(snapshot());input.requestJump();input.readInput();resetRuntime();runtime.localId='rejoined';
    expect(acceptSnapshot(snapshot(1,[actor('rejoined',7)]))).toBe(true);expect(input.requestJump()).toBe(true);expect(input.readInput()).toMatchObject({jumpId:8,jumpEpoch:1,jumpCancel:7});
    const next=actor('rejoined',12);next.jumpEpoch=2;expect(acceptSnapshot(snapshot(2,[next]))).toBe(true);expect(input.requestJump()).toBe(true);expect(input.readInput()).toMatchObject({jumpId:13,jumpEpoch:2});expect(hooks.effects).toBe(0);
  });
  it('keeps remote ACKs safe-counter-only while protecting the known local issued ledger',async()=>{
    const {runtime,acceptSnapshot,input}=await fresh();acceptSnapshot(snapshot());input.requestJump();input.readInput();
    expect(acceptSnapshot(snapshot(2,[actor(),actor('remote',MAX_INPUT_COUNTER-1)]))).toBe(true);expect(input.readInput().jumpId).toBe(1);
    const current=runtime.snapshot;expect(acceptSnapshot(snapshot(3,[actor(),actor('remote',MAX_INPUT_COUNTER+1)]))).toBe(false);expect(runtime.snapshot).toBe(current);expect(hooks.effects).toBe(0);
  });
});
