import { beforeAll, describe, expect, it, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { buildOverhaulDistrict } from '../shared/overhaulDistrict';
import { OverhaulRuinsOwner, OverhaulRuinSupportError, OVERHAUL_RUIN_ACTIVE_LIMIT, overhaulRuinPatches, overhaulRuinVerticalRadius, parseOverhaulRuins, type OverhaulRuinState } from '../shared/overhaulRuins';
import { OverhaulRuinCollisionOwner } from '../src/game/world/overhaulRuinCollision';
import type { CityBlock, CityDistrict } from '../shared/cityDistrict';

vi.mock('../src/game/runtime', () => ({ runtime: { authority: false, generation: 0 } }));

beforeAll(async () => { await RAPIER.init(); });
const q = { x: 0, y: 0, z: 0, w: 1 };
const block = (id: number, position: [number, number, number], halfExtents: [number, number, number] = [1, .25, 1], yaw = 0): CityBlock => ({ id: `native-fixture:component-${id}`, buildingId: 'native-fixture', part: 'deck', position, halfExtents, yaw, material: 'steel', structureId: 'native-fixture:bank', cellId: id });
const district = (blocks: CityBlock[]): CityDistrict => ({ ...buildOverhaulDistrict(7734)!, id: 'native-ruin-fixture', blocks, buildings: [], structures: [], npcs: [] });
function floor(world: RAPIER.World, y = 0) { return world.createCollider(RAPIER.ColliderDesc.cuboid(80, .5, 80).setTranslation(0, y - .5, 0).setFriction(.85)); }
function step(world: RAPIER.World, owner: OverhaulRuinsOwner, from: number, ticks: number) { for (let i = 1; i <= ticks; i++) { world.timestep = 1 / 60; world.step(); owner.advance(from + i / 60); } }

describe('persistent native structural ruins', () => {
  it('falls under native gravity, contacts ground and remains a real supported native collider with exact source dimensions', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), source = block(0, [0, 8, 0], [2, .2, 1]);
    const ground = floor(world), owner = new OverhaulRuinsOwner(world, district([source]), () => 0);
    try {
      world.step(); const worldStep = vi.spyOn(world, 'step'); owner.detach(source, 0, { x: 0, y: -1, z: 0 });
      const start = owner.snapshot()[0]; step(world, owner, 0, 30);
      expect(owner.snapshot()[0].position.y).toBeLessThan(start.position.y - 2); expect(worldStep).toHaveBeenCalledTimes(30);
      step(world, owner, .5, 360); const settled = owner.snapshot()[0], collider = owner.collider(0)!;
      expect(settled.settled).toBe(true); expect(collider.parent()!.isFixed()).toBe(true);
      expect(collider.halfExtents()).toEqual(expect.objectContaining({ x: 2, y: expect.closeTo(.2), z: 1 }));
      const contact = ground.contactCollider(collider, .04)!; expect(contact).not.toBeNull(); expect(contact.normal1.y).toBeGreaterThan(.9); expect(contact.distance).toBeGreaterThanOrEqual(-.02);
      expect(settled.position.y - overhaulRuinVerticalRadius(source, settled.rotation)).toBeCloseTo(0, 1);
      const pose = structuredClone(settled); step(world, owner, 6.5, 360);
      expect(owner.snapshot()[0]).toEqual(pose); expect(owner.handles().size).toBe(1);
      // Native support query is usable by the existing character controller;
      // no fake grounding flag or hidden carrier collider is installed.
      const actor = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(settled.position.x, settled.position.y + overhaulRuinVerticalRadius(source, settled.rotation) + 1.005, settled.position.z));
      const capsule = world.createCollider(RAPIER.ColliderDesc.capsule(.7, .3), actor), controller = world.createCharacterController(.005); world.step();
      controller.computeColliderMovement(capsule, { x: 0, y: -.05, z: 0 });
      expect(controller.computedGrounded()).toBe(true); expect(controller.computedMovement().y).toBeGreaterThan(-.05);
      world.removeCharacterController(controller); world.removeRigidBody(actor);
    } finally { owner.dispose(); world.free(); }
  });
  it('settles onto the first real raised roof instead of the sampled terrain floor', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), source = block(0, [0, 10, 0]); floor(world);
    const platform = world.createCollider(RAPIER.ColliderDesc.cuboid(4, .25, 4).setTranslation(0, 3.75, 0));
    const owner = new OverhaulRuinsOwner(world, district([source]), () => 0);
    try { world.step(); owner.detach(source, 0, { x: 0, y: -1, z: 0 }); step(world, owner, 0, 420); const state = owner.snapshot()[0], contact = platform.contactCollider(owner.collider(0)!, .04); expect(state.settled).toBe(true); expect(contact?.normal1.y).toBeGreaterThan(.5); expect(state.position.y - overhaulRuinVerticalRadius(source, state.rotation)).toBeCloseTo(4, 1); }
    finally { owner.dispose(); world.free(); }
  });
  it('uses current arbitrary orientation and exact native sweep extent when a capacity settlement occurs', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), blocks = Array.from({ length: 17 }, (_, i) => block(i, [i * 3, 12 + i, 0], [1, .2, .4])); floor(world);
    const owner = new OverhaulRuinsOwner(world, district(blocks), () => 0);
    try {
      world.step(); blocks.slice(0, 16).forEach(b => owner.detach(b, 0, { x: 0, y: -1, z: 0 }));
      const rotated = { x: 0, y: 0, z: Math.sin(Math.PI / 4), w: Math.cos(Math.PI / 4) }; owner.collider(0)!.parent()!.setRotation(rotated, true);
      owner.detach(blocks[16], 0, { x: 0, y: -1, z: 0 });
      const settled = owner.snapshot().find(r => r.block === 0)!;
      expect(settled.settled).toBe(true); expect(overhaulRuinVerticalRadius(blocks[0], settled.rotation)).toBeCloseTo(1);
      expect(settled.position.y).toBeCloseTo(1.005, 2); expect(owner.diagnostics().active).toBe(16);
    } finally { owner.dispose(); world.free(); }
  });
  it('keeps the 16-dynamic hard cap during a same-tick pile burst and stacks newly fixed shapes before any hidden step', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), blocks = Array.from({ length: 25 }, (_, i) => block(i, [0, 8 + i * .6, 0], [.8, .2, .8])); floor(world);
    const owner = new OverhaulRuinsOwner(world, district(blocks), () => 0);
    try {
      world.step(); const nativeStep = vi.spyOn(world, 'step');
      blocks.forEach(b => { owner.detach(b, 0, { x: 0, y: -1, z: 0 }); expect(owner.diagnostics().active).toBeLessThanOrEqual(OVERHAUL_RUIN_ACTIVE_LIMIT); });
      expect(nativeStep).not.toHaveBeenCalled(); expect(owner.snapshot()).toHaveLength(25); expect(world.bodies.len()).toBe(25);
      const settled = owner.snapshot().filter(r => r.settled).sort((a, b) => a.position.y - b.position.y);
      expect(settled).toHaveLength(9); for (let i = 1; i < settled.length; i++) expect(settled[i].position.y - settled[i - 1].position.y).toBeCloseTo(.405, 2);
      expect(owner.diagnostics().directSweeps).toBeGreaterThan(0);
      step(world, owner, 0, 600); expect(owner.snapshot()).toHaveLength(25); expect(owner.diagnostics().peakActive).toBeLessThanOrEqual(16);
      expect(owner.snapshot().every(r => r.position.y > -.1)).toBe(true);
      expect(owner.diagnostics().active).toBe(0);
    } finally { owner.dispose(); expect(world.bodies.len()).toBe(0); world.free(); }
  });
  it('does not invent a floor collider or freeze an unsupported piece when capacity cannot obtain native support', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), blocks = Array.from({ length: 17 }, (_, i) => block(i, [i * 3, 10, 0])), owner = new OverhaulRuinsOwner(world, district(blocks), () => 0);
    try { blocks.slice(0, 16).forEach(b => owner.detach(b, 0, { x: 0, y: -1, z: 0 })); expect(() => owner.detach(blocks[16], 0, { x: 0, y: -1, z: 0 })).toThrow(OverhaulRuinSupportError); expect(owner.snapshot()).toHaveLength(16); expect(owner.snapshot().every(r => !r.settled)).toBe(true); expect(world.colliders.len()).toBe(16); }
    finally { owner.dispose(); world.free(); }
  });
  it('retains every actual authored frame/roof/facade component through a complete native first-building collapse', () => {
    const d = buildOverhaulDistrict(7734)!, sources = d.blocks.filter(b => b.buildingId === '7734:overhaul:spawn-west');
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), owner = new OverhaulRuinsOwner(world, d, () => -.08);
    const ground = floor(world, -.08), originals = sources.map(b => world.createCollider(RAPIER.ColliderDesc.cuboid(...b.halfExtents).setTranslation(...b.position)));
    try {
      world.step(); originals.forEach(c => world.removeCollider(c, true));
      sources.forEach(b => owner.detach(b, 0, { x: 1, y: -1, z: .2 }));
      expect(owner.snapshot()).toHaveLength(45); expect(owner.diagnostics().active).toBeLessThanOrEqual(16);
      step(world, owner, 0, 720);
      expect(owner.snapshot()).toHaveLength(45); expect(owner.diagnostics().active).toBe(0);
      for (const state of owner.snapshot()) {
        const source = d.blocks[state.block], collider = owner.collider(state.block)!;
        expect(collider.halfExtents()).toEqual(expect.objectContaining({ x: expect.closeTo(source.halfExtents[0]), y: expect.closeTo(source.halfExtents[1]), z: expect.closeTo(source.halfExtents[2]) }));
        expect(collider.parent()!.isFixed()).toBe(true); expect(state.position.y).toBeGreaterThan(-.5);
        // Each fixed ruin has an actual upward native support witness.
        const support = [ground, ...owner.snapshot().filter(s => s.block !== state.block).map(s => owner.collider(s.block)!)].find(c => { const contact = c.contactCollider(collider, .04); return contact && contact.normal1.y >= .5 && contact.distance >= -.02 && contact.distance <= .04; });
        expect(support, `missing native support for ${source.id}`).toBeDefined();
      }
    } finally { owner.dispose(); world.free(); }
  });
  it('reactivates an unsupported settled stack and physically falls to a lower actual support with persistent identities', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), blocks = [block(0, [0, 7, 0]), block(1, [0, 9, 0])];
    floor(world, -4); const roof = world.createCollider(RAPIER.ColliderDesc.cuboid(5, .2, 5).setTranslation(0, 2.8, 0));
    const owner = new OverhaulRuinsOwner(world, district(blocks), () => -4);
    try {
      world.step(); blocks.forEach(b => owner.detach(b, 0, { x: 0, y: -1, z: 0 })); step(world, owner, 0, 420);
      const before = owner.snapshot(); expect(before.every(r => r.settled)).toBe(true);
      world.removeCollider(roof, true); owner.advance(7.1);
      const released = owner.snapshot(); expect(released.every(r => !r.settled)).toBe(true); expect(released.map(r => r.born)).toEqual(before.map(r => r.born)); expect(released.every((r, i) => r.revision! > before[i].revision!)).toBe(true);
      step(world, owner, 7.1, 30); expect(owner.snapshot()[0].position.y).toBeLessThan(before[0].position.y - .5);
      step(world, owner, 7.6, 360); const after = owner.snapshot(); expect(after.every(r => r.settled)).toBe(true); expect(after.every(r => r.position.y < 0)).toBe(true); expect(after.map(r => r.block)).toEqual([0, 1]);
    } finally { owner.dispose(); world.free(); }
  });
});

describe('exact oriented faces and guest presentation collision', () => {
  it('publishes the actual native transformed planes and dimensions, including slopes', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), source = block(0, [0, 0, 0], [2, .25, 1]);
    const rotation = { x: Math.sin(.28), y: 0, z: 0, w: Math.cos(.28) }, state: OverhaulRuinState = { block: 0, born: 0, position: { x: 3, y: 4, z: 5 }, rotation, settled: true, revision: 1 };
    const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(...source.halfExtents).setTranslation(3, 4, 5).setRotation(rotation));
    try {
      const patches = overhaulRuinPatches(source, state); expect(patches).toHaveLength(6);
      expect(patches.some(p => Math.abs(p.normal.y) > .01 && Math.abs(p.normal.y) < .99)).toBe(true);
      for (const face of patches) {
        const projection = collider.projectPoint(face.center, false)!;
        expect(Math.hypot(projection.point.x - face.center.x, projection.point.y - face.center.y, projection.point.z - face.center.z)).toBeLessThan(.001);
        for (const corner of face.corners) expect((corner.x - face.center.x) * face.normal.x + (corner.y - face.center.y) * face.normal.y + (corner.z - face.center.z) * face.normal.z).toBeCloseTo(0, 6);
        const origin = { x: face.center.x + face.normal.x, y: face.center.y + face.normal.y, z: face.center.z + face.normal.z }, hit = collider.castRayAndGetNormal(new RAPIER.Ray(origin, { x: -face.normal.x, y: -face.normal.y, z: -face.normal.z }), 2, true)!;
        expect(hit.timeOfImpact).toBeCloseTo(1, 3); expect(hit.normal.x * face.normal.x + hit.normal.y * face.normal.y + hit.normal.z * face.normal.z).toBeGreaterThan(.999);
      }
    } finally { world.free(); }
  });
  it('guest native proxies consume only the presented pose, retire omitted proxies and dispose all bodies', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), source = block(0, [0, 8, 0], [1, .2, 2], .3), owner = new OverhaulRuinCollisionOwner(world, district([source]));
    const moving: OverhaulRuinState = { block: 0, born: 1, position: { x: 3, y: 6, z: 2 }, rotation: q, settled: false, revision: 0 };
    try {
      expect(owner.sync([moving], 10, 1)).toBe(true); const collider = owner.collider(0)!; expect(collider.parent()!.isKinematic()).toBe(true); expect(collider.translation()).toEqual(expect.objectContaining(moving.position));
      // Direct native casts observe a just-created presented proxy before the
      // next scene physics step/broadphase; consumers can use the exact handle.
      const direct = collider.castRayAndGetNormal(new RAPIER.Ray({ x: 3, y: 8, z: 2 }, { x: 0, y: -1, z: 0 }), 4, true)!;
      expect(direct.timeOfImpact).toBeCloseTo(1.8, 4);
      expect(owner.patches()).toEqual([]); const next = { ...moving, position: { x: 4, y: .205, z: 2 }, rotation: { x: 0, y: Math.sin(.4), z: 0, w: Math.cos(.4) }, settled: true, revision: 1 };
      expect(owner.sync([next], 11, 1.2)).toBe(true); expect(collider.parent()!.isFixed()).toBe(true); expect(collider.translation().x).toBe(4); expect(collider.rotation().y).toBeCloseTo(next.rotation.y); expect(owner.patches()).toHaveLength(6);
      expect(owner.sync([moving], 10, 1)).toBe(false); expect(collider.translation().x).toBe(4);
      expect(owner.sync([], 12, 1.3)).toBe(true); expect(owner.snapshot().count).toBe(0); expect(collider.isValid()).toBe(false);
      expect(owner.sync([next], 13, 1.4)).toBe(true); owner.dispose(); expect(world.bodies.len()).toBe(0); expect(world.colliders.len()).toBe(0); expect(owner.sync([next], 14, 1.5)).toBe(false);
    } finally { owner.dispose(); world.free(); }
  });
  it('rejects malformed, duplicate, future-born and invalid-revision snapshots without accepting invented source dimensions', () => {
    const d = district([block(0, [0, 8, 0])]), valid: OverhaulRuinState = { block: 0, born: 0, position: { x: 0, y: 1, z: 0 }, rotation: q, settled: true, revision: 1 };
    expect(parseOverhaulRuins([valid], d, 1)).toEqual([valid]);
    for (const value of [[valid, valid], [{ ...valid, block: 1 }], [{ ...valid, born: 2 }], [{ ...valid, revision: -1 }], [{ ...valid, revision: 1.5 }], [{ ...valid, rotation: { ...q, w: .1 } }], [{ ...valid, position: { x: NaN, y: 1, z: 0 } }]]) expect(parseOverhaulRuins(value, d, 1)).toBeNull();
    const many = district(Array.from({ length: 17 }, (_, i) => block(i, [i, 3, 0])));
    expect(parseOverhaulRuins(many.blocks.map((_, i) => ({ ...valid, block: i, settled: false })), many, 1)).toBeNull();
  });
});
