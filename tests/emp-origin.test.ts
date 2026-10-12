import {describe,expect,it} from 'vitest';
import type {CombatEvent} from '../shared/types';
import {empOrigin} from '../src/game/effects/empOrigin';

const pulse=(id:number,actor:string,x:number):CombatEvent=>({id,type:'area',actor,effect:'emp',at:12,position:{x,y:14,z:30},radius:75});
const hit=(actor:string,at=12):CombatEvent=>({id:8,type:'emp-hit',actor,target:'guard',effect:'emp',at,position:{x:25,y:1,z:30}});
describe('accepted EMP source pairing',()=>{
  it('pairs simultaneous pulses by captor and exact authority time',()=>{
    const city=pulse(1,'city',247),sky=pulse(2,'sky',50),events=[city,sky];
    expect(empOrigin(hit('city'),events)).toEqual(city.position);expect(empOrigin(hit('sky'),events)).toEqual(sky.position);
    expect(empOrigin(hit('city',12.01),events)).toBeNull();expect(empOrigin(hit('unknown'),events)).toBeNull();
  });
  it('hides missing or nonfinite source evidence instead of attaching to another mast',()=>{
    expect(empOrigin(hit('city'),[])).toBeNull();expect(empOrigin(hit('city'),[{...pulse(1,'city',247),position:{x:NaN,y:1,z:2}}])).toBeNull();
    expect(empOrigin(hit('city'),[{...pulse(1,'city',247),effect:'repair'}])).toBeNull();
  });
});
