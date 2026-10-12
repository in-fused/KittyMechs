import {describe,expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Matrix4,Mesh,MeshStandardMaterial,Texture,Vector3} from 'three';
import asset from '../shared/data/city-fracture-v1.json';
import {cityDistrict,type CityBlock} from '../shared/cityDistrict';
import {cityFractureCenter} from '../shared/cityFracture';
import {buildCityFractureGeometry} from '../src/game/world/cityFractureGeometry';
import {CityFractureRenderer} from '../src/game/world/cityFractureRenderer';
import {CityDebrisPool} from '../src/game/world/cityFragments';
import {buildCityGeometry} from '../src/game/world/cityGeometry';

const district=cityDistrict(7734)!;
describe('source-component fracture buffers and scene ownership',()=>{
  const sourceCells=[district.structures[0].cells[0],district.blocks.find(b=>b.id.includes(':support-'))!,district.blocks.find(b=>b.structureId&&b.part==='deck')!];
  for(const source of sourceCells)it(`reassembles ${source.id}, source UVs and transformed face normals`,()=>{
    const size={x:source.halfExtents[0]*2,y:source.halfExtents[1]*2,z:source.halfExtents[2]*2},unit=source.material==='brick'?2:4;
    const batches=buildCityGeometry(district),batch=batches.find(b=>b.ranges.some(r=>r.block.id===source.id))!,range=batch.ranges.find(r=>r.block.id===source.id)!;
    const sourcePositions=batch.geometry.attributes.position,sourceUV=batch.geometry.attributes.uv;
    const faces=Array.from({length:6},(_,i)=>{const id=range.indices[i*6],p=new Vector3().fromBufferAttribute(sourcePositions,id);return {p,u:sourceUV.getX(id),v:sourceUV.getY(id)};});
    let exterior=0,interior=0;
    for(const piece of asset.pieces){
      const geometry=buildCityFractureGeometry(piece,size,unit),center=cityFractureCenter(source,piece),positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
      for(let i=0;i<positions.count;i++){
        const p=new Vector3().fromBufferAttribute(positions,i).add(center),n=new Vector3().fromBufferAttribute(normals,i);
        expect(n.length()).toBeCloseTo(1,5);
        p.toArray().forEach((v,axis)=>expect(v).toBeGreaterThanOrEqual(source.position[axis]-source.halfExtents[axis]-1e-5));
        p.toArray().forEach((v,axis)=>expect(v).toBeLessThanOrEqual(source.position[axis]+source.halfExtents[axis]+1e-5));
        if(geometry.attributes.fractureInterior.getX(i)){interior++;continue;}
        exterior++;
        // Independently derive the linear UV plane from the real source face.
        const axis=Math.abs(n.x)>.99?0:Math.abs(n.y)>.99?1:2,positive=n.getComponent(axis)>0,face=faces[axis*2+(positive?0:1)],dx=p.x-face.p.x,dy=p.y-face.p.y,dz=p.z-face.p.z;
        const expected=axis===0?[face.u+(positive?-dz:dz)/unit,face.v+dy/unit]:axis===1?[face.u+dx/unit,face.v+(positive?-dz:dz)/unit]:[face.u+(positive?dx:-dx)/unit,face.v+dy/unit];
        expect(uv.getX(i)).toBeCloseTo(expected[0],5);expect(uv.getY(i)).toBeCloseTo(expected[1],5);
      }
      for(let i=0;i<positions.count;i+=3){const a=new Vector3().fromBufferAttribute(positions,i),b=new Vector3().fromBufferAttribute(positions,i+1),c=new Vector3().fromBufferAttribute(positions,i+2),normal=b.sub(a).cross(c.sub(a)).normalize();expect(normal.dot(new Vector3().fromBufferAttribute(normals,i))).toBeGreaterThan(.9999);}
      geometry.dispose();
    }
    expect(exterior).toBeGreaterThan(0);expect(interior).toBeGreaterThan(0);for(const b of batches)b.geometry.dispose();
  });
  it('rotates the actual translated component exactly once',()=>{
    const source:CityBlock={...sourceCells[0],yaw:.73,position:[17,29,-43]},size={x:source.halfExtents[0]*2,y:source.halfExtents[1]*2,z:source.halfExtents[2]*2},rotation=new Matrix4().makeRotationY(source.yaw);
    for(const piece of asset.pieces){const center=cityFractureCenter(source,piece);for(let i=0;i<piece.positions.length;i+=3){
      const reconstructed=new Vector3(piece.positions[i]*size.x,piece.positions[i+1]*size.y,piece.positions[i+2]*size.z).applyMatrix4(rotation).add(center);
      const independent=new Vector3((piece.positions[i]+piece.center[0])*size.x,(piece.positions[i+1]+piece.center[1])*size.y,(piece.positions[i+2]+piece.center[2])*size.z).applyMatrix4(rotation).add(new Vector3(...source.position));
      expect(reconstructed.distanceTo(independent)).toBeLessThan(1e-10);
    }}
  });
  it('owns batches and samplers across setup-cleanup-setup, without disposing cached source art',()=>{
    const factory=new Group(),sourceTexture=new Texture(),brick=new MeshStandardMaterial({map:sourceTexture}),steel=new MeshStandardMaterial({map:sourceTexture}),geometry=new BoxGeometry();
    brick.name='modular_factory_facade_brick';steel.name='modular_factory_facade_garage';factory.add(new Mesh(geometry,[brick,steel]));
    const originalDispose=vi.spyOn(sourceTexture,'dispose'),brickDispose=vi.spyOn(brick,'dispose'),steelDispose=vi.spyOn(steel,'dispose');
    const state=district.structures.map(s=>({id:s.id,layoutVersion:1 as const,revision:1,brokenMask:1,hp:s.cells.map((_,i)=>i? s.maxHp:0)})),pool=new CityDebrisPool(district);
    const rows=district.structures.filter(s=>s.cells[0].part==='cell').slice(0,8).map((s,i)=>({id:i,type:'structure-break' as const,at:1,position:{x:s.cells[0].position[0],y:s.cells[0].position[1],z:s.cells[0].position[2]},incoming:{x:1,y:0,z:0},normal:{x:-1,y:0,z:0},structureId:s.id,cellId:0}));
    pool.update(rows,state,1);expect(pool.fragments).toHaveLength(48);
    for(let setup=0;setup<2;setup++){
      const renderer=new CityFractureRenderer(district,asset,factory,null);renderer.update(pool.fragments,1.1);expect(renderer.diagnostics().visible).toBe(48);expect(renderer.diagnostics().batches).toBe(4);
      const disposals=renderer.group.children.map(mesh=>vi.spyOn((mesh as Mesh).geometry,'dispose'));
      renderer.update(pool.fragments,4);expect(renderer.diagnostics().visible).toBe(0);renderer.dispose();renderer.dispose();expect(renderer.group.children).toHaveLength(0);for(const spy of disposals)expect(spy).toHaveBeenCalledTimes(1);
    }
    expect(originalDispose).not.toHaveBeenCalled();expect(brickDispose).not.toHaveBeenCalled();expect(steelDispose).not.toHaveBeenCalled();sourceTexture.dispose();brick.dispose();steel.dispose();geometry.dispose();
  });
});
