import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {cameraClearance} from '../src/game/camera/clearance';
beforeAll(async()=>{await RAPIER.init();});
describe('rendered camera sphere clearance',()=>{
  it('allows a wall-limited distance below two meters and prevents smoothed orbit tunneling',()=>{
    const world=new RAPIER.World({x:0,y:0,z:0});
    try{
      world.createCollider(RAPIER.ColliderDesc.cuboid(.15,6.55,3.4).setTranslation(11.85,6.55,0));world.step();
      for(const from of [{x:12.4,y:5,z:0},{x:14.2,y:5,z:0}]){
        const p=cameraClearance(world,from,{x:8,y:5,z:0});expect(p.x).toBeGreaterThan(12.26);expect(p.x).toBeLessThan(12.4);
        expect(world.intersectionWithShape(p,{x:0,y:0,z:0,w:1},new RAPIER.Ball(.245))).toBeNull();
      }
      expect(cameraClearance(world,{x:14.2,y:5,z:0},{x:20,y:8,z:0})).toEqual({x:20,y:8,z:0});
    }finally{world.free();}
  });
  it('keeps the camera above a thin roof deck while a mantle changes focus height',()=>{
    const world=new RAPIER.World({x:0,y:0,z:0});
    try{
      world.createCollider(RAPIER.ColliderDesc.cuboid(11.9,.3,10.6).setTranslation(.1,12.8,0));world.step();
      const p=cameraClearance(world,{x:0,y:15,z:0},{x:0,y:10,z:0});expect(p.y).toBeGreaterThan(13.36);
      expect(world.intersectionWithShape(p,{x:0,y:0,z:0,w:1},new RAPIER.Ball(.245))).toBeNull();
    }finally{world.free();}
  });
});
