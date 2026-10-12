import {describe,it,expect,afterEach} from 'vitest';
import {readWorldStreamingSnapshot,registerWorldStreamingObserver,type WorldStreamingSnapshot} from '../src/game/world/streamingDiagnostics';

const cleanups:(()=>void)[]=[];
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();});
function scene():WorldStreamingSnapshot{return {seed:7734,mode:'pvp',authority:false,center:'-1,0',visibleKeys:['-1,0'],readyKeys:['-1,0'],guest:{created:9,retired:0,peakTiles:9,createdColliders:36,removedColliders:0,coverCount:0,destroyedCoverCount:0,tiles:[{key:'-1,0',terrainHandle:17,colliderCount:4}]}};}

describe('scene-owned streaming observations',()=>{
  it('detaches observed tiles and readiness from both the owner and caller',()=>{
    const owned=scene();cleanups.push(registerWorldStreamingObserver(()=>owned));
    const copied=readWorldStreamingSnapshot()!;
    owned.guest.tiles[0].terrainHandle=28;owned.readyKeys.push('-2,0');
    expect(copied.guest.tiles[0].terrainHandle).toBe(17);expect(copied.readyKeys).toEqual(['-1,0']);
    copied.guest.tiles[0].colliderCount=999;copied.visibleKeys.push('stale');
    expect(readWorldStreamingSnapshot()!.guest.tiles[0].colliderCount).toBe(4);
    expect(readWorldStreamingSnapshot()!.visibleKeys).toEqual(['-1,0']);
  });
  it('does not let an older scene cleanup remove the active scene observer',()=>{
    const previous=registerWorldStreamingObserver(scene);cleanups.push(previous);
    const next=registerWorldStreamingObserver(()=>({...scene(),seed:4107}));cleanups.push(next);
    previous();expect(readWorldStreamingSnapshot()!.seed).toBe(4107);
    next();expect(readWorldStreamingSnapshot()).toBeNull();
  });
  it('bounds array copies and observes fresh state without retaining historical frames',()=>{
    const owned=scene();owned.visibleKeys=Array.from({length:150},(_,i)=>`${i},0`);owned.readyKeys=[...owned.visibleKeys];
    owned.guest.tiles=Array.from({length:100},(_,i)=>({key:`${i},0`,terrainHandle:i,colliderCount:3}));
    cleanups.push(registerWorldStreamingObserver(()=>owned));
    const first=readWorldStreamingSnapshot()!;expect(first.visibleKeys).toHaveLength(64);expect(first.readyKeys).toHaveLength(64);expect(first.guest.tiles).toHaveLength(16);
    owned.center='2,0';expect(readWorldStreamingSnapshot()!.center).toBe('2,0');expect(first.center).toBe('-1,0');
  });
});
