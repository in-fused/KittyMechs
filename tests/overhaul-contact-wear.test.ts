import {beforeAll,it,expect} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {terrainHeight} from '../shared/world';
beforeAll(async()=>{await RAPIER.init();});
it('ordinary held climb wears only actual gripped building cells and retains roof support',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),a=sim.addActor('climber','Climber','pounce',false,{x:-29,y:terrainHeight(-29,38,7734)+.92,z:38});let seq=0;
 const step=(climb=false,forward=0)=>{sim.setInput(a.id,{...emptyInput(),seq:++seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,climb,forward});sim.step(1/60);};
 try{for(let i=0;i<180;i++)step();const initial=sim.snapshot().structures;for(let i=0;i<350;i++)step(true,1);const changed=sim.snapshot().structures.filter((s,i)=>s.hp.some((hp,j)=>hp<initial[i].hp[j]));expect(changed.length).toBeGreaterThan(0);expect(changed.every(s=>s.id.includes('spawn-west'))).toBe(true);expect(a.position.y).toBeGreaterThan(8);expect(sim.snapshot().ruins).toHaveLength(0);}finally{sim.dispose();world.free();}
});
it('holding claw away from physical contact cannot invent wear',()=>{
 const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),a=sim.addActor('climber','Climber','pounce');let seq=0;const initial=sim.snapshot().structures;
 try{for(let i=0;i<180;i++){sim.setInput(a.id,{...emptyInput(),seq:++seq,jumpEpoch:a.jumpEpoch,strikeEpoch:a.jumpEpoch,climb:true});sim.step(1/60);}expect(a.climb).toBeNull();expect(sim.snapshot().structures).toEqual(initial);}finally{sim.dispose();world.free();}
});
