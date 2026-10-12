import {describe,expect,it} from 'vitest';
import {createArenaClockStore,readArenaClock,recordArenaClock,recordArenaPump} from '../server/arenaDiagnostics';

describe('bounded authority clock evidence',()=>{
  it('retains totals and worst-step stage costs beyond history eviction, with detached reads',()=>{
    const store=createArenaClockStore(true);
    recordArenaClock(store,'ROOM','step',{wall:10,tick:1,durationMs:500,worldStepMs:490,botInputMs:2,pairMs:0,climbMs:0,locomotionMs:5});
    for(let tick=2;tick<=80;tick++)recordArenaClock(store,'ROOM','step',{wall:tick,tick,durationMs:2,worldStepMs:1,botInputMs:.5,pairMs:0,climbMs:0});
    const receipt=readArenaClock(store)!,room=receipt.rooms[0];expect(room.history).toHaveLength(64);expect(room.history[0].tick).toBe(17);
    expect(room.maxMs.step).toBe(500);expect(room.latest['slowest-step'].tick).toBe(1);expect(room.totalMs.worldStepMs).toBe(569);expect(room.totalMs.locomotionMs).toBe(5);expect(room.maxMs.locomotionMs).toBe(5);
    room.latest['slowest-step'].durationMs=0;room.history[0].tick=0;room.counts.step=0;
    expect(readArenaClock(store)!.rooms[0].latest['slowest-step'].durationMs).toBe(500);expect(readArenaClock(store)!.rooms[0].counts.step).toBe(80);
  });
  it('bounds room, human and pump retention while preserving clipping totals and admitted-vs-request sequence',()=>{
    const store=createArenaClockStore(true);
    for(let i=0;i<40;i++)recordArenaClock(store,'R'+i,'input',{client:'host',seq:10,admittedSeq:9,forward:1,admittedForward:0});
    for(let i=0;i<10;i++)recordArenaClock(store,'R39','input',{client:'P'+i,seq:i,admittedSeq:i});
    for(let i=0;i<80;i++)recordArenaPump(store,{gapMs:500,clippedMs:350,steps:9});
    const receipt=readArenaClock(store)!;expect(receipt.rooms).toHaveLength(32);expect(receipt.rooms[0].room).toBe('R8');expect(receipt.rooms.at(-1)!.inputs).toHaveLength(8);expect(receipt.pump).toHaveLength(64);expect(receipt.clippedMs).toBe(28000);
    expect(receipt.rooms[0].inputs[0]).toMatchObject({seq:10,admittedSeq:9,forward:1,admittedForward:0});
  });
  it('is absent and stores nothing when diagnostics are disabled',()=>{
    const store=createArenaClockStore();recordArenaClock(store,'ROOM','step',{durationMs:100});recordArenaPump(store,{clippedMs:100});
    expect(readArenaClock(store)).toBeNull();expect(store.rooms.size).toBe(0);expect(store.pump).toEqual([]);
  });
});
