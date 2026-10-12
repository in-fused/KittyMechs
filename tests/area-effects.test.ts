import { describe,it,expect } from 'vitest';
import { areaRing,effectFloor } from '../shared/areaGeometry';
import { direction } from '../shared/math';
import { terrainHeight } from '../shared/world';
import {propCollider} from '../shared/world';
import {roofSurfaces} from '../shared/traversal';
describe('combat area footprints',()=>{
  it('conforms an eight-meter field to Frostline terrain with upward-facing faces',()=>{
    const center={x:39,y:0,z:-45},{vertices:v,indices}=areaRing(4107,center,8);
    for(let i=0;i<v.length;i+=3){expect(v[i+1]).toBeCloseTo(terrainHeight(v[i],v[i+2],4107)+.105,4);expect(Math.hypot(v[i]-center.x,v[i+2]-center.z)).toBeLessThan(8.00001);}
    for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;expect((v[b+2]-v[a+2])*(v[c]-v[a])-(v[b]-v[a])*(v[c+2]-v[a+2])).toBeGreaterThan(0);}
  });
  it('keeps the crescent rake in the actual forward 120-degree damage cone at every heading',()=>{
    for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI]){
      const f=direction(yaw),{vertices:v}=areaRing(7734,{x:0,y:0,z:0},7,.86,Math.PI/2+yaw-Math.PI/3,Math.PI*2/3);
      for(let i=0;i<v.length;i+=3){const r=Math.hypot(v[i],v[i+2]);expect(r).toBeLessThan(7.00001);expect((v[i]*f.x+v[i+2]*f.z)/r).toBeGreaterThanOrEqual(.49999);}
    }
  });
  for(const seed of [7734,1926,4107])it(`${seed} clips elevated fields to the rotated deck and keeps cargo-top fields on actual support`,()=>{
    const roof=roofSurfaces(seed)[1],c=Math.cos(roof.yaw),s=Math.sin(roof.yaw);
    const center={x:roof.center.x+(roof.halfExtents.x-2)*c+(roof.halfExtents.z-2)*s,y:roof.center.y+1,z:roof.center.z-(roof.halfExtents.x-2)*s+(roof.halfExtents.z-2)*c};
    const {vertices:v,indices}=areaRing(seed,center,8,0);expect(indices.length).toBeGreaterThan(0);
    for(let i=0;i<v.length;i+=3){const dx=v[i]-roof.center.x,dz=v[i+2]-roof.center.z;expect(v[i+1]).toBeCloseTo(roof.center.y+.105,4);expect(Math.abs(dx*c-dz*s)).toBeLessThanOrEqual(roof.halfExtents.x+.00002);expect(Math.abs(dx*s+dz*c)).toBeLessThanOrEqual(roof.halfExtents.z+.00002);}
    for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,d=indices[i+2]*3;expect((v[b+2]-v[a+2])*(v[d]-v[a])-(v[b]-v[a])*(v[d+2]-v[a+2])).toBeGreaterThan(0);}
    const cargo=roof.obstacles[0],box=propCollider(cargo)!,position={x:cargo.x,y:cargo.y+box[1]*2+1,z:cargo.z};
    expect(effectFloor(seed,position)).toBeCloseTo(cargo.y+box[1]*2,5);
    const gone=[{id:cargo.id!,hp:0,maxHp:100,destroyedAt:1}];
    expect(effectFloor(seed,position,gone)).toBeCloseTo(roof.center.y,5);
    const retired=areaRing(seed,position,8,0,0,Math.PI*2,gone);for(let i=1;i<retired.vertices.length;i+=3)expect(retired.vertices[i]).toBeCloseTo(roof.center.y+.105,4);
  });
});
