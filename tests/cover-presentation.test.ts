import {describe,expect,it} from 'vitest';
import {BoxGeometry,InstancedMesh,Matrix4,MeshBasicMaterial,Vector3} from 'three';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {createPropPresentation} from '../src/game/world/propPresentation';
import type {CoverState} from '../shared/types';
import type {PropDescriptor} from '../shared/world';
import {breakableCover} from '../shared/traversal';

describe('cover visibility on the actor presentation clock',()=>{
  it('changes actual instance matrices and collider-removal listener at the same displayed boundary, including suspended and late listeners',()=>{
    const presentation=new CityPresentation(),geometry=new BoxGeometry(),material=new MeshBasicMaterial(),mesh=new InstancedMesh(geometry,material,1);
    const prop:PropDescriptor={kind:'wall',id:breakableCover(7734)[0].id,x:12,y:4,z:-8,rotation:.73,scale:.85,breakableHp:180},part=new Matrix4().makeTranslation(1,2,3);
    const alive:CoverState={id:prop.id!,hp:180,maxHp:180,destroyedAt:null},broken:CoverState={...alive,hp:0,destroyedAt:5.1};
    const apply=createPropPresentation(mesh,[prop],part),mat=new Matrix4(),changes:{tick:number;visible:boolean}[]=[];
    const stopMesh=presentation.register(state=>{apply(state);mesh.getMatrixAt(0,mat);changes.push({tick:state.tick,visible:mat.determinant()!==0});});
    const removed:number[]=[];presentation.register(state=>{if(state.cover.some(c=>c.destroyedAt!==null))removed.push(state.tick);});
    presentation.push(100,5,[],[alive]);presentation.push(106,5.1,[],[broken]);broken.hp=90;
    presentation.present(5.099);expect(removed).toEqual([]);expect(changes).toEqual([{tick:100,visible:true}]);
    const expected=new Matrix4().makeRotationY(prop.rotation).scale(new Vector3(prop.scale,prop.scale,prop.scale)).setPosition(prop.x,prop.y,prop.z).multiply(part);
    mesh.getMatrixAt(0,mat);for(let i=0;i<16;i++)expect(mat.elements[i]).toBeCloseTo(expected.elements[i],5);
    presentation.present(5.1);expect(removed).toEqual([106]);expect(changes.at(-1)).toEqual({tick:106,visible:false});mesh.getMatrixAt(0,mat);expect(mat.determinant()).toBe(0);expect(presentation.read()?.cover[0].hp).toBe(0);
    stopMesh();presentation.push(112,5.2,[],[]);presentation.present(5.2);const late=createPropPresentation(mesh,[prop],part),stopLate=presentation.register(late);mesh.getMatrixAt(0,mat);expect(mat.determinant()).toBe(0);expect(presentation.read()?.cover[0].destroyedAt).toBe(5.1);
    presentation.present(4);mesh.getMatrixAt(0,mat);expect(mat.determinant()).toBe(0);
    stopLate();mesh.dispose();geometry.dispose();material.dispose();
  });
  it('notifies partial cover damage without a city revision and never restores a removed cover from later stale contents',()=>{
    const presentation=new CityPresentation(),seen:number[]=[],id=breakableCover(7734)[0].id!;presentation.register(state=>seen.push(state.cover[0].hp));
    presentation.push(1,1,[],[{id,hp:180,maxHp:180,destroyedAt:null}]);presentation.present(1);
    presentation.push(2,2,[],[{id,hp:120,maxHp:180,destroyedAt:null}]);presentation.present(2);
    presentation.push(3,3,[],[{id,hp:0,maxHp:180,destroyedAt:3}]);presentation.present(3);
    presentation.push(4,4,[],[{id,hp:180,maxHp:180,destroyedAt:null}]);presentation.present(4);
    expect(seen).toEqual([180,120,0]);expect(presentation.read()?.cover[0]).toMatchObject({hp:0,destroyedAt:3});
  });
});
