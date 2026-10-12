import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Matrix4,Mesh,Ray,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
import {STRUCTURAL_PROP_KINDS,isStructuralPropKind,structuralPropCollision,structuralPropCollisionReceipt,structuralPropPatches,type StructuralPropKind} from '../shared/structuralPropCollision';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const uints=(encoded:string)=>{const bytes=Buffer.from(encoded,'base64');return Array.from({length:bytes.length/4},(_,i)=>bytes.readUInt32LE(i*4));};
function cast(kind:StructuralPropKind,origin:Vector3,direction:Vector3):{distance:number;normal:Vector3}|null {
  const mesh=structuralPropCollision(kind),ray=new Ray(origin,direction),a=new Vector3(),b=new Vector3(),c=new Vector3(),point=new Vector3();let best:{distance:number;normal:Vector3}|null=null;
  for(let i=0;i<mesh.indices.length;i+=3){a.fromArray(mesh.vertices,mesh.indices[i]*3);b.fromArray(mesh.vertices,mesh.indices[i+1]*3);c.fromArray(mesh.vertices,mesh.indices[i+2]*3);if(!ray.intersectTriangle(a,b,c,false,point))continue;
    const distance=point.distanceTo(origin);if(!best||distance<best.distance)best={distance,normal:new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a)).normalize()};
  }return best;
}
describe('exact shipping structural prop contracts (CPU only)',()=>{
  for(const kind of STRUCTURAL_PROP_KINDS)it(`${kind}: keeps shipping hashes, triangle/component/patch ownership and single renderer transform`,async()=>{
    const receipt=structuralPropCollisionReceipt(kind),bytes=readFileSync(receipt.source),mesh=structuralPropCollision(kind);
    expect(sha(bytes)).toBe(receipt.sourceSha256);expect(sha(new Uint8Array(mesh.vertices.buffer))).toBe(receipt.positionsSha256);expect(sha(new Uint8Array(mesh.indices.buffer))).toBe(receipt.indicesSha256);
    expect(mesh.vertices.length).toBe(receipt.vertexCount*3);expect(mesh.indices.length).toBe(receipt.triangleCount*3);expect([...mesh.vertices].every(Number.isFinite)).toBe(true);expect([...mesh.indices].every(i=>i<receipt.vertexCount)).toBe(true);
    const owned=receipt.components.flatMap(c=>c.triangleIds);expect(new Set(owned).size).toBe(receipt.triangleCount);expect(owned.length).toBe(receipt.triangleCount);
    const components=new Map(receipt.components.map(c=>[c.id,c]));expect(new Set(components.keys()).size).toBe(receipt.components.length);
    for(const c of receipt.components){expect(Number.isFinite(c.signedVolume)).toBe(true);expect([...c.bounds.min,...c.bounds.max].every(Number.isFinite)).toBe(true);expect(receipt.primitives.some(p=>p.id===c.primitiveId)).toBe(true);}
    for(const patch of structuralPropPatches(kind)){const component=components.get(patch.componentId)!;expect(component).toBeDefined();expect(patch.triangleIds.every(t=>component.triangleIds.includes(t))).toBe(true);
      const n=new Vector3().fromArray(patch.normal);expect(n.length()).toBeCloseTo(1,8);
      for(const t of patch.triangleIds)for(let k=0;k<3;k++){const p=new Vector3().fromArray(mesh.vertices,mesh.indices[t*3+k]*3);expect(Math.abs(p.dot(n)-patch.plane)).toBeLessThan(.00003);}
    }
    // Independent GLTFLoader membership/world matrices are the renderer's path.
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(texturelessGeometryGlb(bytes),'');gltf.scene.updateMatrixWorld(true);
    const rendered:Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof Mesh)rendered.push(o);});
    expect(rendered.length).toBe(receipt.primitives.length);
    const instance=new Matrix4().makeRotationY(.713).scale(new Vector3(.85,.85,.85)).setPosition(17,4,-21),scaled=structuralPropCollision(kind,.85);
    for(const primitive of receipt.primitives){
      const object=rendered.find(o=>(gltf.parser.associations.get(o) as {primitives?:number}|undefined)?.primitives===primitive.primitiveIndex)!;expect(object).toBeDefined();
      const sourceVertices=uints(primitive.sourceVertexIndicesLE),sourceTriangles=uints(primitive.sourceTriangleIndicesLE),position=object.geometry.attributes.position,sourceIndices=object.geometry.index;
      expect(sourceVertices.length).toBe(primitive.triangleCount*3);expect(sourceTriangles.length).toBe(primitive.triangleCount);expect(sourceVertices.every(i=>i<primitive.sourcePositionCount)).toBe(true);
      expect(primitive.uvAttributes.every(a=>a.count===primitive.sourcePositionCount)).toBe(true);
      for(let i=0;i<sourceVertices.length;i++){
        const original=sourceVertices[i],triangle=sourceTriangles[Math.floor(i/3)];expect(original).toBe(sourceIndices?sourceIndices.getX(triangle*3+i%3):triangle*3+i%3);
        const render=new Vector3().fromBufferAttribute(position,original).applyMatrix4(object.matrixWorld),id=mesh.indices[primitive.triangleStart*3+i],collision=new Vector3().fromArray(mesh.vertices,id*3);
        expect(collision.distanceTo(render)).toBeLessThan(.000003);
        if(i%51===0){const expected=render.clone().applyMatrix4(instance),actual=new Vector3().fromArray(scaled.vertices,id*3).applyMatrix4(new Matrix4().makeRotationY(.713).setPosition(17,4,-21));expect(actual.distanceTo(expected)).toBeLessThan(.000005);}
      }
    }
  });
  it('preserves tower/crane openings, pipe underpasses and curved side normals',()=>{
    const forward=new Vector3(0,0,1);
    expect(cast('tower',new Vector3(1,5,-10),forward)).toBeNull();expect(cast('tower',new Vector3(0,5,-10),forward)).not.toBeNull();
    expect(cast('crane',new Vector3(0,10,-10),forward)).toBeNull();expect(cast('crane',new Vector3(1,10,-10),forward)).not.toBeNull();
    expect(cast('pipes',new Vector3(0,.4,-10),forward)).toBeNull();const lower=cast('pipes',new Vector3(0,1.2,-10),forward)!,upper=cast('pipes',new Vector3(0,1.6,-10),forward)!;
    expect(lower).not.toBeNull();expect(upper).not.toBeNull();expect(lower.normal.distanceTo(upper.normal)).toBeGreaterThan(.1);
    // Actual wall upper geometry remains present, without the old ±3m box fill.
    expect(cast('wall',new Vector3(0,4,-10),forward)).not.toBeNull();expect(cast('wall',new Vector3(0,2,2.5),new Vector3(1,0,0))).toBeNull();
  });
  it('validates kinds/scales and never changes cached local geometry during instance scaling',()=>{
    for(const kind of STRUCTURAL_PROP_KINDS){const base=structuralPropCollision(kind),copy=base.vertices.slice(),scaled=structuralPropCollision(kind,1.3);expect(scaled.vertices).not.toBe(base.vertices);expect(scaled.indices).toBe(base.indices);expect(base.vertices).toEqual(copy);expect(structuralPropCollision(kind).vertices).toBe(base.vertices);}
    expect(isStructuralPropKind('crane')).toBe(true);expect(isStructuralPropKind('workshop')).toBe(false);
    expect(()=>structuralPropCollision('workshop' as StructuralPropKind)).toThrow();for(const scale of [0,-1,NaN,Infinity])expect(()=>structuralPropCollision('tower',scale)).toThrow();
  });
});
