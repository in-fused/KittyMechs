import RAPIER from '@dimforge/rapier3d-compat';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NativeContactProvider, authored, native, toAuthored, toNative, type Motion, type Pad, type Result, type SupportWitness, type SweepWitness } from './provider.js';

// Frozen, finite actual native fixture. It is a synthetic capability test, never ordinary play.
const OUT = resolve('.sites-runtime/overhaul-20261010/contact-provider-002');
const DT = 1 / 30;
const STILL: Motion = { displacement: native(0, 0, 0), angularRadians: 0 };
const generation = 'contact-provider-002-fixture-world-1';
const rows: unknown[] = [];
let world: RAPIER.World | undefined, provider: NativeContactProvider | undefined;
let failed = false;
function record(name: string, request: unknown, result: unknown, passes: boolean): void {
  rows.push({ name, request, result, passes });
  if (!passes) { failed = true; throw Error(`first fixture failure: ${name}`); }
}
function rejection(name: string, request: unknown, run: () => unknown): void {
  try { const result = run(); record(name, request, result, false); }
  catch (error) {
    if (failed) throw error;
    record(name, request, { rejected: String(error) }, true);
  }
}
async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const started = new Date().toISOString();
  try {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = DT;
    provider = new NativeContactProvider(world, generation);
    const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -.1, 0));
    const floor = world.createCollider(RAPIER.ColliderDesc.cuboid(3, .1, 3), floorBody);
    const obstacleBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.5, .1, 0));
    const obstacle = world.createCollider(RAPIER.ColliderDesc.cuboid(.1, .1, .4), obstacleBody);
    const floorOwner = provider.register('floor', 1, floor), obstacleOwner = provider.register('obstacle-20cm', 1, obstacle);
    const motions = new Map([['floor', STILL], ['obstacle-20cm', STILL]]);
    world.step();
    // Publish the actual next kinematic targets BEFORE querying their complete prospective interval.
    const floorMotion: Motion = { displacement: native(.1, 0, 0), angularRadians: 0 };
    const obstacleMotion: Motion = { displacement: native(-.05, 0, 0), angularRadians: 0 };
    const floorStart = { ...floor.translation() }, obstacleStart = { ...obstacle.translation() };
    const floorNext = { x: floorStart.x + floorMotion.displacement.x, y: floorStart.y, z: floorStart.z };
    const obstacleNext = { x: obstacleStart.x + obstacleMotion.displacement.x, y: obstacleStart.y, z: obstacleStart.z };
    floorBody.setNextKinematicTranslation(floorNext); obstacleBody.setNextKinematicTranslation(obstacleNext);
    const committed = new Map([['floor', floorMotion], ['obstacle-20cm', obstacleMotion]]);
    const frame0 = provider.beginFrame({ generation, tick: 0, seconds: DT, dt: DT }, committed);
    const pad: Pad = { center: native(0, .051, 0), half: native(.2, .05, .15), yaw: 0 };
    const support = provider.samplePad(frame0, pad);
    record('intact-floor-complete-pad', { clock: frame0.clock, pad, floorOwner, actualFloorPose: floor.translation() }, support, support.accepted);
    const lease = (support as Extract<Result<SupportWitness>, { accepted: true }>).witness;
    const source = authored(1, 2, 3), converted = toNative(source), roundtrip = toAuthored(converted);
    record('explicit-units-roundtrip', source, { converted, roundtrip }, Math.abs(roundtrip.x - 1) < 1e-12 && Math.abs(roundtrip.y - 2) < 1e-12 && Math.abs(roundtrip.z - 3) < 1e-12);
    const mixed = provider.samplePad(frame0, { ...pad, center: source as unknown as Pad['center'] });
    record('reject-authored-vector-in-native-query', { clock: frame0.clock, source }, mixed, !mixed.accepted);
    const edgePad = { ...pad, center: native(2.95, .051, 0) }, edge = provider.samplePad(frame0, edgePad);
    record('reject-partial-footprint-edge', { clock: frame0.clock, pad: edgePad }, edge, !edge.accepted);
    const airPad: Pad = { center: native(-1, .3, 0), half: native(.2, .05, .15), yaw: .2 };
    const yawMove: Motion = { displacement: native(.3, 0, 0), angularRadians: Math.PI / 2 };
    const clear = provider.sweep(frame0, airPad, yawMove);
    record('finite-clear-translation-and-yaw-envelope', { clock: frame0.clock, pad: airPad, motion: yawMove }, clear, clear.accepted);
    const blockedPad: Pad = { center: native(1.1, .15, 0), half: native(.05, .05, .05), yaw: 0 };
    const blockedMotion: Motion = { displacement: native(.6, 0, 0), angularRadians: 0 };
    const blocked = provider.sweep(frame0, blockedPad, blockedMotion);
    record('native-finite-20cm-obstacle-blocks-sweep', { clock: frame0.clock, pad: blockedPad, motion: blockedMotion, obstacleOwner }, blocked, !blocked.accepted && blocked.reason === 'native swept envelope blocked');
    const yawBlockedPad = { ...blockedPad, yaw: .4 }, yawBlockedMotion = { ...blockedMotion, angularRadians: .2 };
    const yawBlocked = provider.sweep(frame0, yawBlockedPad, yawBlockedMotion);
    const yawRaw = (!yawBlocked.accepted && yawBlocked.reason === 'native swept envelope blocked') ? yawBlocked.raw as SweepWitness : undefined;
    const yawHit = yawRaw?.checked.find(row => row.owner.id === 'obstacle-20cm')?.hit;
    record('blocked-nonzero-yaw-hit-is-enclosure-local', { clock: frame0.clock, pad: yawBlockedPad, motion: yawBlockedMotion }, yawBlocked,
      !!yawHit && yawHit.queriedShape.kind === 'conservative-yaw-enclosure' && !yawHit.queriedShape.representsActualPadSurface &&
      yawHit.witness1Local.space === 'queried-shape-local-m' && yawHit.normal1Local.space === 'queried-shape-local-unit-direction' &&
      yawHit.queriedShape.startPose.rotation.y === 0 && yawBlockedPad.yaw !== 0);
    const relativeRaw = (!blocked.accepted && blocked.reason === 'native swept envelope blocked') ? blocked.raw as SweepWitness : undefined;
    const obstacleRow = relativeRaw?.checked.find(row => row.owner.id === 'obstacle-20cm');
    record('moving-obstacle-native-relative-cast-uses-both-motions', { clock: frame0.clock, padMotion: blockedMotion, committedObstacleMotion: obstacleMotion, actualObstacleStart: obstacleStart, actualNextTarget: obstacleNext }, obstacleRow,
      !!obstacleRow?.hit && obstacleRow.motion.displacement.x === -.05 && relativeRaw?.displacement.x === .6 && obstacleRow.hit.queriedShape.kind === 'exact-pad');
    const loadedSweep = provider.sweep(frame0, pad, STILL, .002);
    record('loaded-floor-not-excluded-from-clearance', { clock: frame0.clock, pad }, loadedSweep, !loadedSweep.accepted);
    rejection('reject-generation-reuse', { generation }, () => new NativeContactProvider(world!, generation));
    rejection('reject-inconsistent-clock', { tick: 1, seconds: DT * 3, dt: DT }, () => provider!.beginFrame({ generation, tick: 1, seconds: DT * 3, dt: DT }, motions));
    // The single following real step commits the exact published next targets; do not replace targets after queries.
    world.step();
    const floorEnd = { ...floor.translation() }, obstacleEnd = { ...obstacle.translation() };
    record('actual-step-endposes-match-published-interval', { startClock: frame0.clock, intervalSeconds: DT, floorStart, obstacleStart, floorMotion, obstacleMotion, floorNext, obstacleNext }, { floorEnd, obstacleEnd },
      Math.hypot(floorEnd.x - floorNext.x, floorEnd.y - floorNext.y, floorEnd.z - floorNext.z) < 1e-6 && Math.hypot(obstacleEnd.x - obstacleNext.x, obstacleEnd.y - obstacleNext.y, obstacleEnd.z - obstacleNext.z) < 1e-6);
    const frame1 = provider.beginFrame({ generation, tick: 1, seconds: DT * 2, dt: DT }, motions);
    const transported = provider.transport(frame1, lease);
    record('actual-moving-collider-local-transport', { previous: lease, clock: frame1.clock, actualFloorPose: floor.translation() }, transported,
      transported.accepted && Math.abs(transported.witness.worldAnchor.x - .1) < 1e-6 && Math.abs(transported.witness.measuredVelocity.x - 3) < 1e-5);
    const movedPad = { ...pad, center: native(.1, .051, 0) }, refreshed = provider.samplePad(frame1, movedPad);
    record('moving-support-contact-refreshed', { clock: frame1.clock, pad: movedPad }, refreshed, refreshed.accepted);
    const stale = provider.samplePad(frame0, pad);
    record('reject-stale-frame', { clock: frame0.clock, pad }, stale, !stale.accepted);
    provider.retire(floorOwner); world.removeRigidBody(floorBody); world.step();
    const frame2 = provider.beginFrame({ generation, tick: 2, seconds: DT * 3, dt: DT }, new Map([['obstacle-20cm', STILL]]));
    const retired = provider.transport(frame2, (refreshed as Extract<Result<SupportWitness>, { accepted: true }>).witness);
    record('reject-retired-support', { clock: frame2.clock, owner: floorOwner }, retired, !retired.accepted);
    const replacement = world.createCollider(RAPIER.ColliderDesc.cuboid(3, .1, 3).setTranslation(.1, -.1, 0));
    rejection('reject-old-revision-rebind-even-if-handle-reused', { oldHandle: floor.handle, replacementHandle: replacement.handle }, () => provider!.register('floor', 1, replacement));
    provider.register('floor', 2, replacement); world.step();
    const frame3 = provider.beginFrame({ generation, tick: 3, seconds: DT * 4, dt: DT }, motions);
    const replacementSupport = provider.samplePad(frame3, movedPad);
    record('new-revision-support-is-distinct', { clock: frame3.clock, pad: movedPad }, replacementSupport, replacementSupport.accepted && replacementSupport.witness.owner.revision === 2);
    replacement.setEnabled(false); world.step();
    const frame4 = provider.beginFrame({ generation, tick: 4, seconds: DT * 5, dt: DT }, new Map([['obstacle-20cm', STILL]]));
    const disabled = provider.transport(frame4, (replacementSupport as Extract<Result<SupportWitness>, { accepted: true }>).witness);
    record('reject-disabled-owner', { clock: frame4.clock, owner: { ...floorOwner, revision: 2 } }, disabled, !disabled.accepted);
    rejection('reject-rotating-scene-commit', { clock: { generation, tick: 5, seconds: DT * 6, dt: DT }, angularRadians: .1 }, () => provider!.beginFrame({ generation, tick: 5, seconds: DT * 6, dt: DT }, new Map([['obstacle-20cm', { displacement: native(0, 0, 0), angularRadians: .1 }]])));
  } catch (error) {
    failed = true; rows.push({ failure: String(error), stack: error instanceof Error ? error.stack : undefined });
  } finally {
    provider?.dispose(); world?.free();
    writeFileSync(resolve(OUT, 'receipt.json'), JSON.stringify({ schema: 1, started, closed: new Date().toISOString(),
      status: failed ? 'FAIL_STOP_NO_RETRY' : 'BOUNDED_NATIVE_CAPABILITY_PASS', syntheticFixture: true,
      normalPlay: false, bodyForceLoadTransferApproval: false, malformedNativeStateValidation: 'UNEXERCISED_NO_INVALID_NATIVE_STATE_INJECTION',
      worldFreed: true, providerDisposed: true, rows }, (_key, value) => typeof value === 'number' && !Number.isFinite(value) ? { preservedNonfiniteNumber: String(value) } : value, 2));
  }
  if (failed) process.exitCode = 1;
}
await main();
