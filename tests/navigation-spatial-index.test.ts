import {describe,expect,it} from 'vitest';
import {Navigation,indexNavigationCityBlocks} from '../shared/navigation';
import {cityBlocks,cityDistrict,cityBlockActive,type CityBlock} from '../shared/cityDistrict';
import type {StructureState} from '../shared/types';

// Reference uses the pre-repair full source scan with every other route and
// occupancy predicate unchanged. No simulated actor/world is altered.
function pair(){const indexed=new Navigation(7734),scan=new Navigation(7734);(scan as unknown as {cityIndex:{get:(id:string)=>CityBlock[]}}).cityIndex={get:()=>cityBlocks(7734)};return [indexed,scan] as const;}
describe('static city candidate index preserves exact navigation',()=>{
  it('matches full scan around rotated blocks and their clearance/bucket boundaries',()=>{
    const [indexed,scan]=pair(),blocks=cityBlocks(7734).filter((_,index)=>index%70===0);
    for(const block of blocks)for(const dx of [-9,-3,0,3,9])for(const dz of [-9,-3,0,3,9]){
      const point={x:block.position[0]+dx,y:1,z:block.position[2]+dz};expect(indexed.walkable(point),JSON.stringify(point)).toBe(scan.walkable(point));
    }
    for(const x of [-48,-24,0,24,48])for(const z of [-72,-48,-24,0])expect(indexed.walkable({x,y:1,z})).toBe(scan.walkable({x,y:1,z}));
    for(const yaw of [-Math.PI/3,Math.PI/4,Math.PI/2]){
      const block:CityBlock={...blocks[0],id:'rotated-fixture',position:[23,2,-24],halfExtents:[7,2,1],yaw},bins=indexNavigationCityBlocks([block]);
      // Transform points strictly inside the original exact local-box band,
      // including asymmetric clearance crossing positive/negative bucket edges.
      for(const x of [-9.29,0,9.29])for(const z of [-3.29,0,3.29]){const wx=23+x*Math.cos(yaw)+z*Math.sin(yaw),wz=-24-x*Math.sin(yaw)+z*Math.cos(yaw);expect(bins.get(`${Math.floor(wx/24)},${Math.floor(wz/24)}`)).toContain(block);}
    }
  });
  it('keeps a real authored wall blocked, then admits the same breached route after damage invalidation',()=>{
    const [indexed,scan]=pair(),district=cityDistrict(7734)!,bankIndex=district.structures.findIndex(s=>s.id.endsWith('spawn-west:facade-bank')),bank=district.structures[bankIndex],states:StructureState[]=district.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)})),from={x:-45,y:.92,z:24},to={x:-30,y:.92,z:24},opening={x:-39,y:.92,z:24};
    for(const nav of [indexed,scan])nav.setStructureFilter(b=>cityBlockActive(b,states));
    const before=indexed.path(from,to);expect(before).toEqual(scan.path(from,to));expect(before).toHaveLength(0);expect(indexed.walkable(opening)).toBe(false);
    // Accepted loss of the two ground panels at west-facade z23/27 opens a
    // real six-metre-clear ground lane; frame columns remain intact.
    for(const index of [1,2]){expect(bank.cells[index].position[0]).toBe(-37.8);states[bankIndex].hp[index]=0;states[bankIndex].brokenMask|=1<<index;}states[bankIndex].revision++;
    for(const nav of [indexed,scan])nav.setStructureFilter(b=>cityBlockActive(b,states));
    const after=indexed.path(from,to);expect(after).toEqual(scan.path(from,to));expect(after.length).toBeGreaterThan(0);expect(indexed.walkable(opening)).toBe(true);
    after[0].x=999;expect(indexed.path(from,to)).toEqual(scan.path(from,to));
  });
});
