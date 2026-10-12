import {describe,it,expect} from 'vitest';
import {structuralPropNavigationBlocked,type StructuralPropPlacement,type StructuralNavigationStats} from '../shared/structuralPropNavigation';
import {STRUCTURAL_PROP_KINDS,structuralPropCollisionReceipt} from '../shared/structuralPropCollision';
const origin:StructuralPropPlacement={x:0,y:0,z:0,rotation:0,scale:1};
describe('exact triangle navigation occupancy (CPU only)',()=>{
  it('leaves genuine crane openings and overhead space free while blocking actual members',()=>{
    expect(structuralPropNavigationBlocked('crane',origin,{x:0,z:0},{minY:3,maxY:5.6},.3)).toBe(false);
    expect(structuralPropNavigationBlocked('crane',origin,{x:1,z:0},{minY:3,maxY:5.6},.3)).toBe(true);
    expect(structuralPropNavigationBlocked('crane',origin,{x:8,z:0},{minY:0,maxY:2.6},1)).toBe(false);
    expect(structuralPropNavigationBlocked('crane',origin,{x:0,z:0},{minY:19,maxY:22},.3)).toBe(true);
  });
  it('clips low and high vertical bands on actual pipes and wall geometry',()=>{
    expect(structuralPropNavigationBlocked('pipes',origin,{x:0,z:0},{minY:.1,maxY:.8},.1)).toBe(false);
    expect(structuralPropNavigationBlocked('pipes',origin,{x:0,z:-.5},{minY:1.1,maxY:1.8},.1)).toBe(true);
    expect(structuralPropNavigationBlocked('pipes',origin,{x:0,z:0},{minY:3,maxY:5.6},2)).toBe(false);
    expect(structuralPropNavigationBlocked('wall',origin,{x:0,z:-.7},{minY:3,maxY:5.6},.3)).toBe(true);
    expect(structuralPropNavigationBlocked('wall',origin,{x:0,z:2.5},{minY:3,maxY:5.6},.5)).toBe(false);
  });
  it('uses finite segment distance for clearance without filling a whole asset envelope',()=>{
    expect(structuralPropNavigationBlocked('crane',origin,{x:4,z:0},{minY:3,maxY:5.6},.3)).toBe(false);
    expect(structuralPropNavigationBlocked('crane',origin,{x:4,z:0},{minY:3,maxY:5.6},4)).toBe(true);
    expect(structuralPropNavigationBlocked('tower',origin,{x:8,z:0},{minY:0,maxY:2.6},.5)).toBe(false);
    expect(structuralPropNavigationBlocked('tower',origin,{x:0,z:0},{minY:14,maxY:16.6},.3)).toBe(true);
    expect(structuralPropNavigationBlocked('tower',origin,{x:-2,z:0},{minY:14,maxY:16.6},.3)).toBe(false);
  });
  it('applies placement scale, yaw, translation and caller world vertical band once',()=>{
    const yaw=.713,scale=1.7,c=Math.cos(yaw),s=Math.sin(yaw),prop={x:17,y:4,z:-21,rotation:yaw,scale};
    for(const kind of STRUCTURAL_PROP_KINDS)for(const sample of [{x:0,z:0,minY:.1,maxY:2.6,radius:.3},{x:1,z:0,minY:3,maxY:5.6,radius:.3},{x:8,z:2,minY:14,maxY:16.6,radius:1}]){
      const expected=structuralPropNavigationBlocked(kind,origin,sample,{minY:sample.minY,maxY:sample.maxY},sample.radius);
      const actual=structuralPropNavigationBlocked(kind,prop,{x:prop.x+scale*(sample.x*c+sample.z*s),z:prop.z+scale*(-sample.x*s+sample.z*c)},
        {minY:prop.y+scale*sample.minY,maxY:prop.y+scale*sample.maxY},sample.radius*scale);expect(actual).toBe(expected);
    }
  });
  it('prunes only with component bounds and reports bounded triangle work',()=>{
    const stats:StructuralNavigationStats={testedComponents:-1,testedTriangles:-1};
    expect(structuralPropNavigationBlocked('crane',origin,{x:100,z:100},{minY:0,maxY:2.6},1,stats)).toBe(false);expect(stats).toEqual({testedComponents:0,testedTriangles:0});
    expect(structuralPropNavigationBlocked('crane',origin,{x:0,z:0},{minY:3,maxY:5.6},.3,stats)).toBe(false);
    const receipt=structuralPropCollisionReceipt('crane');expect(stats.testedTriangles).toBeLessThan(receipt.triangleCount);expect(stats.testedComponents).toBeLessThan(receipt.components.length);
    for(const kind of STRUCTURAL_PROP_KINDS){structuralPropNavigationBlocked(kind,origin,{x:0,z:0},{minY:0,maxY:30},100,stats);expect(stats.testedTriangles).toBeLessThanOrEqual(structuralPropCollisionReceipt(kind).triangleCount);}
  });
  it('rejects nonfinite or inverted query bands, scales and clearance',()=>{
    for(const [prop,band,clearance] of [[{...origin,scale:0},{minY:0,maxY:1},1],[origin,{minY:2,maxY:1},1],[origin,{minY:0,maxY:Infinity},1],[origin,{minY:0,maxY:1},-1]] as const)
      expect(()=>structuralPropNavigationBlocked('crane',prop,{x:0,z:0},band,clearance)).toThrow();
  });
});
