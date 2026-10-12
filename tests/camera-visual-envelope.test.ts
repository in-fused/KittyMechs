import {describe,expect,it,vi} from 'vitest';
import {Bone,BoxGeometry,BufferGeometry,Float32BufferAttribute,Group,InterleavedBuffer,InterleavedBufferAttribute,Matrix4,Mesh,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
import {createVisualEnvelopeSample,prepareVisualEnvelope,sampleVisualEnvelope,type VisualEnvelopeSample} from '../src/game/camera/visualEnvelope';

function geometry(positions:number[],indices:number[],weights:number[]):BufferGeometry {
  return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3))
    .setAttribute('skinIndex',new Uint16BufferAttribute(indices,4)).setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
}
function rig(mixed=true){
  const root=new Group(),chest=new Bone(),tail=new Bone();chest.name='chest';tail.name='tail';tail.position.set(0,0,2);chest.add(tail);root.add(chest);
  const geo=geometry([-1,0,0,1,1,0,0,0,4],[0,1,0,0,0,1,0,0,1,0,0,0],mixed?[.5,.5,0,0,.25,.75,0,0,1,0,0,0]:[1,0,0,0,1,0,0,0,1,0,0,0]);
  const mesh=new SkinnedMesh(geo,new MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);
  const skeleton=new Skeleton([chest,tail]);mesh.bind(skeleton,mesh.matrixWorld.clone());root.updateMatrixWorld(true);
  return {root,chest,tail,mesh,skeleton};
}
function contained(mesh:Mesh,out:VisualEnvelopeSample){
  const point=new Vector3(),position=mesh.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
    mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
    // Independent Three skinning world path has additional inverse roundoff.
    // This assertion tolerance is arithmetic only; the sampled bounds have no
    // inflated visual margin and the helper never rewrites weights/transforms.
    expect(out.bounds.distanceToPoint(point)).toBeLessThanOrEqual(1e-10);
  }
}

describe('shipping visual bone envelopes, prepared once and sampled without vertex scans',()=>{
  it('contains actual weighted posed vertices across independent bone motions and nested/scaled attached transforms',()=>{
    const {root,chest,tail,mesh}=rig();const scene=new Group();scene.position.set(17,-3,8);scene.rotation.set(.2,-.4,.1);scene.scale.set(1.2,.8,1.4);scene.add(root);scene.updateMatrixWorld(true);
    // Retained checks001 reproduces the literal-one inverse rejection here.
    // Three's own inversion has a nonliteral footer; do not normalize it.
    expect(mesh.bindMatrixInverse.elements[15]).not.toBe(1);
    expect(mesh.bindMatrixInverse).toEqual(mesh.matrixWorld.clone().invert());
    const prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared);
    expect(prepared.boneCount).toBe(2);expect(prepared.cornerCount).toBe(16);
    for(let pose=0;pose<8;pose++){
      chest.rotation.set(.07*pose,.12*pose,-.03*pose);tail.rotation.set(-.09*pose,.1*pose,.04*pose);tail.scale.set(1+.03*pose,1-.02*pose,1);
      root.position.set(.2*pose,.1*pose,-.3*pose);scene.updateMatrixWorld(true);
      expect(sampleVisualEnvelope(prepared,out)).toBe(out);contained(mesh,out);
      expect(out.corners.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))).toBe(true);
    }
  });

  it('merges shared-skeleton material primitives into unique bone boxes, retaining rigid paws/tails and static details',()=>{
    const {root,chest,tail,mesh,skeleton}=rig(false);
    const paws=new SkinnedMesh(geometry([-.4,-1,0,.4,-1,0],[0,0,0,0,0,0,0,0],[1,0,0,0,1,0,0,0]),new MeshBasicMaterial());root.add(paws);root.updateMatrixWorld(true);paws.bind(skeleton,paws.matrixWorld.clone());
    const badge=new Mesh(new BoxGeometry(.5,.3,.2),new MeshBasicMaterial());badge.position.set(1,1,0);badge.rotation.y=.3;badge.scale.set(2,.8,1.3);root.add(badge);root.updateMatrixWorld(true);
    const prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared);
    expect(prepared.boneCount).toBe(2);expect(prepared.staticMeshCount).toBe(1);expect(prepared.cornerCount).toBe(24);
    chest.rotation.y=.5;tail.rotation.x=-.7;root.updateMatrixWorld(true);sampleVisualEnvelope(prepared,out);
    for(const member of [mesh,paws,badge])contained(member,out);
  });

  it('reuses outputs and reads only bone matrices after preparation, without changing buffers or bindings',()=>{
    const {root,mesh,tail,skeleton}=rig();const positions=Array.from(mesh.geometry.getAttribute('position').array),bind=mesh.bindMatrix.clone(),inverse=skeleton.boneInverses.map(m=>m.clone());
    const prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared),corners=out.corners.slice(),bounds=out.bounds;
    const reads=vi.spyOn(mesh.geometry.getAttribute('position'),'getX').mockImplementation(()=>{throw new Error('per-frame vertex read');});
    for(let i=0;i<5;i++){tail.rotation.y=i*.2;root.updateMatrixWorld(true);sampleVisualEnvelope(prepared,out);expect(out.bounds).toBe(bounds);for(let j=0;j<corners.length;j++)expect(out.corners[j]).toBe(corners[j]);}
    reads.mockRestore();expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(positions);expect(mesh.bindMatrix).toEqual(bind);expect(skeleton.boneInverses).toEqual(inverse);
  });

  it('supports root detachment/reparenting and discontinuous resets without cached world-space history',()=>{
    const {root,mesh}=rig(),scene=new Group();scene.add(root);scene.updateMatrixWorld(true);
    const prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared);sampleVisualEnvelope(prepared,out);const first=out.bounds.clone();
    scene.remove(root);root.position.set(100,20,-60);root.updateMatrixWorld(true);sampleVisualEnvelope(prepared,out);contained(mesh,out);
    expect(out.bounds.min.x-first.min.x).toBeCloseTo(100,10);expect(out.bounds.min.z-first.min.z).toBeCloseTo(-60,10);
    root.position.set(0,0,0);scene.add(root);scene.updateMatrixWorld(true);sampleVisualEnvelope(prepared,out);expect(out.bounds).toEqual(first);
    mesh.bindMode='detached';expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/attached/);expect(()=>prepareVisualEnvelope(root)).toThrow(/attached/);
  });

  it('reads interleaved authored positions without modifying their data',()=>{
    const {root,mesh}=rig();const array=new Float32Array([-1,0,0,99,1,1,0,99,0,0,4,99]);
    mesh.geometry.setAttribute('position',new InterleavedBufferAttribute(new InterleavedBuffer(array,4),3,0));
    const before=Array.from(array),prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared);sampleVisualEnvelope(prepared,out);contained(mesh,out);expect(Array.from(array)).toEqual(before);
  });

  it('rejects negative/nonfinite/zero/non-normalized weights and invalid joint indices rather than normalizing data',()=>{
    for(const weights of [[-1,2,0,0],[NaN,0,0,1],[Infinity,0,0,0],[0,0,0,0],[.25,.25,0,0]]){
      const {root,mesh}=rig();mesh.geometry.setAttribute('skinWeight',new Float32BufferAttribute([...weights,1,0,0,0,1,0,0,0],4));expect(()=>prepareVisualEnvelope(root)).toThrow(/weight/);
    }
    const {root,mesh}=rig();mesh.geometry.setAttribute('skinIndex',new Float32BufferAttribute([.5,1,0,0,0,1,0,0,1,0,0,0],4));expect(()=>prepareVisualEnvelope(root)).toThrow(/joint/);
    mesh.geometry.setAttribute('skinIndex',new Uint16BufferAttribute([9,1,0,0,0,1,0,0,1,0,0,0],4));expect(()=>prepareVisualEnvelope(root)).toThrow(/joint/);
  });

  it('rejects morphs, stale attached inverses, changed bindings/attributes and nonfinite sampled transforms',()=>{
    const {root,mesh,tail}=rig();const prepared=prepareVisualEnvelope(root),out=createVisualEnvelopeSample(prepared);sampleVisualEnvelope(prepared,out);
    mesh.geometry.morphAttributes.position=[new Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3)];expect(()=>prepareVisualEnvelope(root)).toThrow(/morph/);expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/morph/);mesh.geometry.morphAttributes={};
    mesh.bindMatrixInverse=new Matrix4().makeTranslation(1,0,0);expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/inverse/);root.updateMatrixWorld(true);
    mesh.bindMatrix.elements[12]=1;expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/bind matrix changed/);mesh.bindMatrix.elements[12]=0;
    tail.matrixWorld.elements[12]=NaN;expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/nonfinite/);root.updateMatrixWorld(true);
    mesh.geometry.getAttribute('position').needsUpdate=true;expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/attributes changed/);
  });

  it('rejects unknown preparations/output owners and empty geometry',()=>{
    const {root}=rig(),prepared=prepareVisualEnvelope(root),other=prepareVisualEnvelope(rig().root),out=createVisualEnvelopeSample(other);
    expect(()=>sampleVisualEnvelope(prepared,out)).toThrow(/different preparation/);expect(()=>prepareVisualEnvelope(new Group())).toThrow(/no supported/);
  });
});
