import {cityDistrict} from '../shared/cityDistrict';
import {describe,it,expect} from 'vitest';
import {MAPS} from '../shared/maps';
import {workshopGeometry,workshopRoofMax} from '../shared/workshopGeometry';
import {breakableCover,climbAnchors,roofSurfaces,traversalBlocks} from '../shared/traversal';
import {encounterBlocks,objectiveDefinitions,rooftopEncounter} from '../shared/encounters';
import {propCollider} from '../shared/world';
describe('admitted vertical encounter geometry',()=>{
  for(const map of MAPS)it(`${map.name} has distinct facade associations, supported breakable cargo and an unobstructed antenna emitter`,()=>{
    const allAnchors=climbAnchors(map.seed),allRoofs=roofSurfaces(map.seed),anchors=allAnchors.filter(a=>!a.propId.includes(':city:')),roofs=allRoofs.filter(r=>!r.id.includes(':city:')),blocks=traversalBlocks(map.seed),fit=workshopGeometry(map.seed);
    const workshopCount=map.seed===1926?2:3;expect(anchors).toHaveLength(2);expect(roofs).toHaveLength(workshopCount);expect(allAnchors.length).toBe(2+(cityDistrict(map.seed)?.buildings.reduce((n,b)=>n+b.anchors.length,0)??0));expect(allRoofs.length).toBe(workshopCount+(cityDistrict(map.seed)?.buildings.length??0));
    for(const a of anchors){expect(blocks.filter(b=>b.anchorId===a.id)).toEqual([]);const roof=roofs.find(r=>r.anchorId===a.id)!;expect(roof.meshId).toBe(a.meshId);expect(roof.meshId).toBe(`${a.propId}:mesh`);const scale=roof.halfExtents.x/fit.roofHalfX;expect(roof.center.y).toBeCloseTo(a.position.y+fit.roofTop*scale,5);expect(a.height).toBeCloseTo(fit.wallTop*scale,5);expect(roof.center.y).toBeGreaterThan(a.position.y+a.height);}
    const roof=roofs[1];expect(roof.obstacles).toHaveLength(2);
    for(const p of roof.obstacles){const scale=map.props.find(q=>q.x===p.roofOwner!.x&&q.z===p.roofOwner!.z)!.scale;expect(p.elevation).toBeGreaterThanOrEqual(fit.roofTop*scale-1e-5);expect(p.elevation).toBeLessThanOrEqual(workshopRoofMax(map.seed)*scale+1e-5);expect(p.y).toBeGreaterThanOrEqual(roof.center.y-1e-5);expect(p.y-roof.center.y).toBeLessThanOrEqual((workshopRoofMax(map.seed)-fit.roofTop)*scale+1e-5);expect(p.breakableHp).toBe(100);expect(breakableCover(map.seed).filter(q=>q.id===p.id)).toHaveLength(1);const box=propCollider(p)!;expect(box[1]*2).toBeLessThan(1.6);const dx=p.x-roof.center.x,dz=p.z-roof.center.z,c=Math.cos(roof.yaw),s=Math.sin(roof.yaw);expect(Math.abs(dx*c-dz*s)+box[0]).toBeLessThan(roof.halfExtents.x);expect(Math.abs(dx*s+dz*c)+box[2]).toBeLessThan(roof.halfExtents.z);}
    const encounter=rooftopEncounter(map.seed);expect(encounter.roof.id).toBe(roof.id);expect(encounter.objective.position.y).toBe(roof.center.y);expect(objectiveDefinitions(map.seed).filter(o=>!o.optional)).toHaveLength(4);
    for(const block of encounterBlocks(map.seed))expect(block.position[1]+block.halfExtents[1]).toBeLessThan(encounter.pulseOrigin.y);
  });
});
