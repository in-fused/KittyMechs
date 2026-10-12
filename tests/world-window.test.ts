import {describe,expect,it} from 'vitest';
import {initialWorldWindow} from '../src/game/world/worldWindow';
import {getMap} from '../shared/maps';
import {renderChunkKeys} from '../shared/streaming';
import {chunkAt} from '../shared/world';
describe('scene collision/render bootstrap window',()=>{
  it('starts both windows at the accepted local checkpoint, independent of remote roster order',()=>{
    const local={id:'local',position:{x:150,y:13,z:-133},velocity:{x:0,y:0,z:-15}},remote={id:'other',position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0}},value=initialWorldWindow(7734,1,'local',[remote,local]);
    expect(value.center).toBe('2,-3');expect(value.visibleKeys.split('|')).toContain('2,-3');expect(value.visibleKeys.split('|')).not.toContain('0,0');expect(value.visibleKeys.split('|')).toEqual(renderChunkKeys(local.position,local.velocity,1));
  });
  it('falls back to each known spawn when the local pilot is absent, including training startup',()=>{
    for(const seed of [7734,1926,4107]){const spawn=getMap(seed).spawn,expected={center:`${chunkAt(spawn.x)},${chunkAt(spawn.z)}`,visibleKeys:renderChunkKeys(spawn,{x:0,y:0,z:0},2).join('|')};expect(initialWorldWindow(seed,2,'local')).toEqual(expected);expect(initialWorldWindow(seed,2,'local',[{id:'remote',position:{x:300,y:0,z:300},velocity:{x:20,y:0,z:0}}])).toEqual(expected);}
  });
});
