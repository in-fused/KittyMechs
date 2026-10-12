import { beforeAll, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import assert from 'node:assert/strict';
import { OwnedCharacterMotion, type OwnedCharacter } from '../shared/ownedCharacterMotion';
beforeAll(async () => { await RAPIER.init(); });
// Native API regressions ported from the immutable qualified004 fixtures.
// Controlled placements below are deliberate; these are not ordinary route tests.
const flags = RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC;
function state(e: OwnedCharacter) { const b = e.body, c = e.collider; return { type: b.bodyType(), current: b.translation(), rotation: b.rotation(), pending: b.nextTranslation(), pendingRotation: b.nextRotation(), velocity: b.linvel(), angular: b.angvel(), enabled: b.isEnabled(), sleep: b.isSleeping(), body: b.handle, collider: c.handle, parent: c.parent()?.handle, offset: c.translationWrtParent(), raw: { type: c.shapeType(), half: c.halfHeight(), round: c.roundRadius(), radius: c.radius() }, cached: c.shape }; }
function fixture(test: (f: {
    world: RAPIER.World;
    entries: OwnedCharacter[];
    set: (es: OwnedCharacter[]) => void;
    providerHook: (hook: (() => void) | null) => void;
    motion: OwnedCharacterMotion;
    controller: RAPIER.KinematicCharacterController;
    compute: () => void;
}) => unknown, y = 4, half = .875, round = .125) {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    let entries: OwnedCharacter[] = [2, y].map((cy, i) => { const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, cy, 0)), collider = world.createCollider(RAPIER.ColliderDesc.roundCylinder(half, 1.25, round), body); return { id: `a${i}`, life: 1, body, collider }; });
    world.step();
    for (const e of entries) {
        e.body.setBodyType(RAPIER.RigidBodyType.KinematicVelocityBased, false);
        e.body.setLinvel({ x: 2, y: 0, z: 0 }, false);
        e.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, false);
    }
    let hook: (() => void) | null = null;
    const motion = new OwnedCharacterMotion(RAPIER, () => { hook?.(); return entries; }), controller = world.createCharacterController(.02), compute = () => motion.computeColliderMovement(controller, entries[0].collider, { x: .01, y: 0, z: 0 }, flags);
    try {
        return test({ world, entries, set: es => { entries = es; }, providerHook: h => { hook = h; }, motion, controller, compute });
    }
    finally {
        world.free();
    }
}
for (const side of [-1, 0, 1])
    it(`native exact cap boundary side=${side}`, () => fixture(f => {
        const [caster, other] = f.entries;
        const rawTop = caster.collider.translation().y + caster.collider.halfHeight() + caster.collider.roundRadius(), rawBottom = other.collider.translation().y - other.collider.halfHeight() - other.collider.roundRadius();
        const cs = caster.collider.shape as RAPIER.RoundCylinder, os = other.collider.shape as RAPIER.RoundCylinder, cachedTop = caster.collider.translation().y + cs.halfHeight + cs.borderRadius, cachedBottom = other.collider.translation().y - os.halfHeight - os.borderRadius;
        const expected = rawBottom >= rawTop;
        assert.equal(expected, side >= 0);
        let observed: number | undefined;
        const native = f.controller.computeColliderMovement.bind(f.controller);
        f.controller.computeColliderMovement = (...args) => { observed = other.body.bodyType(); native(...args); };
        assert(f.motion.beginStep());
        f.compute();
        assert.equal(observed, expected ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.KinematicPositionBased);
        f.motion.endStep();
        const receipt = { side, requestedCenter: 4 + side * 2 ** -20, nativeCenter: other.collider.translation().y, rawTop, rawBottom, cachedTop, cachedBottom, rawSelected: expected, cachedSelected: cachedBottom >= cachedTop, observedType: observed, divergence: expected !== (cachedBottom >= cachedTop) };
        return receipt;
    }, 4 + side * 2 ** -20));
it('nonbinary native versus cached provenance', () => fixture(f => {
    const [a, b] = f.entries, as = a.collider.shape as RAPIER.RoundCylinder, bs = b.collider.shape as RAPIER.RoundCylinder;
    const rawTop = a.collider.translation().y + a.collider.halfHeight() + a.collider.roundRadius(), rawBottom = b.collider.translation().y - b.collider.halfHeight() - b.collider.roundRadius(), cachedTop = a.collider.translation().y + as.halfHeight + as.borderRadius, cachedBottom = b.collider.translation().y - bs.halfHeight - bs.borderRadius;
    f.motion.beginStep();
    f.compute();
    f.motion.endStep();
    const receipt = { rawTop, rawBottom, cachedTop, cachedBottom, rawSelected: rawBottom >= rawTop, cachedSelected: cachedBottom >= cachedTop, divergence: (rawBottom >= rawTop) !== (cachedBottom >= cachedTop) };
    return receipt;
}, 3.64, .7, .12));
for (const duplicate of ['id', 'body', 'collider', 'entry'])
    it(`initial duplicate ${duplicate} gives baseline without zero`, () => fixture(f => {
        const original = f.entries.map(state), bad = [...f.entries];
        bad[1] = duplicate === 'entry' ? bad[0] : { ...bad[1], [duplicate]: bad[0][duplicate as 'id' | 'body' | 'collider'] };
        f.set(bad);
        assert.equal(f.motion.beginStep(), false);
        assert.deepEqual(f.entries.map(state), original);
        f.motion.endStep();
        return { noZero: true };
    }));
it('midstep [A,A] cannot replace [A,B]', () => fixture(f => { f.motion.beginStep(); f.set([f.entries[0], f.entries[0]]); let queried = false; f.controller.computeColliderMovement = () => { queried = true; }; assert.throws(f.compute, /Late unsupported/); assert.equal(queried, false); assert.throws(() => f.motion.endStep(), /failed/); return { queried }; }));
it('impostor caster collider object rejected', () => fixture(f => { f.motion.beginStep(); const actual = f.entries[0].collider, impostor = new Proxy(actual, {}); assert.throws(() => f.motion.computeColliderMovement(f.controller, impostor, { x: 0, y: 0, z: 0 }, flags), /Caster missing/); return { rejected: true }; }));
for (const disabled of ['body', 'collider'])
    it(`disabled OTHER ${disabled} stays kinematic`, () => fixture(f => {
        if (disabled === 'body')
            f.entries[1].body.setEnabled(false);
        else
            f.entries[1].collider.setEnabled(false);
        f.motion.beginStep();
        let observed: number | undefined;
        const native = f.controller.computeColliderMovement.bind(f.controller);
        f.controller.computeColliderMovement = (...args) => { observed = f.entries[1].body.bodyType(); native(...args); };
        f.compute();
        assert.equal(observed, RAPIER.RigidBodyType.KinematicPositionBased);
        f.motion.endStep();
        return { observed };
    }));
it('endStep detects final physical ownership mutation', () => fixture(f => { f.motion.beginStep(); f.compute(); f.set([f.entries[0]]); assert.throws(() => f.motion.endStep(), /Unsupported final/); return { failedBeforeWorldStep: true }; }));
it('same-body metadata/relocation/hull transitions (API-only, not ordinary respawn qualification)', () => fixture(f => {
    f.motion.beginStep();
    const beforeHandles = f.entries.map(e => [e.body.handle, e.collider.handle]);
    f.entries[0].life = 2;
    f.entries[0].body.setTranslation({ x: 1, y: 2, z: 0 }, false);
    f.entries[0].body.setNextKinematicTranslation({ x: 1, y: 2, z: 0 });
    f.entries[0].collider.setShape(new RAPIER.RoundCylinder(1.125, 1.25, .125));
    f.entries[0].collider.setTranslationWrtParent({ x: 0, y: .2, z: 0 });
    f.compute();
    f.motion.endStep();
    assert.deepEqual(f.entries.map(e => [e.body.handle, e.collider.handle]), beforeHandles);
    return { sameHandles: true, metadataOnlyLife: 2, raw: state(f.entries[0]).raw };
}));
it('native nonzero angular unsupported baseline unchanged', () => fixture(f => { const b = f.entries[1].body; b.setBodyType(RAPIER.RigidBodyType.KinematicVelocityBased, false); b.setAngvel({ x: 0, y: .25, z: 0 }, false); b.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, false); assert.equal(b.angvel().y, .25); const before = f.entries.map(state); assert.equal(f.motion.beginStep(), false); assert.deepEqual(f.entries.map(state), before); f.motion.endStep(); return { actualAngular: .25 }; }));
it('derived nonfinite cap defensive getter fault rejected before mutation', () => fixture(f => { const c = f.entries[1].collider; c.halfHeight = () => Number.MAX_VALUE; c.roundRadius = () => Number.MAX_VALUE; const old = f.entries.map(e => e.body.linvel()); assert.equal(f.motion.beginStep(), false); assert.deepEqual(f.entries.map(e => e.body.linvel()), old); f.motion.endStep(); return { scope: 'Injected raw-getter fault; not naturally occurring finite Float32 overflow', noZero: true }; }));
it('actual query exception restores selected bodies and blocks further use', () => fixture(f => { f.motion.beginStep(); const before = f.entries.map(state), native = f.controller.computeColliderMovement.bind(f.controller), fault = Error('actual compute fault'); f.controller.computeColliderMovement = (...args) => { native(...args); throw fault; }; assert.throws(f.compute, /actual compute fault/); assert.deepEqual(f.entries.map(state), before); assert.throws(() => f.motion.endStep(), /failed/); return { restored: true }; }));
it('partial Fixed flip cleanup restores all selected state', () => fixture(f => { f.motion.beginStep(); const before = f.entries.map(state), b = f.entries[1].body, set = b.setBodyType.bind(b); let once = true; b.setBodyType = (type, wake) => { set(type, wake); if (type === RAPIER.RigidBodyType.Fixed && once) {
    once = false;
    throw Error('partial flip');
} }; assert.throws(f.compute, /partial flip/); assert.deepEqual(f.entries.map(state), before); return { restored: true }; }));
it('partial zero failure restores original velocities before failed lease', () => fixture(f => { const before = f.entries.map(state), b = f.entries[1].body, set = b.setLinvel.bind(b); let once = true; b.setLinvel = (v, wake) => { if (once) {
    once = false;
    throw Error('zero setter fault');
} set(v, wake); }; assert.throws(() => f.motion.beginStep(), /zero setter fault/); assert.deepEqual(f.entries.map(state), before); return { originalRestored: true }; }));
it('reentrant bypass query rejected after native compute; state restored', () => fixture(f => { f.motion.beginStep(); const before = f.entries.map(state), native = f.controller.computeColliderMovement.bind(f.controller); f.controller.computeColliderMovement = (...args) => { native(...args); f.motion.computeColliderMovement(f.controller, f.entries[0].collider, { x: 0, y: 0, z: 0 }, 0 as RAPIER.QueryFilterFlags); }; assert.throws(f.compute, /Reentrant/); assert.deepEqual(f.entries.map(state), before); return { restored: true }; }));
it('actual foreign platform carry remains kinematic/unowned', () => {
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }), platform = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 3, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(6, .5, 6), platform);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 4.53, 0)), collider = world.createCollider(RAPIER.ColliderDesc.roundCylinder(.875, 1.25, .125), body), e = { id: 'rider', body, collider }, motion = new OwnedCharacterMotion(RAPIER, () => [e]), controller = world.createCharacterController(.02);
    controller.enableSnapToGround(.35);
    world.step();
    const traces: unknown[] = [];
    const step = (x: number | null) => { if (x !== null)
        platform.setNextKinematicTranslation({ x, y: 3, z: 0 }); motion.beginStep(); motion.computeColliderMovement(controller, collider, { x: 0, y: -22 / 3600, z: 0 }, flags); const move = controller.computedMovement(), at = body.translation(); body.setNextKinematicTranslation({ x: at.x + move.x, y: at.y + move.y, z: at.z + move.z }); motion.endStep(); world.timestep = 1 / 60; world.step(); assert.equal(platform.bodyType(), RAPIER.RigidBodyType.KinematicPositionBased); traces.push({ rider: body.translation(), platform: platform.translation(), foreignVelocity: platform.linvel(), grounded: controller.computedGrounded() }); };
    try {
        for (let i = 0; i < 30; i++)
            step(null);
        const start = body.translation();
        for (let i = 0; i < 60; i++)
            step((i + 1) * .025);
        const end = body.translation(), travel = end.x - start.x;
        assert(travel > 1.2 && travel < 1.8);
        assert(Math.abs(end.y - start.y) < .08);
        assert(controller.computedGrounded());
        return { travel, vertical: Math.abs(end.y - start.y), platform: platform.translation().x, traces };
    }
    finally {
        world.free();
    }
});
for (const side of [-1, 0, 1])
    it(`native BELOW cap boundary side=${side}`, () => fixture(f => {
        const [a, b] = f.entries, fromBottom = a.collider.translation().y - a.collider.halfHeight() - a.collider.roundRadius(), otherTop = b.collider.translation().y + b.collider.halfHeight() + b.collider.roundRadius(), expected = otherTop <= fromBottom;
        assert.equal(expected, side <= 0);
        let observed: number | undefined;
        const native = f.controller.computeColliderMovement.bind(f.controller);
        f.controller.computeColliderMovement = (...args) => { observed = b.body.bodyType(); native(...args); };
        f.motion.beginStep();
        f.compute();
        assert.equal(observed, expected ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.KinematicPositionBased);
        f.motion.endStep();
        const receipt = { side, nativeCenter: b.collider.translation().y, fromBottom, otherTop, expected, observed };
        return receipt;
    }, side * 2 ** -20));
it('final provider reentrancy rejected before actual query', () => fixture(f => { f.motion.beginStep(); let calls = 0; f.controller.computeColliderMovement = () => { calls++; }; f.providerHook(() => f.motion.computeColliderMovement(f.controller, f.entries[0].collider, { x: 0, y: 0, z: 0 }, 0 as RAPIER.QueryFilterFlags)); assert.throws(() => f.motion.endStep(), /Reentrant/); assert.equal(calls, 0); assert.throws(f.compute, /failed/); return { calls }; }));
it('final native getter reentrancy rejected', () => fixture(f => { f.motion.beginStep(); f.entries[1].collider.halfHeight = () => { f.motion.computeColliderMovement(f.controller, f.entries[0].collider, { x: 0, y: 0, z: 0 }, 0 as RAPIER.QueryFilterFlags); return .875; }; assert.throws(() => f.motion.endStep(), /Reentrant/); assert.throws(f.compute, /failed/); return { failed: true }; }));
it('final native getter failure prevents simulated adapter world step/publication', () => fixture(f => { f.motion.beginStep(); f.entries[1].collider.halfHeight = () => { throw Error('final getter failure'); }; let stepped = false, published = false; const finish = () => { f.motion.endStep(); stepped = true; f.world.step(); published = true; }; assert.throws(finish, /final getter failure/); assert.equal(stepped, false); assert.equal(published, false); assert.throws(f.compute, /failed/); return { stepped, published, scope: 'API adapter ordering probe, not server fail adapter qualification' }; }));
it('unrecoverable cleanup tries every selected body and fails lease', () => fixture(f => {
    const body = f.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 6, 0)), collider = f.world.createCollider(RAPIER.ColliderDesc.roundCylinder(.875, 1.25, .125), body);
    f.entries.push({ id: 'third', body, collider });
    f.motion.beginStep();
    const laterBefore = state(f.entries[2]), native = f.controller.computeColliderMovement.bind(f.controller), primary = Error('primary compute failure'), cleanup = Error('unrecoverable restore failure');
    f.controller.computeColliderMovement = (...args) => { native(...args); throw primary; };
    f.entries[1].body.setLinvel = () => { throw cleanup; };
    let caught: unknown;
    try {
        f.compute();
    }
    catch (error) {
        caught = error;
    }
    assert(caught instanceof AggregateError);
    assert.deepEqual(caught.errors, [primary, cleanup]);
    assert.deepEqual(state(f.entries[2]), laterBefore);
    assert(f.entries.every(e => e.body.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased));
    assert.throws(() => f.motion.endStep(), /failed/);
    assert.throws(f.compute, /failed/);
    return { laterRestored: true, firstVelocityNotGuaranteed: true };
}));
it('preserves current/pending native state after intentional zero and forwards exact collision filters', () => fixture(f => {
    const [caster, target] = f.entries;
    target.body.setTranslation({ x: 5, y: 2, z: 0 }, false);
    const foreign = f.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(20, 2, 0));
    const foreignCollider = f.world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, 1), foreign);
    f.world.step();
    for (const e of f.entries) {
        e.body.setNextKinematicTranslation({ x: e.body.translation().x + .3, y: 2.2, z: -.1 });
        e.body.setNextKinematicRotation({ x: 0, y: .1, z: 0, w: Math.sqrt(.99) });
    }
    foreign.setNextKinematicTranslation({ x: 21, y: 2, z: 0 });
    const foreignEntry = { id: 'foreign', body: foreign, collider: foreignCollider }, foreignBefore = state(foreignEntry);
    assert(f.motion.beginStep());
    const before = f.entries.map(state), movement = { x: 10, y: 0, z: 0 }, groups = 0xffffffff;
    const allow = (c: RAPIER.Collider) => c.handle !== caster.collider.handle;
    let expectedGroups = groups, expectedPredicate = allow;
    const native = f.controller.computeColliderMovement.bind(f.controller);
    f.controller.computeColliderMovement = (...args) => { assert.equal(args[0], caster.collider); assert.equal(args[1], movement); assert.equal(args[2], flags); assert.equal(args[3], expectedGroups); assert.equal(args[4], expectedPredicate); assert.equal(caster.body.bodyType(), RAPIER.RigidBodyType.KinematicPositionBased); native(...args); };
    const hits = () => Array.from({ length: f.controller.numComputedCollisions() }, (_, i) => f.controller.computedCollision(i)!.collider?.handle);
    f.motion.computeColliderMovement(f.controller, caster.collider, movement, flags, groups, allow);
    assert(hits().includes(target.collider.handle));
    assert(!hits().includes(caster.collider.handle));
    assert(f.controller.computedMovement().x < 5);
    const deny = (c: RAPIER.Collider) => allow(c) && c.handle !== target.collider.handle;
    expectedPredicate = deny;
    f.motion.computeColliderMovement(f.controller, caster.collider, movement, flags, groups, deny);
    assert(!hits().includes(target.collider.handle));
    assert(f.controller.computedMovement().x > 9.9);
    assert.deepEqual(f.entries.map(state), before);
    target.collider.setCollisionGroups(0x00020002);
    expectedGroups = 0x00010001;
    expectedPredicate = allow;
    f.motion.computeColliderMovement(f.controller, caster.collider, movement, flags, expectedGroups, allow);
    assert(!hits().includes(target.collider.handle));
    assert(f.controller.computedMovement().x > 9.9);
    assert.deepEqual(state(foreignEntry), foreignBefore);
    f.motion.endStep();
}));
it('bypasses all nonexact flags without changing argument identities or query body types', () => fixture(f => {
    f.motion.beginStep();
    const native = f.controller.computeColliderMovement.bind(f.controller), movement = { x: 0, y: 0, z: 0 }, predicate = () => true;
    for (const otherFlags of [0, flags | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC, RAPIER.QueryFilterFlags.ONLY_FIXED]) {
        f.controller.computeColliderMovement = (...args) => { assert.equal(args[1], movement); assert.equal(args[2], otherFlags); assert.equal(args[4], predicate); assert(f.entries.every(e => e.body.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased)); native(...args); };
        f.motion.computeColliderMovement(f.controller, f.entries[0].collider, movement, otherFlags, 0xffffffff, predicate);
    }
    f.motion.endStep();
}));
