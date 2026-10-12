import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState} from '../shared/types';
import {parseInput} from '../shared/protocol';
import {parseStanceFeedback} from '../shared/stanceFeedback';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {beginStanceRequest,cancelStanceRequest,createStanceRequest,syncStanceRequest} from '../src/game/stanceRequest';
beforeAll(async()=>{await RAPIER.init();});
const fixture=(run:(sim:Simulation,a:ActorState,send:(request:number,target:'quadruped'|'upright')=>void)=>void)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
  try{for(const a of [...sim.actors.values()])if(a.bot)sim.removeActor(a.id);const a=sim.addActor('stance-feedback','pilot','pounce',false,{x:0,y:1,z:22});let seq=0;
    const send=(request:number,target:'quadruped'|'upright')=>{seq=Math.max(seq+1,request);sim.setInput(a.id,parseInput({...emptyInput(),seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,stance:target,stanceRequest:{seq:request,life:a.jumpEpoch}})!);};run(sim,a,send);
  }finally{sim.dispose();world.free();}
};
describe('authoritative transform request outcome',()=>{
  it('defers airborne request, then accepts after real native ground contact',()=>fixture((sim,a,send)=>{
    send(1,'upright');sim.step(1/60);expect(a.stanceFeedback).toMatchObject({requestSeq:1,status:'deferred',reason:'ground'});expect(a.stance).toBe('quadruped');
    for(let i=0;i<90&&a.stance!=='upright';i++){send(1,'upright');sim.step(1/60);}
    expect(a.stance).toBe('upright');expect(a.stanceFeedback).toMatchObject({status:'accepted',life:a.jumpEpoch,target:'upright'});
    const feedback=a.stanceFeedback,changed=a.stanceChangedAt;send(1,'upright');sim.step(1/60);expect(a.stanceFeedback).toEqual(feedback);expect(a.stanceChangedAt).toBe(changed);
  }));
  it('reports actual native headroom handle, preserves blocked control, requires a fresh request after clearing',()=>fixture((sim,a,send)=>{
    for(let i=0;i<60;i++)sim.step(1/60);expect(a.grounded).toBe(true);
    const ceiling=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(5,.2,5).setTranslation(0,3.1,22));sim.world.step();
    send(1,'upright');sim.step(1/60);expect(a.stance).toBe('quadruped');expect(a.stanceFeedback).toMatchObject({requestSeq:1,status:'blocked',reason:'headroom',blocker:{handle:ceiling.handle,owner:null}});
    const blocked=a.stanceFeedback;sim.world.removeCollider(ceiling,true);sim.world.step();for(let i=0;i<5;i++){send(1,'upright');sim.step(1/60);}expect(a.stance).toBe('quadruped');expect(a.stanceFeedback).toEqual(blocked);
    send(100,'upright');sim.step(1/60);expect(a.stance).toBe('upright');expect(a.stanceFeedback).toMatchObject({requestSeq:100,status:'accepted'});
    // A delayed neutral packet may contain an old snapshot stance, but it is
    // never a new legacy level-triggered request for the opposite form.
    sim.setInput(a.id,parseInput({...emptyInput(),seq:101,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,stance:'quadruped',stanceRequest:{seq:0,life:a.jumpEpoch}})!);
    for(let i=0;i<50;i++)sim.step(1/60);expect(a.stance).toBe('upright');
    const accepted=a.stanceFeedback!;expect(parseStanceFeedback(accepted,a.jumpEpoch,a.lastInput,sim.time,blocked)).toEqual(accepted);
    const snapshot=sim.snapshot();expect(admitStructuralSnapshot(snapshot,null)).not.toBeNull();
    const forged=structuredClone(snapshot);forged.actors.find(x=>x.id===a.id)!.stanceFeedback={...accepted,life:a.jumpEpoch+1};expect(admitStructuralSnapshot(forged,null)).toBeNull();
    expect(parseStanceFeedback(accepted,a.jumpEpoch,0,sim.time,accepted)).toEqual(accepted);
    expect(parseStanceFeedback({...accepted,life:a.jumpEpoch+1},a.jumpEpoch,a.lastInput,sim.time)).toBeUndefined();
    expect(parseStanceFeedback({...blocked!,status:'accepted',reason:'accepted'},a.jumpEpoch,a.lastInput,sim.time,blocked)).toBeUndefined();
  }));
  it('rejects forged request sequence/life and feedback reason without modifying movement schema',()=>{
    const base={...emptyInput(),seq:8,jumpEpoch:1,strikeEpoch:1,forward:1,yaw:.3};
    expect(parseInput({...base,stanceRequest:{seq:9,life:1}})).toBeNull();expect(parseInput({...base,stanceRequest:{seq:8,life:NaN}})).toBeNull();
    expect(parseInput({...base,stanceRequest:{seq:8,life:1}})).toMatchObject({forward:1,yaw:.3});
    expect(parseStanceFeedback({requestSeq:8,inputSeq:8,life:1,target:'upright',status:'accepted',reason:'headroom',time:1},1,8,1)).toBeUndefined();
  });
});
describe('bounded client transform lifecycle',()=>{
  const a={id:'local',jumpEpoch:1,hp:220,stance:'quadruped' as const,stanceFeedback:null};
  it('keeps intent past old1.2s expiry, consumes matching block and never auto retries',()=>{
    const s=createStanceRequest();syncStanceRequest(s,a,1,0);beginStanceRequest(s,a,8,0);syncStanceRequest(s,a,1,1500);expect(s.pending?.target).toBe('upright');
    const blocked={requestSeq:8,inputSeq:10,life:1,target:'upright' as const,status:'blocked' as const,reason:'headroom' as const,time:1};syncStanceRequest(s,{...a,stanceFeedback:blocked},1,1600);expect(s.pending).toBeNull();expect(s.notice?.text).toContain('room overhead');syncStanceRequest(s,a,1,1700);expect(s.pending).toBeNull();
  });
  it('reports timeout/cancel and retires pending across life/owner changes',()=>{
    const s=createStanceRequest();syncStanceRequest(s,a,1,0);beginStanceRequest(s,a,8,0);syncStanceRequest(s,a,1,3000);expect(s.pending).toBeNull();expect(s.notice?.status).toBe('timeout');
    beginStanceRequest(s,a,9,3100);cancelStanceRequest(s,3200);expect(s.notice?.status).toBe('canceled');beginStanceRequest(s,a,10,3300);syncStanceRequest(s,{...a,jumpEpoch:2},1,3400);expect(s.pending).toBeNull();expect(s.notice).toBeNull();
  });
  it('shows deferred reason, ignores an unrelated response and consumes accepted authority',()=>{
    const s=createStanceRequest();syncStanceRequest(s,a,1,0);beginStanceRequest(s,a,8,0);
    const deferred={requestSeq:8,inputSeq:9,life:1,target:'upright' as const,status:'deferred' as const,reason:'ground' as const,time:1};
    syncStanceRequest(s,{...a,stanceFeedback:deferred},1,1000);expect(s.pending).not.toBeNull();expect(s.notice?.text).toBe('Land to transform');
    syncStanceRequest(s,{...a,stanceFeedback:{...deferred,requestSeq:7,status:'accepted',reason:'accepted'}},1,1100);expect(s.pending).not.toBeNull();
    syncStanceRequest(s,{...a,stanceFeedback:{...deferred,status:'accepted',reason:'accepted'}},1,1200);expect(s.pending).toBeNull();expect(s.notice?.status).toBe('accepted');
  });
});
