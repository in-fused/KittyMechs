import {expect,it} from 'vitest';
import {WORLD_LIMIT} from '../shared/config';
import {MOUNTAIN_INNER_RADIUS,scenicOcean} from '../shared/scenery';

it('cosmetic ocean and mountains cannot hide admitted pilots or their camera at edges and corners',()=>{
  const ocean=scenicOcean(7734)!;
  // Sample the actual square boundary, where the former 235m mountain ring
  // intersected playable ground. Include the full camera arm and cosmetic tail.
  const reach=18+4;
  for(let step=0;step<=64;step++)for(const side of [-1,1]){
    const along=-WORLD_LIMIT+2*WORLD_LIMIT*step/64;
    for(const [x,z] of [[side*WORLD_LIMIT,along],[along,side*WORLD_LIMIT]]){
      expect(Math.hypot(x,z)+reach).toBeLessThan(MOUNTAIN_INNER_RADIUS);
      expect(x-reach).toBeGreaterThan(ocean.x+ocean.width/2);
    }
  }
  // The reproduced hidden-mech coast is reachable and must be on the land side.
  expect(-141.1-reach).toBeGreaterThan(ocean.x+ocean.width/2);
  expect(scenicOcean(1926)).toBeNull();expect(scenicOcean(4107)).toBeNull();
});
