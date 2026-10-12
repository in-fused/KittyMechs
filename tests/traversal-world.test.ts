import {cityDistrict,cityBlocks} from '../shared/cityDistrict';
import {describe,expect,it} from 'vitest';
import {MAPS,serviceApproach} from '../shared/maps';
import {climbAnchors,traversalBlocks,roofSurfaces,breakableCover} from '../shared/traversal';
import {workshopGeometry} from '../shared/workshopGeometry';
import {chunkAt,generateChunk,propCollider,terrainHeight} from '../shared/world';
import {parseInput} from '../shared/protocol';
import {emptyInput} from '../shared/types';
describe('authored traversal and persistent cover contracts',()=>{
  it('keeps full procedural collision footprints clear of the largest mech on every service approach',()=>{
    for(const map of MAPS){const path=serviceApproach(map.seed);
      for(let k=1;k<path.length;k++){
        const a=path[k-1],b=path[k],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
        for(let i=0;i<=steps;i++){
          const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;
          for(let cx=chunkAt(x)-1;cx<=chunkAt(x)+1;cx++)for(let cz=chunkAt(z)-1;cz<=chunkAt(z)+1;cz++)for(const p of generateChunk(map.seed,cx,cz).props){
            const half=propCollider(p);if(!half||p.id)continue;
            const dx=x-p.x,dz=z-p.z,c=Math.cos(p.rotation),s=Math.sin(p.rotation),lx=dx*c-dz*s,lz=dx*s+dz*c;
            expect(Math.hypot(Math.max(0,Math.abs(lx)-half[0]),Math.max(0,Math.abs(lz)-half[2])),`${map.name} route blocked by ${p.kind} at ${p.x},${p.z}`).toBeGreaterThan(2.05+.02);
          }
        }
      }
    }
  });
  it('references admitted buildings and supports their entire visible roof footprints',()=>{
    for(const map of MAPS){
      const anchors=climbAnchors(map.seed),blocks=traversalBlocks(map.seed);expect(anchors.length).toBeGreaterThan(0);
      for(const a of anchors){
        const city=cityDistrict(map.seed)?.buildings.find(b=>b.id===a.propId);
        if(city){
          const decks=cityBlocks(map.seed).filter(b=>b.buildingId===city.id&&b.part==='deck');
          expect(decks.reduce((area,b)=>area+4*b.halfExtents[0]*b.halfExtents[2],0)).toBeCloseTo(city.width*city.depth,5);
          expect(decks.every(b=>Math.abs(b.position[1]+b.halfExtents[1]-a.landing.y)<.001)).toBe(true);
          expect(cityBlocks(map.seed).some(b=>b.buildingId===city.id&&(b.part==='wall'||b.part==='cell')&&b.anchorId===a.id)).toBe(true);
          expect(a.width).toBeGreaterThan(2*2.05+.16);expect(Math.hypot(a.normal.x,a.normal.z)).toBeCloseTo(1);
          const apron={x:a.position.x+a.normal.x*(2.05+1.3),z:a.position.z+a.normal.z*(2.05+1.3)};
          for(const dx of [-2.05,0,2.05])for(const dz of [-2.05,0,2.05])expect(terrainHeight(apron.x+dx,apron.z+dz,map.seed)).toBeCloseTo(a.position.y,3);
          continue;
        }
        const building=map.props.find(p=>generateChunk(map.seed,chunkAt(p.x),chunkAt(p.z)).props.some(q=>q.id===a.propId));expect(building).toBeDefined();
        const p=generateChunk(map.seed,chunkAt(building!.x),chunkAt(building!.z)).props.find(q=>q.id===a.propId)!;
        const roof=roofSurfaces(map.seed).find(r=>r.meshId===a.meshId)!,fit=workshopGeometry(map.seed);expect(roof).toBeDefined();
        expect(blocks.some(b=>b.anchorId===a.id)).toBe(false);expect(a.meshId).toBe(`${p.id}:mesh`);
        expect(roof.halfExtents.x).toBeCloseTo(fit.roofHalfX*p.scale,5);expect(roof.halfExtents.z).toBeCloseTo(fit.roofHalfZ*p.scale,5);
        expect(a.landing.y).toBeCloseTo(p.y+fit.roofTop*p.scale,5);
        expect(a.width).toBeGreaterThan(2*2.05+.16);expect(Math.hypot(a.normal.x,a.normal.z)).toBeCloseTo(1);
        const apron={x:a.position.x+a.normal.x*(2.05+1.3),z:a.position.z+a.normal.z*(2.05+1.3)};
        for(const dx of [-2.05,0,2.05])for(const dz of [-2.05,0,2.05])expect(terrainHeight(apron.x+dx,apron.z+dz,map.seed)).toBeCloseTo(a.position.y,3);
      }
    }
  });
  it('keeps unique bounded destruction IDs on actual admitted cover, preserving deterministic chunk data',()=>{
    for(const map of MAPS){const covers=breakableCover(map.seed);expect(covers.length).toBeGreaterThan(0);expect(covers.length).toBeLessThanOrEqual(12);expect(new Set(covers.map(p=>p.id)).size).toBe(covers.length);
      for(const p of covers){expect(p.breakableHp).toBeGreaterThan(0);expect(generateChunk(map.seed,chunkAt(p.x),chunkAt(p.z)).props.find(q=>q.id===p.id)).toEqual(p);}
    }
  });
  it('accepts held grip input without accepting arbitrary attachment IDs or malformed controls',()=>{
    expect(parseInput({...emptyInput(),climb:true})?.climb).toBe(true);const legacy={...emptyInput()} as Record<string,unknown>;delete legacy.climb;expect(parseInput(legacy)?.climb).toBe(false);
    for(const climb of ['yes',1,null,{}])expect(parseInput({...emptyInput(),climb})).toBeNull();
    expect(parseInput({...emptyInput(),anchor:'forged',climb:true})).not.toHaveProperty('anchor');
  });
});
