import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import asset from '../shared/data/city-fracture-shapes-v2.json';
it('binds immutable full3D shape bake provenance and exactly eight fragments per template',()=>{
 const {contentSha256,...payload}=asset;expect(createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(contentSha256);expect(asset.source.seed).toBe(1926);expect(asset.source.method).toBe('full3D-exact-neighbors');expect(asset.source.patchManifest.changes).toHaveLength(3);expect(asset.templates.map(t=>t.id)).toEqual(['post','face','slab']);
 for(const t of asset.templates){expect(t.pieces).toHaveLength(8);expect(new Set(t.pieces.map(p=>p.seedId)).size).toBe(8);expect(t.pieces.reduce((s,p)=>s+p.volume,0)).toBeCloseTo(1,5);for(const p of t.pieces){expect(p.volume).toBeGreaterThan(0);expect(p.positions.every(Number.isFinite)).toBe(true);expect(p.normals.length).toBe(p.positions.length);expect(p.uv.length).toBe(p.positions.length/3*2);expect(p.groups.map(g=>g.materialIndex).sort()).toEqual([0,1]);expect(p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<p.positions.length/3)).toBe(true);}}
});
it('proves source box containment and nearest-seed halfspaces for every metric fragment vertex',()=>{
 for(const t of asset.templates)for(const p of t.pieces){const seed=t.seedPointsMetric[p.seedId];for(let i=0;i<p.positions.length;i+=3){const vertex=[0,1,2].map(j=>(p.positions[i+j]+p.center[j])*t.representativeSize[j]);for(let j=0;j<3;j++)expect(Math.abs(vertex[j])).toBeLessThanOrEqual(t.representativeSize[j]/2+1e-5);
 for(let j=0;j<t.seedPointsMetric.length;j++){if(j===p.seedId)continue;const other=t.seedPointsMetric[j],normal=other.map((x,k)=>x-seed[k]),distance=normal.reduce((s,x,k)=>s+x*(vertex[k]-(seed[k]+other[k])/2),0)/Math.hypot(...normal);expect(distance).toBeLessThanOrEqual(1e-5);}}
 for(let j=0;j<3;j++){const coordinates=p.positions.filter((_,i)=>i%3===j);expect(Math.max(...coordinates)-Math.min(...coordinates)).toBeLessThanOrEqual(t.maxSpan[j]+1e-6);}}
});
it('retains closed oriented topology and reduced actual representative long-axis spans',()=>{
 for(const t of asset.templates)for(const p of t.pieces){const edges=new Map<string,{count:number;direction:number}>();const key=(index:number)=>p.positions.slice(index*3,index*3+3).map(v=>Math.round(v*1e6)).join(',');
 for(let i=0;i<p.indices.length;i+=3)for(const [a,b]of [[p.indices[i],p.indices[i+1]],[p.indices[i+1],p.indices[i+2]],[p.indices[i+2],p.indices[i]]]){const x=key(a),y=key(b),k=[x,y].sort().join('|'),e=edges.get(k)??{count:0,direction:0};e.count++;e.direction+=x<y?1:-1;edges.set(k,e);}expect([...edges.values()].every(e=>e.count===2&&e.direction===0)).toBe(true);}
 const post=asset.templates[0];expect(Math.max(...post.pieces.map(p=>p.axisSpan[0]*post.representativeSize[0]))).toBeLessThan(2.3);
});
