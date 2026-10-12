import {describe,expect,it} from 'vitest';
import {OverhaulEncounter,inOverhaulStaging} from '../shared/overhaulEncounter';
import {emptyInput,type ActorState} from '../shared/types';
type Actor=Pick<ActorState,'id'|'bot'|'role'|'hp'|'position'>;
const actor=(id:string,bot:boolean,x:number,z:number,role:ActorState['role']='scout',y=1):Actor=>({id,bot,role:bot?role:undefined,hp:bot?95:220,position:{x,y,z}});
function scenario(actors:Actor[]){const encounter=new OverhaulEncounter();actors.forEach(a=>encounter.register(a));let clear=true;const attacking=new Set<string>();const step=(time:number)=>encounter.advance(actors,time,id=>({...emptyInput(),fire:attacking.has(id)}),()=>clear);return {actors,encounter,attacking,step,setClear:(v:boolean)=>{clear=v;}};}
describe('district home encounter admission',()=>{
  it('holds nearby corridor and rooftop enemies while a pilot learns movement in staging',()=>{
    const s=scenario([actor('pilot',false,-8,6),actor('street',true,0,-16),actor('roof',true,14,25,'anchor',9)]);
    s.step(0);s.step(30);expect(s.encounter.decision('street')?.target).toBeNull();expect(s.encounter.decision('roof')?.target).toBeNull();
    expect(inOverhaulStaging({x:-30,y:14,z:25})).toBe(true);s.actors[0].position.z=-1;s.step(31);
    expect(s.encounter.decision('street')?.target).toBe('pilot');expect(s.encounter.decision('street')?.telegraphUntil).toBeCloseTo(31.9);
  });
  it('lets an explicit attack engage a staging enemy with a full visible acquisition warning',()=>{
    const s=scenario([actor('pilot',false,0,22),actor('roof',true,14,25,'anchor',9)]);s.attacking.add('pilot');s.step(5);
    expect(s.encounter.decision('roof')?.target).toBe('pilot');expect(s.encounter.decision('roof')?.telegraphUntil).toBeCloseTo(5.9);s.step(6);expect(s.encounter.decision('roof')?.telegraphUntil).toBeCloseTo(5.9);
  });
  it('caps simultaneous pressure by living connected roster and releases downed/dead participants',()=>{
    const s=scenario([actor('p1',false,0,-10),actor('a',true,0,-14),actor('b',true,5,-16),actor('c',true,-5,-16),actor('d',true,10,-16)]);s.step(1);
    const active=()=>s.actors.filter(a=>a.bot&&s.encounter.decision(a.id)?.target).length;expect(active()).toBe(1);
    s.actors.push(actor('p2',false,1,-10));s.step(2);expect(active()).toBe(2);s.actors[0].hp=0;s.step(3);expect(active()).toBe(1);expect(s.actors.some(a=>a.bot&&s.encounter.decision(a.id)?.target==='p2')).toBe(true);
    s.actors.push(actor('p3',false,1,-10),actor('p4',false,2,-10),actor('p5',false,3,-10));s.step(4);expect(active()).toBe(3);
  });
  it('cannot acquire an occluded, remote or vertically distant pilot',()=>{
    const s=scenario([actor('pilot',false,0,-10),actor('guard',true,0,-14,'anchor')]);s.setClear(false);s.step(1);expect(s.encounter.decision('guard')?.target).toBeNull();
    s.setClear(true);s.actors[0].position.y=40;s.step(2);expect(s.encounter.decision('guard')?.target).toBeNull();s.actors[0].position.y=1;s.actors[0].position.z=-60;s.step(3);expect(s.encounter.decision('guard')?.target).toBeNull();
  });
  it('preserves an admitted threat instead of switching pressure every frame and retelegraphs after sight loss',()=>{
    const s=scenario([actor('pilot',false,0,-10),actor('a',true,0,-14),actor('b',true,0,-20)]);s.step(1);s.actors[2].position.z=-11;s.step(2);
    expect(s.encounter.decision('a')?.target).toBe('pilot');expect(s.encounter.decision('b')?.target).toBeNull();s.setClear(false);s.step(3);s.setClear(true);s.step(4);expect(s.encounter.decision('b')?.telegraphUntil).toBeCloseTo(4.9);
  });
  it('constrains pursuits and retreat to immutable authored sectors, outside the spawn staging area',()=>{
    const s=scenario([actor('pilot',false,0,-10),actor('anchor',true,-42,-63,'anchor'),actor('scout',true,0,-16)]);
    expect(s.encounter.constrainGoal('anchor',{x:0,y:1,z:22})).toEqual({x:-42+42*9/Math.hypot(42,85),y:1,z:-63+85*9/Math.hypot(42,85)});
    expect(s.encounter.constrainGoal('scout',{x:0,y:1,z:22}).z).toBe(-3);s.actors[1].position.z=-30;s.step(5);expect(s.encounter.decision('anchor')?.home.z).toBe(-63);expect(s.encounter.decision('anchor')?.target).toBeNull();
  });
  it('resets staging admission on mission retry and removes disconnected registrations',()=>{
    const s=scenario([actor('pilot',false,0,-10),actor('a',true,0,-14)]);s.step(1);expect(s.encounter.decision('a')?.target).toBe('pilot');s.encounter.reset();s.actors[0].position.z=6;s.step(2);expect(s.encounter.decision('a')?.target).toBeNull();s.actors.pop();s.step(3);expect(s.encounter.decision('a')).toBeUndefined();
  });
});
