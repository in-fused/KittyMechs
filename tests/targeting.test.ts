import { describe,it,expect } from 'vitest';
import { segmentCylinder } from '../shared/math';
describe('stance crosshair volumes',()=>{
  it('acquires the elevated torso of an upright hull without extending below the feet',()=>{
    const center={x:0,y:1.9,z:-10};
    expect(segmentCylinder({x:0,y:3.4,z:0},{x:0,y:3.4,z:-20},center,1.75,1.9)).toBeCloseTo(.4125);
    expect(segmentCylinder({x:0,y:-.1,z:0},{x:0,y:-.1,z:-20},center,1.75,1.9)).toBeNull();
    expect(segmentCylinder({x:0,y:3.4,z:0},{x:0,y:3.4,z:-20},{x:0,y:1,z:-10},1.75,1)).toBeNull();
  });
  it('handles vertical rays, grazing misses and rays starting inside',()=>{
    expect(segmentCylinder({x:0,y:8,z:0},{x:0,y:-2,z:0},{x:0,y:1.9,z:0},1.75,1.9)).toBeCloseTo(.42);
    expect(segmentCylinder({x:1.8,y:8,z:0},{x:1.8,y:-2,z:0},{x:0,y:1.9,z:0},1.75,1.9)).toBeNull();
    expect(segmentCylinder({x:0,y:1,z:0},{x:5,y:1,z:0},{x:0,y:1,z:0},1.75,1)).toBe(0);
  });
});
