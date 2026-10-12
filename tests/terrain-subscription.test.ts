import {afterEach,describe,expect,it,vi} from 'vitest';
import {subscribeTerrain,type TerrainLease} from '../src/game/world/terrainSubscription';
function pending(){let resolve!:(value:number|null)=>void;const promise=new Promise<number|null>(done=>{resolve=done;}),release=vi.fn(()=>resolve(null));return {lease:{promise,release,retryable:false} satisfies TerrainLease<number>,resolve};}
afterEach(()=>vi.useRealTimers());
describe('scene terrain subscriptions',()=>{
  it('never commits a retired key, even if shared work resolves after unmount',async()=>{
    const first=pending(),second=pending(),commit=vi.fn(),stop=subscribeTerrain(()=>first.lease,commit);stop();stop();first.resolve(1);const end=subscribeTerrain(()=>second.lease,commit);second.resolve(2);await Promise.resolve();expect(commit.mock.calls).toEqual([[2]]);expect(first.lease.release).toHaveBeenCalledTimes(1);end();expect(second.lease.release).toHaveBeenCalledTimes(1);
  });
  it('cancels its single saturation retry and owns no abandoned successor',async()=>{
    vi.useFakeTimers();const release=vi.fn(),acquire=vi.fn(()=>({promise:Promise.resolve(null),release,retryable:true})),commit=vi.fn(),stop=subscribeTerrain<number>(acquire,commit);await Promise.resolve();expect(release).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(1);stop();vi.advanceTimersByTime(1000);expect(acquire).toHaveBeenCalledTimes(1);expect(commit).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
  it('retries only retryable admission and never spins on terminal generation failure',async()=>{
    vi.useFakeTimers();const first={promise:Promise.resolve(null),release:vi.fn(),retryable:true},second=pending(),acquire=vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second.lease),commit=vi.fn(),stop=subscribeTerrain<number>(acquire,commit);await Promise.resolve();vi.advanceTimersByTime(199);expect(acquire).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(1);expect(acquire).toHaveBeenCalledTimes(2);second.resolve(7);await Promise.resolve();expect(commit).toHaveBeenCalledWith(7);expect(vi.getTimerCount()).toBe(0);stop();
    const terminal=vi.fn(()=>({promise:Promise.resolve(null),release:vi.fn(),retryable:false})),end=subscribeTerrain<number>(terminal,commit);await Promise.resolve();vi.advanceTimersByTime(10000);expect(terminal).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);end();
  });
});
