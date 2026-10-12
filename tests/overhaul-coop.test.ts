import {describe,expect,it} from 'vitest';
import {COOP_REVIVE,coopReviveTarget,OverhaulCoop,type CoopHooks} from '../shared/overhaulCoop';
import {emptyInput,type ActorState,type InputState,type ObjectiveState} from '../shared/types';

function pilot(id:string,x=0):ActorState {
  return {id,name:id,chassis:'pounce',bot:false,position:{x,y:1,z:0},velocity:{x:0,y:0,z:0},yaw:0,aimYaw:0,aimPitch:0,hp:220,maxHp:220,energy:100,heat:0,kills:0,salvage:0,grounded:true,boostUntil:0,shieldUntil:0,windupUntil:0,abilityReadyAt:0,rocketReadyAt:0,stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100,pulseAt:-100,rocketAt:-100,abilityAt:-100,hurtAt:-100,diedAt:-100,disruptedUntil:0,respawnAt:0,hitAt:-100,fireAt:-100,aiState:'patrol',lastInput:0,jumpEpoch:1,jumpProcessed:0,strikeProcessed:0,strike:null,strikeEndedAt:-100};
}
function scenario(players=[pilot('host'),pilot('guest',4)]) {
  const coop=new OverhaulCoop(),inputs=new Map<string,InputState>();
  const objectives:ObjectiveState[]=[{id:'west',name:'West relay',position:{x:12,y:0,z:0},progress:1,complete:true,unlocked:true},{id:'core',name:'Core',position:{x:30,y:0,z:0},progress:.7,complete:false,unlocked:true}];
  let now=0,restores=0,retries=0,clear=true,fits=true;
  const hooks:CoopHooks={input:id=>inputs.get(id)??null,clearRay:()=>clear,restore:()=>{restores++;return fits;},retry:()=>{retries++;for(const a of players){a.hp=a.maxHp;a.position={x:12,y:1,z:0};}}};
  const press=(id:string,interact=true)=>inputs.set(id,{...emptyInput(),seq:(inputs.get(id)?.seq??0)+1,interact});
  const step=(count=1)=>{for(let i=0;i<count;i++){now+=1/60;coop.advance(players,objectives,now,1/60,hooks);}};
  return {coop,players,inputs,objectives,press,step,now:()=>now,restores:()=>restores,retries:()=>retries,setClear:(v:boolean)=>{clear=v;},setFits:(v:boolean)=>{fits=v;}};
}

describe('overhaul co-op rescue and checkpoint retry',()=>{
  it('keeps a lethally damaged pilot down indefinitely until an actual nearby rescue',()=>{
    const s=scenario(),guest=s.players[1],position={...guest.position};s.coop.down(guest,0);s.step(600);
    expect(guest.hp).toBe(0);expect(guest.downed?.at).toBe(0);expect(s.coop.state.status).toBe('active');expect(s.retries()).toBe(0);
    s.press('host');s.step(179);expect(guest.hp).toBe(0);expect(guest.downed?.reviveProgress).toBeCloseTo(179/180);
    s.step();expect(guest.hp).toBe(88);expect(guest.downed).toBeNull();expect(guest.position).toEqual(position);expect(s.restores()).toBe(1);
  });
  it('requires a continuous hold, clear sight, range and settled contact',()=>{
    const s=scenario(),host=s.players[0],guest=s.players[1];s.coop.down(guest,0);s.press('host');s.step(90);
    s.press('host',false);s.step();expect(guest.downed?.reviveProgress).toBe(0);
    s.press('host');s.setClear(false);s.step(180);expect(guest.hp).toBe(0);expect(coopReviveTarget(s.players,host)?.id).toBe('guest');
    s.setClear(true);host.position.x=-1;s.step(180);expect(guest.downed?.reviveProgress).toBe(0);
    host.position.x=0;guest.grounded=false;s.step(180);expect(guest.hp).toBe(0);
    guest.grounded=true;s.step(180);expect(guest.hp).toBe(88);
  });
  it('does not revive through an occupied hull and preserves the downed receipt',()=>{
    const s=scenario(),guest=s.players[1];s.coop.down(guest,0);s.setFits(false);s.press('host');s.step(190);
    expect(guest.hp).toBe(0);expect(guest.downed?.reviveProgress).toBe(1);s.setFits(true);s.step();expect(guest.hp).toBe(88);
  });
  it('interrupts the channel on reviver damage, movement and stale input',()=>{
    const s=scenario(),host=s.players[0],guest=s.players[1];s.coop.down(guest,0);s.press('host');s.step(90);
    host.hurtAt=s.now();s.step();expect(guest.downed?.reviveProgress).toBe(0);s.step(30);
    host.velocity.x=2;s.step();expect(guest.downed?.reviveProgress).toBe(0);host.velocity.x=0;s.step(30);
    s.inputs.delete('host');s.step();expect(guest.downed?.reviveProgress).toBe(0);expect(guest.hp).toBe(0);
  });
  it('never accelerates rescue when a second pilot joins the hold',()=>{
    const s=scenario([pilot('a',0),pilot('b',8),pilot('down',4)]),down=s.players[2];s.coop.down(down,0);s.press('a');s.press('b');s.step(90);
    expect(down.downed?.reviveProgress).toBeCloseTo(.5);expect(down.downed?.reviverId).toBe('a');
    s.press('a',false);s.step();expect(down.downed?.reviverId).toBe('b');expect(down.downed?.reviveProgress).toBeCloseTo(1/180);
  });
  it('fails on all-down and needs a new press after cooldown; keeps completed checkpoint objectives',()=>{
    const s=scenario();s.press('host');for(const a of s.players)s.coop.down(a,0);s.step();expect(s.coop.state.status).toBe('failed');
    s.step(300);expect(s.retries()).toBe(0);expect(s.players.every(a=>a.hp===0)).toBe(true);
    // A missing packet cannot counterfeit a release and retry a held key.
    s.inputs.delete('host');s.step();s.press('host');s.step();expect(s.retries()).toBe(0);
    s.press('host',false);s.step();s.press('host');s.step();expect(s.retries()).toBe(1);expect(s.coop.state.status).toBe('active');expect(s.coop.state.attempt).toBe(2);
    expect(s.objectives[0].complete).toBe(true);expect(s.objectives[0].progress).toBe(1);expect(s.objectives[1].progress).toBe(0);
    expect(s.players.every(a=>a.hp===a.maxHp&&!a.downed)).toBe(true);s.step(90);expect(s.retries()).toBe(1);
  });
  it('rejects a retry press during the failure cooldown until released and pressed again',()=>{
    const s=scenario();for(const a of s.players)s.coop.down(a,0);s.step();s.press('host');s.step(100);expect(s.retries()).toBe(0);
    s.press('host',false);s.step();s.press('host');s.step();expect(s.retries()).toBe(1);
  });
  it('enlists late joins in a failed attempt without granting an escape from the failure',()=>{
    const s=scenario();for(const a of s.players)s.coop.down(a,0);s.step();const late=pilot('late');s.players.push(late);s.coop.join(late,s.now());s.step(100);
    expect(late.hp).toBe(0);expect(late.downed).toBeTruthy();expect(s.coop.state.status).toBe('failed');s.press('late');s.step();expect(s.retries()).toBe(1);expect(late.hp).toBe(late.maxHp);
  });
  it('uses the connected roster after disconnect and does not fail pending safe placement',()=>{
    const s=scenario();s.coop.down(s.players[1],0);s.players.splice(0,1);s.step();expect(s.coop.state.status).toBe('failed');
    const pending=scenario();pending.players[0].hp=0;pending.coop.down(pending.players[1],0);pending.step();expect(pending.coop.state.status).toBe('active');
  });
  it('serializes finite state and keeps snapshot mutation out of mission authority',()=>{
    const s=scenario();for(const a of s.players)s.coop.down(a,0);s.step();const snap=s.coop.snapshot();snap.attempt=50;
    const serialized=JSON.parse(JSON.stringify({coop:s.coop.snapshot(),actors:s.players}));expect(serialized.coop.attempt).toBe(1);expect(serialized.actors[0].respawnAt).toBe(0);expect(serialized.actors[0].downed.at).toBe(0);expect(COOP_REVIVE.healthFraction).toBe(.4);
  });
});
