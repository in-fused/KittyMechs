import {describe,it,expect} from 'vitest';
import {buildingFaces,envelopeFaces,faceCoordinates,faceDistance,faceLanding,facePoint,faceTangentLimit,nearbyBuildingFaces} from '../shared/buildingSurfaces';
import {cityDistrict} from '../shared/cityDistrict';
import {workshopGeometry} from '../shared/workshopGeometry';

describe('full building facade contracts',()=>{
  it('covers all admitted buildings across all theaters with four full faces',()=>{
    for(const [seed,buildings,workshops] of [[7734,31,3],[1926,2,2],[4107,3,3]]){
      const faces=buildingFaces(seed);expect(faces).toHaveLength(buildings*4);
      expect(faces.filter(f=>f.kind==='workshop')).toHaveLength(workshops*4);
      expect(new Set(faces.map(f=>f.id)).size).toBe(faces.length);
      for(const f of faces){expect(f.supportingBlockIds.length).toBeGreaterThan(0);expect(f.roofBlockIds.length).toBeGreaterThan(0);}
    }
  });
  it('owns exact city walls and cells rather than support posts or fixture proxies',()=>{
    const d=cityDistrict(7734)!;
    for(const f of buildingFaces(7734).filter(f=>f.kind==='city'))for(const id of f.supportingBlockIds){
      const b=d.blocks.find(b=>b.id===id)!;expect(b.buildingId).toBe(f.buildingId);
      expect(['wall','cell']).toContain(b.part);expect(id).not.toContain('support-');expect(id).not.toContain(':grid-');
    }
    const b=d.buildings[0],faces=buildingFaces(7734).filter(f=>f.buildingId===b.id);
    expect(faces.map(f=>f.width).sort()).toEqual([18,18,20,20]);
    for(const f of faces){expect(f.topY).toBeCloseTo(b.position.y+b.height-.3);expect(faceLanding(f,0,1)!.y).toBeCloseTo(b.position.y+b.height);}
  });
  it('uses measured workshop wall planes and separate roof elevation with exact mesh ownership',()=>{
    for(const seed of [7734,1926,4107])for(const f of buildingFaces(seed).filter(f=>f.kind==='workshop')){
      const g=workshopGeometry(seed),scale=f.height/g.wallTop;
      expect(f.supportingBlockIds).toEqual([`${f.buildingId}:mesh`]);expect(f.roofBlockIds).toEqual(f.supportingBlockIds);
      expect(f.width).toBeCloseTo(2*scale*(f.side==='east'||f.side==='west'?g.wallHalfZ:g.wallHalfX));
      expect(faceLanding(f,0,1)!.y).toBeCloseTo(f.minY+g.roofTop*scale);
      expect(f.roofCenter.y).toBeGreaterThan(f.topY);
    }
  });
  it('measures ends of wide rotated rectangles and preserves local landing coordinates',()=>{
    const faces=envelopeFaces({id:'rotated',kind:'city',center:{x:17,y:5,z:-30},yaw:1.123,halfExtents:{x:40,z:25},height:17,roofId:'roof',roofBlockIds:['deck'],faceBlockIds:{west:['w'],east:['e'],south:['s'],north:['n']}});
    for(const f of faces){
      const t=faceTangentLimit(f,3,.08),wall=facePoint(f,t,11),outside={x:wall.x+f.normal.x*2,y:11,z:wall.z+f.normal.z*2};
      expect(faceDistance(f,outside)).toBeCloseTo(2);expect(Math.hypot(outside.x-f.origin.x,outside.z-f.origin.z)).toBeGreaterThan(8);
      const landing=faceLanding(f,t,3)!;const q=faceCoordinates(f,landing);
      expect(q.tangent).toBeCloseTo(t);expect(q.normal).toBeCloseTo(-3.08);expect(landing.y).toBe(22);
      expect(faceLanding(f,t+.001,3)).toBeNull();expect(faceDistance(f,{...wall,y:23})).toBeCloseTo(1);
    }
  });
  it('spatial lookup equals exact rectangle query at every full-width sample',()=>{
    for(const seed of [7734,1926,4107])for(const f of buildingFaces(seed))for(const t of [-.4,0,.4]){
      const p=facePoint(f,f.width*t,f.minY+f.height/2);p.x+=f.normal.x*2;p.z+=f.normal.z*2;
      const expected=buildingFaces(seed).filter(g=>faceDistance(g,p)<=3).map(g=>g.id).sort();
      expect(nearbyBuildingFaces(seed,p,3,200).map(g=>g.id).sort()).toEqual(expected);
      expect(expected).toContain(f.id);
    }
  });
});
