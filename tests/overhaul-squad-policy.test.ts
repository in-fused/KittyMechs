import {describe,expect,it} from 'vitest';
import type {ActorState} from '../shared/types';
import {squadCombatInterruption,squadDecision,squadThreats,type SightEnemy,type SquadView} from '../tools/overhaul-squad-policy';

const pilot=(name:string,x:number,z:number,hp:number,hurtAt:number)=>({id:name,name,position:{x,y:.94,z},hp,maxHp:220,hurtAt} as ActorState);
const scout={id:'bot-0',hp:95,position:{x:-17.076,y:.94,z:-53},aiState:'strafe',fireAt:65.833,windupUntil:0} as SightEnemy;
const view=(actor:ActorState,visible:boolean,time=66.25):SquadView=>({actor,time,enemies:[{...scout,visible,fireClear:visible}]});

describe('mission009 ordinary squad policy',()=>{
  it('lets a survivor clear visible threats for an already-down ally while preserving ordinary handoffs',()=>{
    const ally=pilot('MissionGuest',-11.168,-30.843,0,66.883);
    expect(squadCombatInterruption(ally,67,68)).toBe('teammate-downed');
    expect(squadCombatInterruption(ally,67,68,true)).toBeNull();
    expect(squadCombatInterruption({...ally,hp:40,hurtAt:67.5},67,68,true)).toBe('teammate-under-fire');
  });
  it('avoids the protected leader covered shot and gives the exposed guest the combat turn',()=>{
    const host=view(pilot('MissionHost',.907,-35.318,220,45),false);
    const guest=view(pilot('MissionGuest',-11.168,-30.843,2.2,66),true);
    expect(squadThreats(host)).toEqual([]);
    expect(squadDecision([host,guest])).toEqual({kind:'fight',name:'MissionGuest',enemy:'bot-0'});
  });
  it('prioritizes either downed teammate over an enemy firing episode',()=>{
    const host=view(pilot('MissionHost',.907,-35.318,220,45),true);
    const guest=view({...pilot('MissionGuest',-11.168,-30.843,0,66.883),downed:{at:66.883,reviveProgress:0,reviverId:null}},false);
    expect(squadDecision([host,guest])).toEqual({kind:'rescue',name:'MissionGuest'});
    expect(squadDecision([{...host,actor:{...host.actor,hp:0,downed:guest.actor.downed}},{...guest,actor:{...guest.actor,hp:50.6,downed:undefined}}])).toEqual({kind:'rescue',name:'MissionHost'});
  });
  it('resumes the route when a covered enemy returns to patrol and treats unknown sight as blocked',()=>{
    const state=view(pilot('MissionHost',.907,-35.318,220,45),true,73.283);
    state.enemies[0]={...state.enemies[0],aiState:'patrol',fireAt:66.7};
    expect(squadDecision([state])).toEqual({kind:'move'});
    state.enemies[0]={...scout,visible:null as unknown as boolean,fireClear:true};
    expect(squadThreats(state)).toEqual([]);
  });
});
