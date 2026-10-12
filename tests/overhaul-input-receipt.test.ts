import {describe,expect,it} from 'vitest';
import {emptyInput} from '../shared/types';
import {createInputReceipt,readSentInputs,recordSentInput} from '../src/game/inputReceipt';

describe('successful input send receipt',()=>{
  it('freezes each actual packet before the shared sampler object changes',()=>{
    const store=createInputReceipt();store.enabled=true;
    const input={...emptyInput(),seq:5351,forward:1,strafe:0,aimYaw:-1.991};
    recordSentInput(store,input,10,'frame',7,'host');
    // A blur cancellation mutates the same runtime object and sends it again.
    input.seq=5352;input.forward=0;
    recordSentInput(store,input,11,'reset',7,'host');
    input.seq=5391;input.aimYaw=-.0019;
    const rows=readSentInputs(store);
    expect(rows.map(row=>[row.source,row.input.seq,row.input.forward,row.input.aimYaw])).toEqual([['frame',5351,1,-1.991],['reset',5352,0,-1.991]]);
    expect(rows[0]).toMatchObject({at:10,generation:7,localId:'host'});
  });
  it('does not expose mutable packet/history references and retains only 32 sends',()=>{
    const store=createInputReceipt();store.enabled=true;
    for(let seq=1;seq<=40;seq++)recordSentInput(store,{...emptyInput(),seq},seq,'frame',3,'guest');
    const rows=readSentInputs(store);expect(rows).toHaveLength(32);expect(rows[0].input.seq).toBe(9);
    rows[0].input.forward=1;rows[0].localId='changed';rows.pop();
    const reread=readSentInputs(store);expect(reread).toHaveLength(32);expect(reread[0].input.forward).toBe(0);expect(reread[0].localId).toBe('guest');
  });
  it('records nothing outside opt-in diagnostics',()=>{
    const store=createInputReceipt();recordSentInput(store,emptyInput(),0,'authority',1,'local');
    expect(readSentInputs(store)).toEqual([]);
  });
});
