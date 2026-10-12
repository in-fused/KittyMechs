import {beforeAll,describe,it,expect} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState} from '../shared/types';
import {createPair,parsePair,validPair,pairClipName,PAIR_TIMING} from '../shared/pairedCombat';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
beforeAll(async()=>{await RAPIER.init();});
function arena(mode:'pvp'|'coop'='pvp',manifestSpacing=false){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  const a=sim.addActor('a','Attacker','pounce'),b=sim.addActor('b','Victim','pounce',false,manifestSpacing?{...a.position,x:a.position.x+3.5}:undefined);let seq=0;
  const send=(actor:ActorState,extra={})=>sim.setInput(actor.id,{...emptyInput(),seq:++seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:-Math.PI/2,...extra});
  const tick=(count=1)=>{for(let i=0;i<count;i++){send(a);send(b);sim.step(1/60);}};
  const close=()=>{sim.dispose();world.free();};return{world,sim,a,b,send,tick,close};
}
describe('paired combat authority and admission',()=>{
  it('takes a pair only through real ground-initiated native contact, replicates both owners and releases on disconnect',()=>{
    const run=arena();const {a,b,sim,send}=run;
    try{
      run.tick(170);expect(a.grounded&&b.grounded).toBe(true);
      let pairSeen=false;
      for(let i=0;i<45;i++){
        send(a,{strikeId:1,strike:true});send(b);sim.step(1/60);
        if(a.pair){pairSeen=true;expect(validPair(a,b)).toBe(true);expect(b.hp).toBeLessThan(b.maxHp);
          const snapshot=sim.snapshot(),admitted=admitStructuralSnapshot(snapshot,null);expect(admitted).not.toBeNull();
          snapshot.actors[0].pair!.anchor.x+=100;expect(admitted!.actors[0].pair!.anchor.x).not.toBe(snapshot.actors[0].pair!.anchor.x);
          sim.removeActor(b.id);expect(a.pair).toBeNull();expect(a.pairImmuneUntil).toBeGreaterThan(sim.time);break;
        }
      }
      expect(pairSeen).toBe(true);
    }finally{run.close();}
  });
  it('does not pair friendly co-op contacts',()=>{
    const run=arena('coop');try{run.tick(170);for(let i=0;i<45;i++){run.send(run.a,{strikeId:1,strike:true});run.send(run.b);run.sim.step(1/60);}expect(run.a.pair??null).toBeNull();expect(run.b.pair??null).toBeNull();}finally{run.close();}
  });
  it('keeps pair reservation exclusive and rejects missing/stale life recipients and malformed wire phases',()=>{
    const run=arena('pvp',true);try{run.tick(170);const pair=createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},1);expect(pair).not.toBeNull();
      [run.a.pair,run.b.pair]=pair!;expect(createPair(run.b,run.a,run.sim.time,{x:1,y:0,z:0},2)).toBeNull();
      expect(validPair(run.a,undefined)).toBe(false);run.b.jumpEpoch++;expect(validPair(run.a,run.b)).toBe(false);
      expect(parsePair({...pair![0],endsAt:Infinity},run.a.jumpEpoch,run.sim.time)).toBeUndefined();
      expect(parsePair({...pair![0],phase:'permanent-stun'},run.a.jumpEpoch,run.sim.time)).toBeUndefined();
    }finally{run.close();}
  });
  it('offers a timed escape and shared release instead of an unavoidable repeat pin',()=>{
    const run=arena('pvp',true);try{run.tick(170);const pair=createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},1)!;[run.a.pair,run.b.pair]=pair;
      run.tick(Math.ceil(PAIR_TIMING.escapeWindow*60));run.send(run.a);run.send(run.b,{jump:true,jumpId:1});run.sim.step(1/60);
      expect(run.a.pair?.phase).toBe('release');expect(run.b.pair?.phase).toBe('release');run.tick(30);expect(run.a.pair).toBeNull();expect(run.b.pair).toBeNull();
      expect(createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},2)).toBeNull();
    }finally{run.close();}
  });
  it('replicates a claw beat before its contact damage, and cancels pending contact on escape',()=>{
    const run=arena('pvp',true);try{
      run.tick(170);const pair=createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},3)!;[run.a.pair,run.b.pair]=pair;
      run.tick(34);const hp=run.b.hp;
      run.send(run.a,{fire:true});run.send(run.b);run.sim.step(1/60);
      expect(run.a.pair?.combo).toBe(1);expect(run.b.pair?.comboAt).toBe(run.a.pair?.comboAt);
      expect(pairClipName(run.a.pair!,run.sim.time)).toContain('ClawAttacker');expect(run.b.hp).toBe(hp);
      expect(admitStructuralSnapshot(run.sim.snapshot(),null)).not.toBeNull();
      const forged=run.sim.snapshot();forged.actors.find(a=>a.id===run.b.id)!.pair!.combo=0;
      expect(admitStructuralSnapshot(forged,null)).toBeNull();
      run.tick(9);expect(run.b.hp).toBe(hp-12);
      run.tick(6);run.send(run.a,{fire:true});run.send(run.b);run.sim.step(1/60);
      expect(run.a.pair?.combo).toBe(2);const after=run.b.hp;
      run.send(run.a);run.send(run.b,{jump:true,jumpId:1});run.sim.step(1/60);
      expect(run.a.pair?.outcome).toBe('escaped');expect(run.b.pair?.outcome).toBe('escaped');
      expect(pairClipName(run.a.pair!,run.sim.time)).toContain('EscapeAttacker');
      expect(admitStructuralSnapshot(run.sim.snapshot(),null)).not.toBeNull();run.tick(12);expect(run.b.hp).toBe(after);
    }finally{run.close();}
  });
  it('rejects unsupported targets and out-of-reach fixed-root spacing',()=>{
    const run=arena('pvp',true);try{
      run.tick(170);run.b.position.x+=.1;expect(createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},4)).toBeNull();
      run.b.position.x-=.1;run.b.chassis='bastion';expect(createPair(run.a,run.b,run.sim.time,{x:-1,y:0,z:0},4)).toBeNull();
    }finally{run.close();}
  });
});
