import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3 } from 'three';
import { foliageLod, fernVariant, type FoliageQuality } from '../shared/foliage';
import { generateChunk, propCollider, terrainHeight } from '../shared/world';

const qualities:FoliageQuality[]=['low','medium','high','ultra'];
const treeBoundaries:Record<FoliageQuality,number[]>={low:[16,35],medium:[28,58],high:[32,70],ultra:[36,80]};
const fernBoundaries:Record<FoliageQuality,number[]>={low:[10],medium:[14],high:[17],ultra:[20]};
let fir:Document,fern:Document;
beforeAll(async()=>{await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});[fir,fern]=await Promise.all([io.read('public/assets/models/Forest_Fir.glb'),io.read('public/assets/models/Forest_Fern.glb')]);});
function meshes(doc:Document){return doc.getRoot().listNodes().filter(n=>n.getMesh());}
function measure(node:Node){const matrix=new Matrix4().fromArray(node.getWorldMatrix()),point=new Vector3(),bounds={minY:Infinity,maxY:-Infinity,triangles:0,trunkBaseRadius:0,trunkCoreRadius:0,trunkMaxX:0,trunkMaxZ:0};
  expect(node.getScale().every(v=>Number.isFinite(v)&&v>0)).toBe(true);expect(matrix.elements.every(Number.isFinite)).toBe(true);
  for(const primitive of node.getMesh()!.listPrimitives()){const positions=primitive.getAttribute('POSITION')!;bounds.triangles+=(primitive.getIndices()?.getCount()??positions.getCount())/3;const array=positions.getArray()!;expect(Array.from(array).every(Number.isFinite)).toBe(true);
    for(let i=0;i<positions.getCount();i++){const p=positions.getElement(i,[]);point.set(p[0],p[1],p[2]).applyMatrix4(matrix);bounds.minY=Math.min(bounds.minY,point.y);bounds.maxY=Math.max(bounds.maxY,point.y);if(primitive.getMaterial()?.getName()==='PH_Fir_Trunk'){if(point.y<.4)bounds.trunkBaseRadius=Math.max(bounds.trunkBaseRadius,Math.hypot(point.x,point.z));if(point.y<=6.5){bounds.trunkCoreRadius=Math.max(bounds.trunkCoreRadius,Math.hypot(point.x,point.z));bounds.trunkMaxX=Math.max(bounds.trunkMaxX,Math.abs(point.x));bounds.trunkMaxZ=Math.max(bounds.trunkMaxZ,Math.abs(point.z));}}}
  }return bounds;
}
describe('shipping foliage and solid-tree LOD admission',()=>{
  it('retains hysteresis under repeated small camera oscillations for every quality',()=>{
    for(const quality of qualities)for(const kind of ['cedar','fern'] as const){const boundaries=kind==='cedar'?treeBoundaries[quality]:fernBoundaries[quality];
      for(const boundary of boundaries)for(const direction of [-1,1]){let previous=foliageLod(kind,boundary+direction,quality);const initial=previous;for(let i=0;i<120;i++){previous=foliageLod(kind,boundary+Math.sin(i*.8)*2,quality,previous);expect(previous).toBe(initial);}}
      expect(foliageLod(kind,0,quality,99)).toBe(0);expect(foliageLod(kind,Infinity,quality)).toBe(boundaries.length);expect(foliageLod(kind,NaN,quality)).toBe(boundaries.length);
    }
  });
  it('provides exactly one real mesh detail level for every solid tree across representative theaters and chunks',()=>{
    const levels=meshes(fir).map(n=>Number(n.getName().match(/^Fir_LOD(\d)$/)?.[1]));expect(levels.sort()).toEqual([0,1,2]);let trees=0;
    for(const seed of [7734,1926,4107])for(const cx of [-4,-2,0,2,4])for(const cz of [-4,-2,0,2,4])for(const p of generateChunk(seed,cx,cz).props){if(p.kind!=='cedar')continue;trees++;expect(propCollider(p)).not.toBeNull();expect(p.scale).toBeGreaterThan(0);expect(Number.isFinite(p.scale)).toBe(true);expect(p.y).toBeCloseTo(terrainHeight(p.x,p.z,seed),8);
      for(const quality of qualities){let previous=-1;for(const distance of [0,8,20,42,75,140,75,42,20,8,0]){previous=foliageLod('cedar',distance,quality,previous);expect(levels.filter(lod=>lod===previous)).toHaveLength(1);}}
    }expect(trees).toBeGreaterThan(100);
  });
  it('keeps decoded tree hierarchy meter-scaled, grounded and strictly cheaper at each LOD',()=>{
    const nodes=meshes(fir).sort((a,b)=>a.getName().localeCompare(b.getName()));expect(nodes).toHaveLength(3);const stats=nodes.map(measure);
    for(const s of stats){expect(s.minY).toBeGreaterThan(-.01);expect(s.minY).toBeLessThan(.01);expect(s.maxY).toBeGreaterThan(12.95);expect(s.maxY).toBeLessThan(13.05);expect(s.triangles).toBeGreaterThan(0);}
    expect(stats[0].triangles).toBeGreaterThan(stats[1].triangles);expect(stats[1].triangles).toBeGreaterThan(stats[2].triangles);
    // The derivative's lower wood must fit the actual unchanged proxy. Crown
    // branches/needles remain cosmetic; their spread is not a solid cylinder.
    const proxy=propCollider({kind:'cedar',x:0,y:0,z:0,scale:1,rotation:0})!;
    for(const s of stats){expect(s.trunkBaseRadius).toBeGreaterThan(.25);expect(s.trunkCoreRadius).toBeLessThan(Math.min(proxy[0],proxy[2]));expect(s.trunkMaxX).toBeLessThan(proxy[0]);expect(s.trunkMaxZ).toBeLessThan(proxy[2]);}
  });
  it('preserves both fern variants and cheaper grounded detail levels',()=>{
    const nodes=meshes(fern);expect(nodes.map(n=>n.getName()).sort()).toEqual(['Fern_V0_LOD0','Fern_V0_LOD1','Fern_V1_LOD0','Fern_V1_LOD1']);
    for(const variant of [0,1]){const near=measure(nodes.find(n=>n.getName()===`Fern_V${variant}_LOD0`)! ),far=measure(nodes.find(n=>n.getName()===`Fern_V${variant}_LOD1`)!);for(const s of [near,far]){expect(Math.abs(s.minY)).toBeLessThan(.005);expect(s.maxY).toBeGreaterThan(.15);expect(s.maxY).toBeLessThan(.5);}expect(near.triangles).toBeGreaterThan(far.triangles);expect(Math.abs(near.maxY-far.maxY)).toBeLessThan(.01);}
    const variants=new Set<number>();for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){const variant=fernVariant(x*.37,z*.41);expect(variant===0||variant===1).toBe(true);variants.add(variant);}expect([...variants].sort()).toEqual([0,1]);
  });
  it('retains matched UV/PBR maps with MASK and double-sided foliage materials',()=>{
    for(const doc of [fir,fern])for(const material of doc.getRoot().listMaterials()){
      const textures=[material.getBaseColorTexture(),material.getNormalTexture(),material.getMetallicRoughnessTexture()];expect(textures.every(Boolean),material.getName()).toBe(true);
      for(const texture of textures){expect(texture!.getImage()!.byteLength).toBeGreaterThan(100);expect(texture!.getSize()).toEqual([512,512]);}
      const uv=[material.getBaseColorTextureInfo(),material.getNormalTextureInfo(),material.getMetallicRoughnessTextureInfo()].map(info=>info!.getTexCoord());expect(new Set(uv).size).toBe(1);
      // Fir's fine needle coverage needs the visually reviewed lower cutoff
      // through mipmaps. Fern's broader leaf cutouts retain their .5 policy.
      if(/Needles|Leaves/.test(material.getName())){expect(material.getAlphaMode()).toBe('MASK');expect(material.getAlphaCutoff()).toBeCloseTo(material.getName()==='PH_Fir_Needles'?.15:.5);expect(material.getDoubleSided()).toBe(true);expect(material.getBaseColorTexture()!.getMimeType()).toBe('image/png');}
      for(const node of meshes(doc))for(const primitive of node.getMesh()!.listPrimitives())if(primitive.getMaterial()===material){expect(primitive.getAttribute(`TEXCOORD_${uv[0]}`)).not.toBeNull();expect(primitive.getAttribute('NORMAL')).not.toBeNull();}
    }
  });
});
