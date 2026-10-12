import {describe,expect,it,vi} from 'vitest';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {parseFelineStrike,parseInput,parseJoin} from '../shared/protocol';
import {emptyInput,type ActorState,type FelineStrikeState,type GameSnapshot} from '../shared/types';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {createRenderTimeline,pushRenderSample,sampleRenderTimeline} from '../src/game/entities/renderTimeline';
const flight=(extra={}):FelineStrikeState=>({id:1,life:1,kind:'pounce',acceptedAt:.12,stage:'flight',stageAt:.12,endsAt:.44,direction:{x:0,y:0,z:-1},side:1,...extra});
const actor=(strike:FelineStrikeState|null=null):ActorState=>({id:'pilot',position:{x:0,y:12,z:0},velocity:{x:0,y:0,z:-18},yaw:0,hp:100,grounded:false,climb:null,jumpEpoch:1,jumpProcessed:0,strikeProcessed:strike?1:0,strikeEndedAt:-100,strike} as ActorState);
function packet(a=actor(),time=.2):GameSnapshot{return {inputVersion:INPUT_PROTOCOL_VERSION,worldLayoutVersion:WORLD_LAYOUT_VERSION,tick:Math.round(time*60),time,seed:1926,room:'STRIKE',mode:'pvp',actors:[a],projectiles:[],events:[],fields:[],rubble:[],cover:[],structures:[],supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null};}
describe('strike envelope and displayed authoritative clocks',()=>{
  it('requires the new complete envelope and rejects mixed input builds',()=>{
    expect(parseInput({...emptyInput(),strike:true,strikeId:1,strikeEpoch:1})).toMatchObject({strikeId:1});
    for(const value of [NaN,Infinity,-1,.5])expect(parseInput({...emptyInput(),strikeId:value})).toBeNull();
    expect(parseInput({...emptyInput(),strike:true})).toBeNull();expect(parseInput({...emptyInput(),strike:true,strikeId:1,strikeEpoch:1,strikeCancel:1})).toBeNull();
    const join={type:'join',layoutVersion:WORLD_LAYOUT_VERSION,name:'Pilot',room:'R',mode:'pvp',chassis:'pounce'};expect(parseJoin({...join,inputVersion:2})).toBeNull();expect(parseJoin({...join,inputVersion:INPUT_PROTOCOL_VERSION})).not.toBeNull();
  });
  it('detaches direction and rejects nonfinite/forged life, clock, phase, and direction data atomically',()=>{
    const action=flight(),admitted=parseFelineStrike(action,1,1,.2)!;expect(admitted).toEqual(action);admitted.direction.z=99;expect(action.direction.z).toBe(-1);
    for(const change of [{id:2},{life:2},{kind:'fake'},{stage:'charge'},{acceptedAt:NaN},{acceptedAt:.3},{stageAt:.1},{endsAt:Infinity},{endsAt:3},{direction:{x:0,y:0,z:0}},{direction:{x:Infinity,y:0,z:0}},{side:0}])expect(parseFelineStrike({...action,...change},1,1,.2)).toBeUndefined();
    const base=packet();for(const change of [{strikeProcessed:NaN},{strike:flight({life:2})},{strike:flight({direction:{x:0,y:0,z:4}})}])expect(admitStructuralSnapshot(packet({...base.actors[0],...change} as ActorState),base)).toBeNull();
  });
  it('rejects same-action direction edits and recovery rollback',()=>{
    const start=flight(),recovery=flight({stage:'recovery',stageAt:.3,endsAt:.65});expect(parseFelineStrike(recovery,1,1,.35,start)).toEqual(recovery);
    expect(parseFelineStrike(flight({direction:{x:0,y:0,z:1}}),1,1,.35,start)).toBeUndefined();expect(parseFelineStrike(start,1,1,.4,recovery)).toBeUndefined();
  });
  it('starts and releases flight at its confirmed sub-packet clocks, using detached retained samples',()=>{
    const track=createRenderTimeline(),before=actor(),after=actor(flight());pushRenderSample(track,before,.1);pushRenderSample(track,after,.15);after.strike!.direction.z=99;
    track.initialized=true;track.clock=.119;let frame=sampleRenderTimeline(track,1,0,0,0)!;expect(frame.strike).toBeNull();
    track.clock=.12;frame=sampleRenderTimeline(track,2,0,0,0)!;expect(frame.strike?.stage).toBe('flight');expect(frame.strike?.direction.z).toBe(-1);
    const recovery=actor(flight({stage:'recovery',stageAt:.173,endsAt:.523}));pushRenderSample(track,recovery,.2);track.clock=.172;expect(sampleRenderTimeline(track,3,0,0,0)!.strike?.stage).toBe('flight');track.clock=.173;expect(sampleRenderTimeline(track,4,0,0,0)!.strike?.stage).toBe('recovery');
  });
  it('late join samples the active action without starting it again, and a new life resets retained action history',()=>{
    const track=createRenderTimeline();pushRenderSample(track,actor(flight()),.3);track.initialized=true;track.clock=.29;expect(sampleRenderTimeline(track,1,0,0,0)!.strike?.acceptedAt).toBe(.12);
    const next={...actor(),jumpEpoch:2};pushRenderSample(track,next,.32);expect(track.count).toBe(1);expect(sampleRenderTimeline(track,2,0,0,0)!.strike).toBeNull();
  });
  it('releases an interrupted displayed strike at the confirmed terminal clock between packets',()=>{
    const track=createRenderTimeline();pushRenderSample(track,actor(flight()),.15);pushRenderSample(track,{...actor(),strikeProcessed:1,strikeEndedAt:.173},.2);track.initialized=true;track.clock=.172;expect(sampleRenderTimeline(track,1,0,0,0)!.strike).not.toBeNull();track.clock=.173;expect(sampleRenderTimeline(track,2,0,0,0)!.strike).toBeNull();
  });
  it('rejects confirmed-null resurrection and older actions despite a monotonic ACK watermark',()=>{
    const first=admitStructuralSnapshot(packet(actor(flight()),.15),null)!;expect(first).not.toBeNull();const ended=admitStructuralSnapshot(packet({...actor(),strikeProcessed:1,strikeEndedAt:.17},.2),first)!;expect(ended).not.toBeNull();expect(admitStructuralSnapshot(packet(actor(flight()),.21),ended)).toBeNull();
    const higher=admitStructuralSnapshot(packet({...actor(flight({id:4,acceptedAt:.15,stageAt:.15})),strikeProcessed:4},.2),null)!;expect(higher).not.toBeNull();expect(admitStructuralSnapshot(packet({...actor(flight({id:2,acceptedAt:.18,stageAt:.18})),strikeProcessed:4},.22),higher)).toBeNull();
  });
  it('retains life/action history through omission, preserves it on rejected trailing data, and admits a genuine new life or late join',()=>{
    const first=admitStructuralSnapshot(packet(actor(flight()),.15),null)!;
    const omitted={...packet(actor(),.17),actors:[]};const gap=admitStructuralSnapshot(omitted,first)!;expect(admitStructuralSnapshot(packet(actor(flight()),.2),gap)).not.toBeNull();expect(admitStructuralSnapshot(packet({...actor(),strikeProcessed:0},.2),gap)).toBeNull();
    const rejected={...packet({...actor(),strikeProcessed:99,strikeEndedAt:.17},.2),actors:[{...actor(),strikeProcessed:99,strikeEndedAt:.17},{...actor(),id:'bad',jumpEpoch:NaN}]};expect(admitStructuralSnapshot(rejected,first)).toBeNull();expect(admitStructuralSnapshot({...packet({...actor(),strikeProcessed:99,strikeEndedAt:.17},.2),structures:[{}]},first)).toBeNull();expect(admitStructuralSnapshot(packet(actor(flight()),.2),first)).not.toBeNull();
    expect(admitStructuralSnapshot(packet({...actor(),jumpEpoch:2},.2),first)).not.toBeNull();expect(admitStructuralSnapshot(packet(actor(flight()),.3),null)).not.toBeNull();
  });
  it('bounds retained churn, rejects overflow transactionally, and expires missing timed actions without forgetting current live counters',()=>{
    const roster=(prefix:string,time:number)=>({...packet(actor(),time),actors:Array.from({length:64},(_,i)=>({...actor(),id:`${prefix}-${i}`}))});
    const first=admitStructuralSnapshot(roster('first',.2),null)!,second=admitStructuralSnapshot(roster('second',.3),first)!;expect(second).not.toBeNull();expect(admitStructuralSnapshot(roster('overflow',.4),second)).toBeNull();expect(admitStructuralSnapshot(roster('first',.5),second)).not.toBeNull();
    const afterExpiry=admitStructuralSnapshot(roster('third',2),second)!;expect(afterExpiry).not.toBeNull();const replay=packet({...actor(flight()),id:'first-0'},2.1);expect(admitStructuralSnapshot(replay,afterExpiry)).toBeNull();
    const current={...roster('second',3),actors:[{...actor(),id:'second-0',strikeProcessed:1}]};const pinned=admitStructuralSnapshot(current,second)!;expect(pinned).not.toBeNull();expect(admitStructuralSnapshot(roster('second',5),pinned)).toBeNull();
  });
});
