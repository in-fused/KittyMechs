import { describe, expect, it } from 'vitest';
import { MAPS, getMap } from '../shared/maps';
import { chunkAt, generateChunk, landmarkBlocks, propCollider, propFootprint, terrainHeight, terrainMesh } from '../shared/world';
import { buildRoadGeometry } from '../shared/roadGeometry';

const nearProps=(seed:number,x:number,z:number)=>[-1,0,1].flatMap(dx=>[-1,0,1].flatMap(dz=>generateChunk(seed,chunkAt(x)+dx,chunkAt(z)+dz).props));
describe('authored theaters',()=>{
  it('preserves Rainline objectives and offers distinct objective networks and terrain',()=>{
    expect(getMap(7734).spawn).toEqual({x:-8,y:0,z:22});
    expect(getMap(7734).objectives.map(o=>[o.position.x,o.position.z])).toEqual([[-12,-35],[34,-30],[0,-76],[-8,12]]);
    expect(new Set(MAPS.map(m=>JSON.stringify(m.objectives.map(o=>o.position)))).size).toBe(3);
    expect(new Set(MAPS.map(m=>terrainHeight(80,-80,m.seed).toFixed(2))).size).toBe(3);
    expect(getMap(-1).seed).toBe(7734);
  });
  for(const map of MAPS){
    it(`${map.name} renders roads and markings above terrain with upward-facing triangles`,()=>{
      for(const markings of [false,true]){
        const {vertices:v,indices}=buildRoadGeometry(map.seed,markings);expect(indices.length).toBeGreaterThan(0);
        for(let i=0;i<indices.length;i+=3){
          const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
          const ny=(v[b+2]-v[a+2])*(v[c]-v[a])-(v[b]-v[a])*(v[c+2]-v[a+2]);expect(ny).toBeGreaterThan(0);
        }
        for(let i=0;i<v.length;i+=3)expect(v[i+1]-terrainHeight(v[i],v[i+2],map.seed)).toBeCloseTo(markings?.065:.035,4);
      }
    });
    it(`${map.name} places broad structures on graded pads rather than floating center samples`,()=>{
      const props=map.props.flatMap(p=>generateChunk(map.seed,chunkAt(p.x),chunkAt(p.z)).props).filter(p=>p.elevation===undefined&&['workshop','cargo','pipes','tower','wall'].includes(p.kind));
      for(const p of props){
        const [hx,hz]=propFootprint(p),c=Math.cos(p.rotation),s=Math.sin(p.rotation);
        for(const u of [-1,0,1])for(const v of [-1,0,1])expect(terrainHeight(p.x+u*hx*c+v*hz*s,p.z-u*hx*s+v*hz*c,map.seed)).toBeCloseTo(p.y,4);
      }
    });
    it(`${map.name} anchors every landmark footing below its entire sampled ground footprint`,()=>{
      const supports=landmarkBlocks(map.seed).filter(b=>b.groundSupport);expect(supports.length).toBeGreaterThan(0);
      for(const b of supports){
        const [x,y,z]=b.position,[hx,hy,hz]=b.halfExtents,c=Math.cos(b.yaw),s=Math.sin(b.yaw);
        for(const u of [-1,0,1])for(const v of [-1,0,1]){
          const ground=terrainHeight(x+u*hx*c+v*hz*s,z-u*hx*s+v*hz*c,map.seed);
          expect(y-hy).toBeLessThanOrEqual(ground);expect(y+hy).toBeGreaterThan(ground);
        }
      }
    });
    it(`${map.name} keeps objective, spawn and patrol waypoints clear of solid cover`,()=>{
      const points=[map.spawn,...map.objectives.map(o=>o.position),...map.enemySpawns.map(([x,z])=>({x,y:0,z})),...map.routes.flat()];
      for(const point of points)for(const p of nearProps(map.seed,point.x,point.z)){
        const size=propCollider(p);if(!size)continue;
        const dx=point.x-p.x,dz=point.z-p.z,c=Math.cos(p.rotation),s=Math.sin(p.rotation),lx=dx*c-dz*s,lz=dx*s+dz*c;
        expect(Math.abs(lx)>size[0]+1.1||Math.abs(lz)>size[2]+1.1,`${p.kind} at ${p.x},${p.z} obstructs ${point.x},${point.z}`).toBe(true);
      }
    });
    it(`${map.name} grades every service road below a traversable 1:3 slope`,()=>{
      for(const road of map.roads)for(let i=1;i<road.points.length;i++){
        const a=road.points[i-1],b=road.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length);
        for(let j=1;j<=steps;j++){
          const t=(j-1)/steps,u=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,nx=a.x+(b.x-a.x)*u,nz=a.z+(b.z-a.z)*u;
          expect(Math.abs(terrainHeight(nx,nz,map.seed)-terrainHeight(x,z,map.seed))/Math.hypot(nx-x,nz-z)).toBeLessThan(.334);
        }
      }
    });
    it(`${map.name} shares identical terrain samples across chunk seams`,()=>{
      const a=terrainMesh(-1,-1,32,map.seed),b=terrainMesh(0,-1,32,map.seed);
      for(let z=0;z<=32;z++)expect(a.vertices[(z*33+32)*3+1]).toBe(b.vertices[(z*33)*3+1]);
      for(let i=0;i<b.vertices.length;i+=3)expect(b.vertices[i+1]).toBeCloseTo(terrainHeight(b.vertices[i],b.vertices[i+2],map.seed),5);
      expect(generateChunk(map.seed,-1,-1)).toEqual(generateChunk(map.seed,-1,-1));
      expect(landmarkBlocks(map.seed).length).toBeLessThan(50);
    });
  }
});
