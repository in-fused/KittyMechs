import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import {emptyInput,type InputState,type StrikeInputReceipt} from '../../shared/types';
import {parseInput,parseStrikeReceipt} from '../../shared/protocol';
import {INPUT_PROTOCOL_VERSION} from '../../shared/inputProtocol';
import {admitStructuralSnapshot} from '../../src/game/snapshotAdmission';
import {createInputReceipt,recordSentInput,readSentInputs,readSentStrikes} from '../../src/game/inputReceipt';
import {crosshairMuzzleAim} from '../../src/game/camera/viewAim';

// Deterministic native input contract only. It cannot approve actual gameplay.
// Default admitted spawn; no body, collider, hp, stance or velocity injection.
function native(run:(sim:Simulation,id:string,life:number)=>void){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,1926,'pvp','STRIKE036');
  try{const actor=sim.addActor('pilot036','Pilot036','pounce');run(sim,actor.id,actor.jumpEpoch);}finally{sim.dispose();world.free();}
}
const command=(life:number,patch:Partial<InputState>={})=>({...emptyInput(),seq:1,jumpEpoch:life,strikeEpoch:life,strikeId:1,strike:true,aimYaw:.25,pitch:-.6,...patch});
const receipt:StrikeInputReceipt={id:1,life:1,inputSeq:1,queuedTick:0,queuedAt:0,aimYaw:.25,strikePitch:.06,weaponPitch:-.6,pitchSource:'look'};

export function strikeIntentContract036(){
  beforeAll(async()=>{await RAPIER.init();});
  describe('036 distinct strike intent and exact durable native receipt',()=>{
    it('validates protocol4 optional compatibility without changing weapon pitch',()=>{
      expect(INPUT_PROTOCOL_VERSION).toBe(4);
      const explicit=parseInput(command(1,{strikePitch:.06}))!;
      expect(explicit).toMatchObject({pitch:-.6,strikePitch:.06});
      expect(parseInput(command(1))).not.toHaveProperty('strikePitch');
      for(const value of [NaN,Infinity,-Infinity,null,'-.6',{},[],1.31,-1.31])expect(parseInput({...command(1),strikePitch:value})).toBeNull();
    });
    it('keeps first native queued intent despite changed repeated samples and preserves exact snapshot evidence',()=>native((sim,id,life)=>{
      const first=parseInput(command(life,{strikePitch:.06}))!;sim.setInput(id,first);
      const pending=sim.snapshot(),pendingAdmitted=admitStructuralSnapshot(pending,null)!;
      expect(pending.actors.find(a=>a.id===id)).toMatchObject({lastInput:0,strikeProcessed:0,strikeReceipt:{id:1,inputSeq:1}});
      expect(pendingAdmitted).not.toBeNull();expect(pendingAdmitted.actors.find(a=>a.id===id)!.strikeReceipt).toEqual({...receipt,life});
      sim.setInput(id,parseInput(command(life,{seq:2,pitch:-.7,strikePitch:-.6}))!);
      sim.step(1/60);const actor=sim.actors.get(id)!;
      expect(actor.strike).toMatchObject({id:1,life,kind:'pounce'});
      expect(actor.strike!.direction.y).toBeCloseTo(Math.sin(.06),12);
      expect(actor.aimPitch).toBe(-.7);
      expect(actor.strikeReceipt).toEqual({...receipt,life});
      for(let seq=3;seq<=100;seq++){sim.setInput(id,parseInput({...emptyInput(),seq,jumpEpoch:life,strikeEpoch:life})!);sim.step(1/60);}
      expect(actor.strike).toBeNull();expect(actor.strikeReceipt).toEqual({...receipt,life});
      for(let tick=0;tick<24;tick++)sim.step(1/60);
      expect(actor.lastInput).toBe(0); // Native stale-input neutral, receipt retained.
      const snapshot=sim.snapshot(),admitted=admitStructuralSnapshot(snapshot,null)!;
      expect(admitted).not.toBeNull();const copy=admitted.actors.find(a=>a.id===id)!.strikeReceipt!;
      expect(copy).toEqual({...receipt,life});copy.strikePitch=-.8;
      expect(actor.strikeReceipt!.strikePitch).toBe(.06);expect(snapshot.actors.find(a=>a.id===id)!.strikeReceipt!.strikePitch).toBe(.06);
    }));
    it('preserves deliberate downward dive and omitted-field legacy dive independently of weapon aim',()=>{
      for(const patch of [{strikePitch:-.6,pitch:.2},{pitch:-.6}])native((sim,id,life)=>{
        sim.setInput(id,parseInput(command(life,patch))!);sim.step(1/60);const actor=sim.actors.get(id)!;
        expect(actor.strike).toMatchObject({id:1,life,kind:'dive'});expect(actor.strike!.direction.y).toBeCloseTo(Math.sin(-.6),12);
        expect(actor.strikeReceipt).toMatchObject({strikePitch:-.6,weaponPitch:patch.pitch,pitchSource:'strikePitch' in patch?'look':'legacy-weapon'});
      });
    });
    it('rejects invalid direct authority intent and honours cancellation without inventing a strike',()=>native((sim,id,life)=>{
      sim.setInput(id,command(life,{strikePitch:NaN}));expect(sim.inspectRequestedInput(id)!.input.seq).toBe(0);expect(sim.actors.get(id)!.strikeReceipt).toBeUndefined();
      sim.setInput(id,parseInput(command(life,{strikePitch:.06}))!);
      sim.setInput(id,parseInput({...emptyInput(),seq:2,jumpEpoch:life,strikeEpoch:life,strikeCancel:1})!);sim.step(1/60);
      expect(sim.actors.get(id)!.strikeProcessed).toBe(1);expect(sim.actors.get(id)!.strike).toBeNull();expect(sim.actors.get(id)!.strikeReceipt).toMatchObject({id:1,life,inputSeq:1});
    }));
    it('clears the receipt on actual native PvP death and rejects the retired life input',()=>native((sim,id,life)=>{
      const target=sim.actors.get(id)!,shooter=sim.addActor('shooter036','Shooter036','pounce');
      sim.setInput(id,parseInput(command(life,{strikePitch:.06}))!);
      sim.setInput(id,parseInput({...emptyInput(),seq:2,jumpEpoch:life,strikeEpoch:life,strikeCancel:1})!);
      let seq=2;
      for(let tick=0;tick<600&&target.hp>0;tick++){
        seq++;
        sim.setInput(id,parseInput({...emptyInput(),seq,jumpEpoch:life,strikeEpoch:life,strikeCancel:1})!);
        // Read the actual native collider center; public shot admission still
        // resolves ordinary projectile contact/damage and life retirement.
        const center=(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(id)!.collider.translation();
        const shot=crosshairMuzzleAim(shooter.position,shooter.stance,center,0,0);
        sim.setInput(shooter.id,parseInput({...emptyInput(),seq,jumpEpoch:shooter.jumpEpoch,strikeEpoch:shooter.jumpEpoch,yaw:shot.yaw,pitch:shot.pitch,fire:sim.time>=3})!);
        sim.step(1/60);
      }
      expect(target.hp).toBe(0);expect(target.jumpEpoch).toBeGreaterThan(life);expect(target.strikeReceipt).toBeUndefined();
      const admitted=admitStructuralSnapshot(sim.snapshot(),null);expect(admitted).not.toBeNull();expect(admitted!.actors.find(a=>a.id===id)!.strikeReceipt).toBeUndefined();
      const acceptedSeq=sim.inspectRequestedInput(id)!.input.seq;sim.setInput(id,parseInput(command(life,{seq:seq+1,strikePitch:.06}))!);
      expect(sim.inspectRequestedInput(id)!.input.seq).toBe(acceptedSeq);expect(target.strikeReceipt).toBeUndefined();
    }));
    it('admits and detaches only a finite immutable life-bound native receipt',()=>{
      expect(parseStrikeReceipt(receipt,1,1,0,0)).toEqual(receipt);
      for(const patch of [{life:2},{inputSeq:0},{queuedTick:1},{queuedAt:.1},{strikePitch:NaN},{weaponPitch:2},{pitchSource:'invented'},{pitchSource:'legacy-weapon'}])expect(parseStrikeReceipt({...receipt,...patch},1,1,0,0)).toBeNull();
      expect(parseStrikeReceipt(receipt,1,0,3,1)).toEqual(receipt);
      expect(parseStrikeReceipt({...receipt,strikePitch:.07},1,2,1,1,receipt)).toBeNull();
      expect(parseStrikeReceipt(undefined,1,2,1,1,receipt)).toBeNull();
      expect(parseStrikeReceipt(undefined,2,0,1,1,receipt)).toBeUndefined();
      const copy=parseStrikeReceipt(receipt,1,1,0,0)!;copy.weaponPitch=0;expect(receipt.weaponPitch).toBe(-.6);
    });
    it('retains bounded detached first-send evidence after the ordinary input ring evicts it',()=>{
      const store=createInputReceipt();store.enabled=true;const packet=command(1,{strikePitch:.06});
      const cameraRay={frameClock:2,yaw:.25,pitch:-.4,targetDistance:9,reachable:true};
      recordSentInput(store,packet,10,'frame',1,'pilot',{lookYaw:.25,lookPitch:.06,cameraRay});
      packet.strikePitch=-.7;cameraRay.pitch=0;
      for(let seq=2;seq<=70;seq++)recordSentInput(store,{...emptyInput(),seq},seq,'frame',1,'pilot');
      expect(readSentInputs(store)).toHaveLength(32);expect(readSentInputs(store).some(r=>r.input.strike)).toBe(false);
      const strikes=readSentStrikes(store);expect(strikes).toHaveLength(1);expect(strikes[0]).toMatchObject({input:{strikePitch:.06,pitch:-.6},aim:{lookPitch:.06,cameraRay:{pitch:-.4}}});
      strikes[0].input.strikePitch=0;strikes[0].aim!.cameraRay!.pitch=0;expect(readSentStrikes(store)[0]).toMatchObject({input:{strikePitch:.06},aim:{cameraRay:{pitch:-.4}}});
    });
  });
}
