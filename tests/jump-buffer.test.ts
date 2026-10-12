import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState,type Chassis,type InputState,type MechStance,type Mode} from '../shared/types';
import {terrainHeight} from '../shared/world';

beforeAll(async()=>{await RAPIER.init();});
const dt=1/60;
const chassis=['pounce','bastion','lynx','caracal'] as const;
const forms=['quadruped','upright'] as const;
const owners=['dedicated','external'] as const;
type Owner=typeof owners[number];
// Frozen admitted values, not expectations read back from the new buffer/config.
const launch:Record<Chassis,Record<MechStance,number>>={pounce:{quadruped:12.2,upright:5.76},bastion:{quadruped:9.4,upright:5.2},lynx:{quadruped:12.4,upright:6.56},caracal:{quadruped:10.5,upright:5.6}};
interface Row {time:number;y:number;vy:number;x:number;z:number;grounded:boolean;processed:number;epoch:number;}
interface Context {sim:Simulation;world:RAPIER.World;actor:ActorState;owner:Owner;seq:number;form:MechStance;}
interface Flight {rows:Row[];landing:number;inside:number;outside:number;}
const flights=new Map<string,Flight>();
const row=(c:Context):Row=>({time:c.sim.time,y:c.actor.position.y,vy:c.actor.velocity.y,x:c.actor.position.x,z:c.actor.position.z,grounded:c.actor.grounded,processed:c.actor.jumpProcessed,epoch:c.actor.jumpEpoch});
function send(c:Context,patch:Partial<InputState>={},seq?:number):InputState {
  const sequence=seq??++c.seq;c.seq=Math.max(c.seq,sequence);
  const parsed=parseInput({...emptyInput(),stance:c.form,seq:sequence,jumpEpoch:c.actor.jumpEpoch,...patch});
  expect(parsed).not.toBeNull();const saved=structuredClone(parsed!);c.sim.setInput(c.actor.id,parsed!);expect(parsed).toEqual(saved);return parsed!;
}
function step(c:Context,interval=dt):Row {
  c.sim.step(interval,c.owner==='dedicated');
  if(c.owner==='external'){c.world.timestep=interval;c.world.step();}
  return row(c);
}
const tick=(c:Context,patch:Partial<InputState>={},interval=dt)=>{send(c,patch);return step(c,interval);};
const press=(id:number):Partial<InputState>=>({jump:true,jumpId:id});
function fixture(run:(c:Context)=>void,c:Chassis='pounce',form:MechStance='quadruped',owner:Owner='dedicated',mode:Mode='pvp'){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  try{
    // Controlled locomotion isolation: admitted map/terrain/default player spawn,
    // no opponent combat. Remove authored NPCs only for non-PvP mode controls.
    for(const a of [...sim.actors.values()])if(a.bot)sim.removeActor(a.id);
    const actor=sim.addActor('buffer-pilot','Buffer Pilot',c),context:Context={sim,world,actor,owner,seq:0,form:'quadruped'};
    for(let i=0;i<90;i++)tick(context);
    expect(actor.grounded).toBe(true);expect(actor.velocity.y).toBe(0);expect(actor.hp).toBe(actor.maxHp);
    expect(actor.position.y-1).toBeCloseTo(terrainHeight(actor.position.x,actor.position.z,7734),1);
    if(form==='upright'){context.form=form;for(let i=0;i<49;i++)tick(context);expect(actor.stance).toBe(form);expect(sim.time-actor.stanceChangedAt).toBeGreaterThan(.7);}
    run(context);
  }finally{sim.dispose();world.free();}
}
function pristine(c:Chassis,form:MechStance,owner:Owner,mode:Mode='pvp'):Flight {
  const key=`${c}/${form}/${owner}/${mode}`,cached=flights.get(key);if(cached)return cached;
  let flight:Flight|undefined;
  fixture(context=>{
    const rows=[row(context)];rows.push(tick(context,press(1)));
    expect(rows[1].grounded).toBe(false);expect(rows[1].vy).toBeCloseTo(launch[c][form]-22*dt,7);expect(rows[1].processed).toBe(1);
    let landing=0;
    for(let i=2;i<180;i++){rows.push(tick(context));if(context.actor.grounded){landing=i;break;}}
    expect(landing).toBeGreaterThan(10);expect(rows[landing].vy).toBe(0);rows.push(tick(context));
    // Derive receipt windows from the actual pristine clock/landing, not guessed
    // airborne contact, six nominal ticks, a hidden epsilon or timing search.
    const decision=rows[landing+1].time;
    let inside=0;for(let i=2;i<landing;i++)if(decision<=rows[i-1].time+.1){inside=i;break;}
    expect(inside).toBeGreaterThan(2);const outside=inside-1;
    expect(decision).toBeLessThanOrEqual(rows[inside-1].time+.1);expect(decision).toBeGreaterThan(rows[outside-1].time+.1);
    flight={rows,landing,inside,outside};
  },c,form,owner,mode);
  flights.set(key,flight!);return flight!;
}
function sameMovement(actual:Row,expected:Row){
  expect({x:actual.x,y:actual.y,z:actual.z,vy:actual.vy,grounded:actual.grounded}).toEqual({x:expected.x,y:expected.y,z:expected.z,vy:expected.vy,grounded:expected.grounded});
}
function replay(c:Context,reference:Flight,receiptStep:number,after?:(c:Context,index:number)=>void):Row[]{
  const rows=[row(c)];
  for(let i=1;i<=reference.landing+140;i++){
    send(c,i===1?press(1):i===receiptStep?press(2):{});after?.(c,i);rows.push(step(c));
  }
  return rows;
}
// A descending velocity reset to zero is a landing, not a launch.
const rises=(rows:Row[])=>rows.slice(1).flatMap((r,i)=>r.vy>1&&r.vy>rows[i].vy+1?[i+1]:[]);
const retained=(c:Context)=>(c.sim as unknown as {physics:Map<string,{landingJump:{id:number;epoch:number;receivedAt:number}|null}>}).physics.get(c.actor.id)!.landingJump;

describe('100 ms inclusive authority landing intent on ordinary parsed native inputs',()=>{
  for(const c of chassis)for(const form of forms)for(const owner of owners){
    it(`${c} ${form} ${owner}: short pre-landing edge ACKs immediately, preserves flight, then launches once`,()=>{
      const reference=pristine(c,form,owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside);
        for(let i=0;i<=reference.landing;i++)sameMovement(rows[i],reference.rows[i]);
        expect(rows[reference.inside].processed).toBe(2);expect(rows[reference.inside].grounded).toBe(false);
        expect(rows[reference.landing].grounded).toBe(true);
        const second=rows[reference.landing+1];expect(second.time).toBeLessThanOrEqual(rows[reference.inside-1].time+.1);
        expect(second.grounded).toBe(false);expect(second.vy).toBeCloseTo(launch[c][form]-22*dt,7);
        expect(rises(rows)).toEqual([1,reference.landing+1]);expect(context.actor.grounded).toBe(true);expect(context.actor.velocity.y).toBe(0);expect(context.actor.jumpProcessed).toBe(2);
      },c,form,owner);
    },30000);

    it(`${c} ${form} ${owner}: just-outside receipt expires despite newer duplicate/neutral packets`,()=>{
      const reference=pristine(c,form,owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.outside,(current,i)=>{
          if(i>reference.outside&&i%2===0)send(current,press(2));
        });
        expect(rows[reference.outside].processed).toBe(2);
        for(let i=0;i<=reference.landing+1;i++)sameMovement(rows[i],reference.rows[i]);
        expect(rises(rows)).toEqual([1]);expect(context.actor.grounded).toBe(true);expect(context.actor.jumpProcessed).toBe(2);
      },c,form,owner);
    },30000);
  }

  for(const owner of owners)for(const afterDeadline of [false,true]){
    it(`${owner}: ${afterDeadline?'next representable time after':'exact binary'} deadline ${afterDeadline?'rejects':'accepts'} a grounded retained intent`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        // Deliberately variable final authority interval, not a 60 Hz equality
        // claim. All preceding movement/landing is the ordinary pristine route.
        const receiptStep=reference.landing-2;let receivedAt=0;
        for(let i=1;i<=reference.landing;i++){if(i===receiptStep)receivedAt=context.sim.time;tick(context,i===1?press(1):i===receiptStep?press(2):{});}
        expect(context.actor.grounded).toBe(true);expect(context.actor.jumpProcessed).toBe(2);
        const deadline=receivedAt+.1;
        const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,deadline);view.setBigUint64(0,view.getBigUint64(0)+1n);const next=view.getFloat64(0);
        const decision=afterDeadline?next:deadline,interval=decision-context.sim.time;expect(interval).toBeGreaterThan(0);
        const result=tick(context,{},interval);expect(result.time).toBe(decision);
        if(afterDeadline){expect(result.grounded).toBe(true);expect(result.vy).toBe(0);}else{expect(result.grounded).toBe(false);expect(result.vy).toBeCloseTo(12.2-22*interval,7);}
      },'pounce','quadruped',owner);
    },30000);
  }

  for(const owner of owners){
    it(`${owner}: an ascending press, held object and renewed sequences never extend into a landing bounce`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        let held:InputState|undefined;const rows=[row(context)];
        for(let i=1;i<=reference.landing+140;i++){
          if(i===1)send(context,press(1));else if(i===4)held=send(context,press(2));else if(i>4&&i%2){context.sim.setInput(context.actor.id,held!);}else send(context,i>4?press(2):{});
          rows.push(step(context));
        }
        expect(rows[4].vy).toBeLessThan(rows[3].vy);expect(rows[4].processed).toBe(2);expect(rises(rows)).toEqual([1]);expect(context.actor.grounded).toBe(true);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: unexpected second ID while retained is durably rejected; the first intent still wins`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{if(i>reference.inside)send(current,press(3));});
        expect(rows[reference.inside].processed).toBe(2);expect(rows[reference.inside+1].processed).toBe(3);
        expect(rises(rows)).toEqual([1,reference.landing+1]);expect(context.actor.grounded).toBe(true);expect(context.actor.jumpProcessed).toBe(3);
        tick(context,press(3));expect(context.actor.grounded).toBe(true);
        tick(context,press(4));expect(context.actor.grounded).toBe(false);
      },'pounce','quadruped',owner);
    },30000);

    for(const seqOffset of [0,-1])it(`${owner}: ${seqOffset===0?'equal':'stale'} sequence cancellation after immediate ACK retires retained intent`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{
          if(i===reference.inside+1){expect(current.actor.jumpProcessed).toBe(2);send(current,{jump:false,jumpId:0,jumpCancel:2,forward:1},current.seq+seqOffset);}
        });
        expect(rises(rows)).toEqual([1]);expect(context.actor.grounded).toBe(true);expect(context.actor.position.x).toBeCloseTo(reference.rows[0].x,3);expect(context.actor.position.z).toBeCloseTo(reference.rows[0].z,3);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: canceled/rejected IDs cannot revive, and a wrong-life cancellation cannot cancel the live intent`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{
          if(i===reference.inside+1)send(current,{jump:false,jumpId:0,jumpCancel:2,jumpEpoch:current.actor.jumpEpoch+1});
        });expect(rises(rows)).toEqual([1,reference.landing+1]);
      },'pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{
          if(i===reference.inside+1)send(current,{jump:false,jumpId:0,jumpCancel:2});
          else if(i>reference.inside+1)send(current,press(2));
        });expect(rises(rows)).toEqual([1]);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: cancellation and a genuinely newer ID in one parsed packet replace only the canceled intent`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{
          if(i===reference.inside+1)send(current,{jump:true,jumpId:3,jumpCancel:2});
        });
        expect(rows[reference.inside].processed).toBe(2);expect(rows[reference.inside+1].processed).toBe(3);
        expect(rises(rows)).toEqual([1,reference.landing+1]);expect(context.actor.jumpProcessed).toBe(3);
      },'pounce','quadruped',owner);
    },30000);

    for(const action of ['climb','stance','strike'] as const)it(`${owner}: ${action} intent retires a landing buffer without a delayed unrelated launch`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const rows=replay(context,reference,reference.inside,(current,i)=>{
          if(i===reference.inside+1)send(current,action==='climb'?{climb:true}:action==='stance'?{stance:'upright'}:{strike:true,strikeId:1,strikeEpoch:current.actor.jumpEpoch});
          if(i===reference.inside+2)expect(retained(current)).toBeNull();
        });
        // Climb is requested in the admitted spawn area, not a forged attached
        // state. Airborne desired stance cannot transform. Strike may execute its
        // own ordinary trajectory, but must never spend the old ground launch.
        if(action!=='strike')expect(rises(rows)).toEqual([1]);
        else expect(rows.slice(reference.inside+1).some((r,i)=>r.vy>rows[reference.inside+i].vy+1&&r.vy>11)).toBe(false);
        expect(context.actor.grounded).toBe(true);expect(context.actor.jumpProcessed).toBe(2);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: removing/rejoining the same player cannot inherit an ACKed intent`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        for(let i=1;i<=reference.inside;i++)tick(context,i===1?press(1):i===reference.inside?press(2):{});
        expect(context.actor.jumpProcessed).toBe(2);context.sim.removeActor(context.actor.id);
        context.actor=context.sim.addActor('buffer-pilot','Rejoined','pounce');context.seq=0;
        let launchCount=0;for(let i=0;i<140;i++){const before=context.actor.velocity.y;tick(context);if(context.actor.velocity.y>before+1)launchCount++;}
        expect(launchCount).toBe(0);expect(context.actor.jumpProcessed).toBe(0);expect(context.actor.grounded).toBe(true);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: a retained press cannot survive real pulse death and timed authoritative respawn`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        const enemy=context.sim.addActor('buffer-rival','Rival','pounce'),shooter:Context={...context,actor:enemy,seq:0,form:'quadruped'};
        for(let i=0;i<100;i++){send(shooter);tick(context);}
        expect(context.actor.grounded).toBe(true);expect(enemy.grounded).toBe(true);
        // Actual accepted projectiles bring armor to one pulse; no private damage,
        // clock, protection, health or movement setters construct this death.
        for(let i=0;i<300&&context.actor.hp>22;i++){
          const yaw=Math.atan2(-(context.actor.position.x-enemy.position.x),-(context.actor.position.z-enemy.position.z));
          send(shooter,{fire:true,yaw,pitch:0});tick(context);
        }
        expect(context.actor.hp).toBeGreaterThan(0);expect(context.actor.hp).toBeLessThanOrEqual(22);
        for(let i=0;i<16;i++){send(shooter);tick(context);}
        const epoch=context.actor.jumpEpoch,receiptStep=reference.landing-2;
        for(let i=1;i<=receiptStep;i++){send(shooter);tick(context,i===1?press(1):i===receiptStep?press(2):{});}
        expect(context.actor.jumpProcessed).toBe(2);expect(retained(context)?.id).toBe(2);
        const yaw=Math.atan2(-(context.actor.position.x-enemy.position.x),-(context.actor.position.z-enemy.position.z));
        const horizontal=Math.hypot(context.actor.position.x-enemy.position.x,context.actor.position.z-enemy.position.z);
        const pitch=Math.atan2(context.actor.position.y+.6-enemy.position.y-.65,Math.max(.1,horizontal-1.3));
        send(shooter,{fire:true,yaw,pitch});tick(context);send(shooter);
        for(let i=0;i<2&&context.actor.hp>0;i++){send(shooter);tick(context);}
        expect(context.actor.hp).toBe(0);expect(context.actor.jumpEpoch).toBeGreaterThan(epoch);expect(retained(context)).toBeNull();
        const diedAt=context.actor.diedAt;
        for(let i=0;i<330;i++){send(shooter);tick(context);expect(context.actor.velocity.y).toBeLessThanOrEqual(0);}
        expect(context.sim.time-diedAt).toBeGreaterThan(5);expect(context.actor.hp).toBe(context.actor.maxHp);expect(context.actor.grounded).toBe(true);expect(context.actor.jumpEpoch).toBeGreaterThan(epoch+1);expect(retained(context)).toBeNull();
        tick(context,{jump:true,jumpId:2,jumpEpoch:epoch});expect(context.actor.grounded).toBe(true);
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: stopped input delivery expires a consumed air edge without a delayed landing launch`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        tick(context,press(1));tick(context);tick(context);tick(context,press(2));
        expect(context.actor.jumpProcessed).toBe(2);expect(retained(context)?.id).toBe(2);
        const lastReceipt=context.sim.time,rows=[row(context)];
        for(let i=0;i<reference.landing+140;i++)rows.push(step(context));
        expect(context.sim.time-lastReceipt).toBeGreaterThan(.3);expect(rises(rows)).toEqual([]);expect(context.actor.grounded).toBe(true);expect(retained(context)).toBeNull();
      },'pounce','quadruped',owner);
    },30000);

    it(`${owner}: declared extracted-phase lifecycle clears the intent; a new arena owns no inherited buffer`,()=>{
      const reference=pristine('pounce','quadruped',owner);
      fixture(context=>{
        for(let i=1;i<=reference.inside;i++)tick(context,i===1?press(1):i===reference.inside?press(2):{});
        expect(retained(context)?.id).toBe(2);const before=row(context);
        // Explicit phase lifecycle fixture, NOT ordinary mission completion.
        // No actor/native pose, health, grounding, clock or buffer is forged.
        context.sim.phase='extracted';step(context);
        expect(retained(context)).toBeNull();expect(row(context)).toEqual(before);
      },'pounce','quadruped',owner);
      fixture(context=>{
        expect(retained(context)).toBeNull();expect(context.actor.jumpProcessed).toBe(0);
        for(let i=0;i<140;i++)tick(context);
        expect(context.actor.grounded).toBe(true);expect(context.actor.velocity.y).toBe(0);
      },'pounce','quadruped',owner);
    },30000);

    for(const c of chassis)it(`${c} ${owner}: a fresh immediate grounded jump still works alongside its accepted chassis ability`,()=>{
      fixture(context=>{
        const result=tick(context,{...press(1),boost:true});
        expect(context.actor.abilityAt).toBe(context.sim.time);expect(context.actor.energy).toBeLessThan(100);
        expect(result.processed).toBe(1);expect(result.grounded).toBe(false);expect(result.vy).toBeCloseTo(launch[c].quadruped-22*dt,7);expect(retained(context)).toBeNull();
      },c,'quadruped',owner);
    },30000);
  }

  for(const mode of ['training','coop','pvp','pvpve'] as const)for(const owner of owners){
    it(`${mode} ${owner}: ordinary isolated player landing intent retains the same form-independent policy`,()=>{
      const reference=pristine('pounce','quadruped',owner,mode);
      fixture(context=>{const rows=replay(context,reference,reference.inside);expect(rises(rows)).toEqual([1,reference.landing+1]);expect(context.actor.hp).toBe(context.actor.maxHp);},'pounce','quadruped',owner,mode);
    },30000);
  }
});
