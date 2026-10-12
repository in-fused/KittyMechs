import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { buildOverhaulDistrict, getOverhaulComponent, OVERHAUL_LOTS } from '../shared/overhaulDistrict';
import { commitOverhaulSupport, compileOverhaulSupport, overhaulContactLive, overhaulContactOwnership, resolveOverhaulSupport, type OverhaulContactReceipt } from '../shared/overhaulSupport';
import { getMap } from '../shared/maps';
import type { StructureState } from '../shared/types';
import {OVERHAUL_ARCHITECTURE_PREFIX} from '../shared/overhaulArchitecture';
import {isRainlineExtraction039Block} from '../shared/rainlineExtraction039';
import {cityBlockColliderDesc} from '../shared/rainlineStreetAdmission';

const district = buildOverhaulDistrict(7734)!;
const graph = compileOverhaulSupport(district);
const buildingId = '7734:overhaul:spawn-west';
const initial = (): StructureState[] => district.structures.map(s => ({ id: s.id, layoutVersion: 1, revision: 0, brokenMask: 0, hp: s.cells.map(() => s.maxHp) }));
const breakCell = (states: StructureState[], bankId: string, cellId: number) => { const state = states.find(s => s.id === bankId)!; state.hp[cellId] = 0; state.brokenMask = (state.brokenMask | (1 << cellId)) >>> 0; state.revision++; };
const receipt = (blockId: string, surface: 'wall' | 'roof', anchorId: string): OverhaulContactReceipt => { const node = graph.byBlock.get(blockId)!; return { generation: 7, blockId, structureId: node.structureId, cellId: node.cellId, revision: 0, surface, anchorId }; };
beforeAll(async()=>{await RAPIER.init();});

describe('authored first Rainline district', () => {
  it('keeps bounded stable component banks with one exact common solid per cell', () => {
    expect(buildOverhaulDistrict(1926)).toBeNull(); expect(buildOverhaulDistrict(4107)).toBeNull();
    expect(buildOverhaulDistrict(7734)).toBe(district);
    expect(OVERHAUL_LOTS).toHaveLength(20);
    // Keep the original district budget while bounding the appended pocket
    // separately; the extraction test compares the full031 prefix verbatim.
    const legacyBlocks=district.blocks.filter(b=>!isRainlineExtraction039Block(b)),extractionBlocks=district.blocks.filter(isRainlineExtraction039Block);
    expect(legacyBlocks.length).toBeGreaterThan(900); expect(legacyBlocks.length).toBeLessThanOrEqual(1200);
    expect(extractionBlocks.length).toBeLessThanOrEqual(150);
    expect(graph.nodes).toHaveLength(district.blocks.length);
    expect(new Set(district.blocks.map(b => b.id)).size).toBe(district.blocks.length);
    for (const bank of district.structures) {
      expect(bank.cells.length).toBeLessThanOrEqual(32); expect(bank.maxHp).toBeGreaterThan(0);
      for (const block of bank.cells) { expect(district.blocks).toContain(block); expect(getOverhaulComponent(block)).toBeDefined(); expect(block.halfExtents.every(n => n > 0)).toBe(true); }
    }
    expect(resolveOverhaulSupport(graph, initial()).brokenBlockIds).toEqual([]);
  });
  it('preserves floor-level capsule routes, spawn and objective entry clearance', () => {
    const map = getMap(7734), entryPoints = [map.spawn, ...map.objectives.map(o => o.position)];
    const lowBlocks = district.blocks.filter(b => b.position[1] - b.halfExtents[1] < 3.8 && b.position[1] + b.halfExtents[1] > 0);
    const clearance = (x: number, z: number) => {
      let distance = Infinity, obstruction = '';
      for (const block of lowBlocks) {
        const dx = Math.max(0, Math.abs(x - block.position[0]) - block.halfExtents[0]), dz = Math.max(0, Math.abs(z - block.position[2]) - block.halfExtents[2]);
        const candidate = Math.hypot(dx, dz); if (candidate < distance) { distance = candidate; obstruction = `${block.id} near (${x},${z})`; }
      }
      return { distance, obstruction };
    };
    entryPoints.forEach(p => { const result = clearance(p.x, p.z); expect(result.distance, result.obstruction).toBeGreaterThanOrEqual(4.5); });
    // Projecting a .125m inspection hatch into a 2D exclusion box falsely
    // treats walkable ground as a tall barrier. Admit every original route
    // using the shipping native controller and actual cuboid/convex solids;
    // no prop, route or positive obstruction is omitted from the world.
    const world=new RAPIER.World({x:0,y:-22,z:0});
    try{
      const owners=new Map<number,string>();
      for(const block of district.blocks){const c=world.createCollider(cityBlockColliderDesc(block).setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));owners.set(c.handle,block.id);}
      // Same fixed graded ground height, covering only the authored rectangle.
      const g=district.grading;world.createCollider(RAPIER.ColliderDesc.cuboid((g.maxX-g.minX)/2,.1,(g.maxZ-g.minZ)/2).setTranslation((g.minX+g.maxX)/2,g.height-.1,(g.minZ+g.maxZ)/2));
      const radius=2.05,height=3.8,body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(height/2-.12,radius-.12,.12),body),controller=world.createCharacterController(.02);
      // Exact shared/simulation.ts addActor profile, including native stepping.
      controller.enableAutostep(.55,.2,true);controller.enableSnapToGround(.35);controller.setMaxSlopeClimbAngle(Math.PI/3.5);controller.setMinSlopeSlideAngle(Math.PI/3);world.step();
      const failures:string[]=[];
      for(const street of district.streets){const [a,b]=street.points,length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/.25),dx=(b.x-a.x)/steps,dz=(b.z-a.z)/steps;
        let position={x:a.x,y:g.height+height/2+.02,z:a.z};body.setTranslation(position,true);world.propagateModifiedBodyPositionsToColliders();
        for(let step=0;step<steps;step++){
          controller.computeColliderMovement(collider,{x:dx,y:-.1,z:dz});const move=controller.computedMovement();position={x:position.x+move.x,y:position.y+move.y,z:position.z+move.z};body.setTranslation(position,true);world.propagateModifiedBodyPositionsToColliders();
          const expected={x:a.x+(step+1)*dx,z:a.z+(step+1)*dz},error=Math.hypot(position.x-expected.x,position.z-expected.z);
          if(![position.x,position.y,position.z].every(Number.isFinite)||error>.05){const hits:string[]=[];for(let i=0;i<controller.numComputedCollisions();i++){const hit=controller.computedCollision(i);if(hit?.collider)hits.push(owners.get(hit.collider.handle)??'graded ground');}failures.push(`${street.id} at sample ${step+1}/${steps}: centerline deviation ${error}, collisions ${hits.join(', ')}`);break;}
        }
      }
      world.removeCharacterController(controller);
      expect(failures,'Full radius2.05m/height3.8m native route traversal; inherited obstruction remains a failure.').toEqual([]);
    }finally{world.free();}
  });
});
describe('deterministic local structural survival', () => {
  it('keeps a roof quarter with one surviving redundant column, then drops its slab and attached facade', () => {
    const states = initial(), frame = `${buildingId}:frame-bank`;
    breakCell(states, frame, 0);
    let closure = resolveOverhaulSupport(graph, states);
    expect(closure.brokenBlockIds).toEqual([`${buildingId}:column-0-0`]);
    breakCell(states, frame, 1); closure = resolveOverhaulSupport(graph, states);
    expect(closure.unsupportedBlockIds).toContain(`${buildingId}:roof-0`);
    expect(closure.unsupportedBlockIds.filter(id => id.includes(':facade-'))).toHaveLength(8);
    expect(closure.brokenBlockIds).not.toContain(`${buildingId}:roof-1`);
    expect(closure.brokenBlockIds).not.toContain(`${buildingId}:roof-2`);
    expect(closure.brokenBlockIds).not.toContain(`${buildingId}:roof-3`);
    expect(closure.brokenByBank.find(b => b.structureId === `${buildingId}:roof-bank`)!.cellIds).toEqual([0]);
  });
  it('propagates foundation loss through frame, slab and facade, with unsigned bit31 masks', () => {
    const states = initial(); breakCell(states, `${buildingId}:foundation-bank`, 0);
    const closure = resolveOverhaulSupport(graph, states), buildingBlocks = district.blocks.filter(b => b.buildingId === buildingId);
    const roofApparatus=district.blocks.filter(b=>b.buildingId===`7734:overhaul:dressing:roof-${buildingId.split(':').at(-1)}`);
    const attachedArchitecture=district.blocks.filter(b=>b.buildingId===OVERHAUL_ARCHITECTURE_PREFIX+'loading-monitor');
    expect(new Set(closure.brokenBlockIds)).toEqual(new Set([...buildingBlocks,...roofApparatus,...attachedArchitecture].map(b=>b.id)));
    expect(closure.brokenByBank.find(b => b.structureId === `${buildingId}:facade-bank`)!.brokenMask).toBe(0xffffffff);
    const changed = commitOverhaulSupport(closure, states);
    expect(changed).toContain(`${buildingId}:facade-bank`);
    expect(states.find(s => s.id === `${buildingId}:facade-bank`)!.hp.every(hp => hp === 0)).toBe(true);
    expect(commitOverhaulSupport(closure, states)).toEqual([]);
  });
  it('retains opposite gantry support, then detaches beam/deck/rail when either end loses both pylons', () => {
    const states = initial(), id = '7734:overhaul:entry-gantry';
    breakCell(states, `${id}:frame-bank`, 0);
    expect(resolveOverhaulSupport(graph, states).unsupportedBlockIds).toEqual([]);
    breakCell(states, `${id}:frame-bank`, 1);
    const closure = resolveOverhaulSupport(graph, states);
    expect(closure.unsupportedBlockIds.filter(b => b.includes(':beam-'))).toHaveLength(2);
    expect(closure.unsupportedBlockIds.filter(b => b.includes(':bridge-deck-'))).toHaveLength(6);
    expect(closure.unsupportedBlockIds.filter(b => b.includes(':rail-'))).toHaveLength(12);
    expect(closure.brokenBlockIds).not.toContain(`${id}:column-1-0`);
  });
  it('retains deterministic persistent source chunks and avoids respawning retired source cells', () => {
    const states = initial(); breakCell(states, `${buildingId}:frame-bank`, 0); breakCell(states, `${buildingId}:frame-bank`, 1);
    const closure = resolveOverhaulSupport(graph, states), reordered = resolveOverhaulSupport(graph, [...states].reverse());
    expect(reordered).toEqual(closure); expect(closure.detachedClusters.length).toBeGreaterThan(0);
    for (const cluster of closure.detachedClusters) {
      expect(cluster.persistent).toBe(true); expect(cluster.blocks).toHaveLength(cluster.parts.length);
      cluster.parts.forEach((part, i) => { const block = cluster.blocks[i]; expect(part.halfExtents).toEqual(block.halfExtents); expect(part.offset[0] + cluster.center.x).toBeCloseTo(block.position[0]); });
    }
    commitOverhaulSupport(closure, states);
    const retired = new Set(closure.newlyDetachedBlockIds);
    expect(resolveOverhaulSupport(graph, states, retired).detachedClusters).toEqual([]);
    breakCell(states, `${buildingId}:frame-bank`, 2);
    const next = resolveOverhaulSupport(graph, states, retired);
    expect(next.newlyDetachedBlockIds).toEqual([`${buildingId}:column-1-0`]);
    expect(next.detachedClusters.flatMap(c => c.blockIds).some(id => retired.has(id))).toBe(false);
  });
});
describe('directional wall/roof contact ownership and invalidation', () => {
  it('owns facade contacts only on their actual face, and roof quarters on adjoining faces', () => {
    const west = graph.byBlock.get(`${buildingId}:facade-west-0-0`)!.block, roof = graph.byBlock.get(`${buildingId}:roof-0`)!.block;
    expect(overhaulContactOwnership(west)).toEqual({ wallAnchorIds: [`${buildingId}:grip-west`], roofAnchorIds: [] });
    expect(overhaulContactOwnership(roof)).toEqual({ wallAnchorIds: [], roofAnchorIds: [`${buildingId}:grip-west`, `${buildingId}:grip-north`] });
    const wrong = receipt(west.id, 'wall', `${buildingId}:grip-east`);
    expect(overhaulContactLive(wrong, graph, initial(), 7)).toBe(false);
    expect(overhaulContactLive(receipt(roof.id, 'roof', `${buildingId}:grip-south`), graph, initial(), 7)).toBe(false);
  });
  it('releases damaged roof and dependent climbing receipts in the same closure while preserving the opposite side', () => {
    const states = initial(), westWall = `${buildingId}:facade-west-0-0`, eastWall = `${buildingId}:facade-east-0-3`, roof = `${buildingId}:roof-0`;
    const westReceipt = receipt(westWall, 'wall', `${buildingId}:grip-west`), eastReceipt = receipt(eastWall, 'wall', `${buildingId}:grip-east`), roofReceipt = receipt(roof, 'roof', `${buildingId}:grip-west`);
    expect(overhaulContactLive(westReceipt, graph, states, 7)).toBe(true);
    breakCell(states, `${buildingId}:roof-bank`, 0); const closure = resolveOverhaulSupport(graph, states);
    expect(overhaulContactLive(roofReceipt, graph, states, 7, closure)).toBe(false);
    expect(overhaulContactLive(westReceipt, graph, states, 7, closure)).toBe(false);
    expect(overhaulContactLive(eastReceipt, graph, states, 7, closure)).toBe(true);
    expect(overhaulContactLive(eastReceipt, graph, states, 8, closure)).toBe(false);
  });
  it('rejects cyclic floating support instead of certifying itself', () => {
    const bank = district.structures.find(b => b.id === `${buildingId}:foundation-bank`)!;
    const block = { ...bank.cells[0], support: { structureId: bank.id, cells: [0], minIntact: 1 } };
    expect(() => compileOverhaulSupport({ ...district, structures: [{ ...bank, cells: [block] }] })).toThrow('ungrounded dependency cycle');
  });
});
