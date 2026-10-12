import fs from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation,type SimulationOptions} from '../shared/simulation';
import {OwnedCharacterMotion} from '../shared/ownedCharacterMotion';
import {CityRubbleOwner} from '../shared/cityRubble';
import {cityDistrict} from '../shared/cityDistrict';
import {parseInput} from '../shared/protocol';
import {emptyInput,type InputState} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const bank=cityDistrict(7734)!.structures.find(s=>s.id==='7734:city:building-0:facade')!,cell=bank.cells[3],dt=1/60;
type Scope={
  physics:Map<string,{collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController}>;
  characterMotion:OwnedCharacterMotion;rubbleOwner:CityRubbleOwner;
  pendingRubble:Map<string,unknown>;rubbleHandles:ReadonlySet<number>;
  rubbleControllers:Map<RAPIER.KinematicCharacterController,unknown>;
  excludedDynamicColliders:ReadonlySet<number>|null;
  movementFilter:(collider:RAPIER.Collider)=>boolean;
};
const settings=(controller:RAPIER.KinematicCharacterController)=>({
  impulses:controller.applyImpulsesToDynamicBodies(),mass:controller.characterMass(),
  autostep:controller.autostepEnabled(),height:controller.autostepMaxHeight(),
  width:controller.autostepMinWidth(),dynamicStep:controller.autostepIncludesDynamicBodies(),
  snap:controller.snapToGroundDistance(),
});

/** Controlled supported source retained from the physical-rubble tests. Only
 * parsed pulse/movement requests damage the cell. The foreign cuboid is an
 * explicitly declared filter fixture, not source rubble or an actor shortcut. */
describe('physical city rubble requires an explicit authority experiment',()=>{
  for(const option of ['omitted','false'] as const)for(const owner of ['dedicated','external'] as const)
    it(`${option} option preserves original native movement and no debris ownership in ${owner}`,()=>{
      const world=new RAPIER.World({x:0,y:-22,z:0}),sim=option==='omitted'
        ?new Simulation(world,7734,'pvp','TRAINING',RAPIER)
        :new Simulation(world,7734,'pvp','TRAINING',RAPIER,{experimentalPhysicalRubble:false});
      const actor=sim.addActor('pilot','Gate source','pounce',false,{x:123,y:.92,z:cell.position[2]}),scope=sim as unknown as Scope,p=scope.physics.get(actor.id)!,original=settings(p.controller);
      const inputRows:unknown[]=[],frames:unknown[]=[],queryRows:{tick:number;flags:number|undefined;originalPredicate:boolean;foreignHit:boolean}[]=[];
      let sequence=0,optInCalls=0,foreign:RAPIER.Collider|null=null;
      const compute=scope.characterMotion.computeColliderMovement.bind(scope.characterMotion),dynamic=scope.characterMotion.computeColliderMovementWithDynamics.bind(scope.characterMotion);
      scope.characterMotion.computeColliderMovement=(controller,...args)=>{
        expect(args[0]).toBe(p.collider);expect(args[2]).toBe(RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);expect(args[3]).toBeUndefined();expect(args[4]).toBe(scope.movementFilter);
        compute(controller,...args);
        // Read collisions only AFTER the motion helper restored owned bodies.
        let foreignHit=false;for(let i=0;i<controller.numComputedCollisions();i++)if(controller.computedCollision(i)?.collider?.handle===foreign?.handle)foreignHit=true;
        queryRows.push({tick:sim.tick,flags:args[2],originalPredicate:args[4]===scope.movementFilter,foreignHit});
      };
      scope.characterMotion.computeColliderMovementWithDynamics=(...args)=>{optInCalls++;dynamic(...args);};
      const noOwnedRubble=()=>{
        expect(sim.experimentalPhysicalRubble).toBe(false);expect(sim.rubble).toEqual([]);expect(sim.snapshot().rubble).toEqual([]);
        expect(scope.pendingRubble.size).toBe(0);expect(scope.rubbleOwner.bodyCount).toBe(0);expect(scope.rubbleOwner.colliderHandles().size).toBe(0);expect(scope.rubbleHandles.size).toBe(0);
        expect(scope.excludedDynamicColliders).toBeNull();expect(scope.rubbleControllers.size).toBe(0);expect(settings(p.controller)).toEqual(original);
      };
      const step=(patch:Partial<InputState>={})=>{
        const input=parseInput({...emptyInput(),seq:++sequence,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,stance:actor.stance,yaw:Math.PI/2,...patch});expect(input).not.toBeNull();inputRows.push({tick:sim.tick,input});sim.setInput(actor.id,input!);
        sim.step(dt,owner==='dedicated');if(owner==='external'){world.timestep=dt;world.step();}
        noOwnedRubble();frames.push({tick:sim.tick,time:sim.time,position:{...actor.position},grounded:actor.grounded,mask:sim.structures.find(s=>s.id===bank.id)!.brokenMask,dynamicBodies:world.bodies.getAll().filter(b=>b.isDynamic()).length,settings:settings(p.controller)});
      };
      try{
        expect(original.impulses).toBe(false);expect(original.mass).toBeNull();expect(original.autostep).toBe(true);expect(original.dynamicStep).toBe(true);
        for(let i=0;i<60;i++)step();expect(actor.grounded).toBe(true);
        for(let i=0;i<25;i++)step({fire:true});expect(sim.tick).toBe(85);expect(sim.structures.find(s=>s.id===bank.id)!.hp[3]).toBe(0);expect(sim.structures.find(s=>s.id===bank.id)!.brokenMask).toBe(8);
        expect(sim.events.filter(e=>e.type==='structure-break'&&e.structureId===bank.id&&e.cellId===3)).toHaveLength(1);expect(world.bodies.getAll().filter(b=>b.isDynamic())).toHaveLength(0);
        step();expect(sim.tick).toBe(86);expect(world.bodies.getAll().filter(b=>b.isDynamic())).toHaveLength(0);
        const hole=new RAPIER.Ray({x:122,y:1.5,z:cell.position[2]},{x:-1,y:0,z:0});expect(world.castRay(hole,10,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC)).toBeNull();
        // Foreign native dynamics remain excluded by the original KCC tuple;
        // no broad opt-in flag or replacement predicate is admitted globally.
        const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(120.5,.6,cell.position[2]));
        foreign=world.createCollider(RAPIER.ColliderDesc.cuboid(.4,.4,.4),body);
        const start=actor.position.x;for(let i=0;i<60;i++)step({forward:1});
        expect(start-actor.position.x).toBeGreaterThan(4);expect(actor.position.x+1.75).toBeLessThan(120.1);expect(actor.grounded).toBe(true);
        expect(queryRows.length).toBe(146);expect(queryRows.every(q=>q.originalPredicate&&!q.foreignHit)).toBe(true);expect(optInCalls).toBe(0);expect(actor.hp).toBe(actor.maxHp);
      }finally{
        const out=process.env.CITY_RUBBLE_GATE_EVIDENCE;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/${option}-${owner}.json`,JSON.stringify({inputRows,frames,queryRows,optInCalls,physicsFailed:sim.physicsFailed},null,2));}
        sim.dispose();world.free();
      }
    },30000);

  it('only literal true opts in and later caller mutation cannot change the copied option',()=>{
    for(const value of [1,'true',{},false,undefined]){
      const world=new RAPIER.World({x:0,y:-22,z:0}),options={experimentalPhysicalRubble:value} as unknown as SimulationOptions,sim=new Simulation(world,7734,'pvp','TRAINING',RAPIER,options);
      try{expect(sim.experimentalPhysicalRubble).toBe(false);options.experimentalPhysicalRubble=true;expect(sim.experimentalPhysicalRubble).toBe(false);expect(sim.rubble).toEqual([]);}finally{sim.dispose();world.free();}
    }
  });
});
