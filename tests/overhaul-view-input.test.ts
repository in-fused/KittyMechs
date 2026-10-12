import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {emptyInput,type ActorState,type GameSnapshot} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
const hooks=vi.hoisted(()=>({cleanup:null as null|(()=>void),canvas:new EventTarget()}));
vi.mock('react',()=>({useEffect:(f:()=>()=>void)=>{hooks.cleanup=f();}}));
vi.mock('@react-three/fiber',()=>({useThree:()=>({gl:{domElement:hooks.canvas}})}));
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',Object.assign(new EventTarget(),{innerWidth:1200}));
const {runtime,resetRuntime}=await import('../src/game/runtime');
const {controls,readInput,resetControls,useInput}=await import('../src/game/input');
const {useGameStore}=await import('../src/state/store');
beforeEach(()=>{
  resetRuntime();runtime.localId='p';runtime.input=emptyInput();
  runtime.snapshot={worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:1,time:0,room:'VIEW',seed:1926,mode:'pvp',actors:[{id:'p',hp:100,stance:'quadruped',climb:null,jumpEpoch:1,jumpProcessed:0,strikeProcessed:0,strike:null} as ActorState],projectiles:[],events:[],fields:[],rubble:[],ruins:[],cover:[],supplies:[],objectives:[],structures:[],checkpoint:null,phase:'active',winner:null} as GameSnapshot;
  useGameStore.setState({phase:'playing'});useInput();readInput();
});
afterEach(()=>{hooks.cleanup?.();hooks.cleanup=null;vi.restoreAllMocks();});
it('installed controls sample resolved crosshair aim without rotating WASD movement',()=>{
  controls.yaw=.4;controls.shotYaw=-.8;controls.shotPitch=.15;controls.keys.add('KeyW');controls.keys.add('KeyD');
  expect(readInput()).toMatchObject({yaw:.4,aimYaw:-.8,pitch:.15,forward:1,strafe:1});
  expect(controls.yaw).toBe(.4);
  controls.shotYaw=NaN;expect(readInput()).toMatchObject({yaw:.4,aimYaw:.4});
  controls.shotYaw=-1;resetControls();expect(controls.shotYaw).toBeUndefined();expect(readInput()).toMatchObject({yaw:.4,aimYaw:.4,forward:0,strafe:0});
});
it('keyboard look retains its unrestricted movement yaw while rendered shot yaw is sampled independently',()=>{
  const clock=vi.spyOn(performance,'now').mockReturnValue(1000);readInput();
  controls.yaw=0;controls.shotYaw=.6;controls.keys.add('KeyJ');controls.keys.add('KeyW');clock.mockReturnValue(1050);
  expect(readInput()).toMatchObject({yaw:.095,aimYaw:.6,forward:1});expect(controls.yaw).toBe(.095);
});
