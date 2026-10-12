import {describe,it,expect} from 'vitest';
import {BoxGeometry,BufferGeometry,Matrix4,Quaternion,Vector3} from 'three';
import {clipOverhaulFragment} from '../src/game/world/overhaulFragmentGeometry';
import {overhaulFragmentRecipe,overhaulFragmentBlock} from '../shared/overhaulFracture';
import type {CityBlock} from '../shared/cityDistrict';

function volume(g:BufferGeometry):number {
 const p=g.getAttribute('position'),a=new Vector3(),b=new Vector3(),c=new Vector3();let value=0;
 for(let i=0;i<(g.index?.count??p.count);i+=3){a.fromBufferAttribute(p,g.index?.getX(i)??i);b.fromBufferAttribute(p,g.index?.getX(i+1)??i+1);c.fromBufferAttribute(p,g.index?.getX(i+2)??i+2);value+=a.dot(b.cross(c))/6;}
 return Math.abs(value);
}
describe('Extraction039 canonical fragments retain exact native owner volume',()=>{
 for(const side of ['south','north','east','west'] as const)it(side+' whole-to-quarters conserves bounds and volume',()=>{
  const swap=side==='east'||side==='west',yaw=side==='east'?Math.PI/2:side==='west'?-Math.PI/2:side==='north'?Math.PI:0;
  const block:CityBlock={id:`7734:overhaul:extraction039:freight-hall:facade-${side}-0-0`,buildingId:'7734:overhaul:extraction039:freight-hall',part:'cell',position:[-22,1.5,-108],halfExtents:swap?[.2,1.5,3]:[3,1.5,.2],yaw:0,material:'steel'};
  const full=new BoxGeometry(2,2,2),canonical=full.clone().scale(.5,.5,.5),scale=new Vector3(swap?block.halfExtents[2]:block.halfExtents[0],block.halfExtents[1],swap?block.halfExtents[0]:block.halfExtents[2]),rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw);
  let total=0;
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
  try {for(const recipe of overhaulFragmentRecipe(block)){
   const native=overhaulFragmentBlock(block,recipe.piece),fragment=clipOverhaulFragment(canonical,recipe.canonicalOffset).scale(2,2,2),matrix=new Matrix4().compose(new Vector3(...native.position),rotation,scale);
   try {total+=volume(fragment);fragment.applyMatrix4(matrix);fragment.computeBoundingBox();min.min(fragment.boundingBox!.min);max.max(fragment.boundingBox!.max);
    for(let axis=0;axis<3;axis++){expect(fragment.boundingBox!.min.getComponent(axis)).toBeCloseTo(native.position[axis]-native.halfExtents[axis],5);expect(fragment.boundingBox!.max.getComponent(axis)).toBeCloseTo(native.position[axis]+native.halfExtents[axis],5);}
   }finally{fragment.dispose();}
  }
  expect(total).toBeCloseTo(volume(full),5);
  for(let axis=0;axis<3;axis++){expect(min.getComponent(axis)).toBeCloseTo(block.position[axis]-block.halfExtents[axis],5);expect(max.getComponent(axis)).toBeCloseTo(block.position[axis]+block.halfExtents[axis],5);}
  }finally{full.dispose();canonical.dispose();}
 });
});
