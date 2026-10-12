/** UNRUN until root review/grant. Controlled algebra/rejection checks, never Pounce/native approval. */
import assert from 'node:assert/strict';
import { advanceFreeLimb, LIMITS, step } from './controller.js';
import { nativePoint, sourceToNative, nativeToSource, length, sub } from './coordinates.js';
import type { BindDefinition, ContactProvider, Frame, LimbState, OwnerState, Witness } from './contract.js';
import { LIMBS } from './contract.js';

const dt = 1 / 120;
const initial: LimbState = { mode: 'to-guard', point: nativePoint([.584, .14, -.12]), velocity: [7.6, 0, 0], acceleration: [0, 0, 0],
  yaw: 0, yawRate: 0, yawAcceleration: 0, lease: null, departingLease: null, elapsedLoaded: 0, plantGoal: null };
const goal = nativePoint([.584 + 7.6 * dt, .18, -.09]);
const first = advanceFreeLimb(initial, goal, [7.6, 0, 0], .01, dt);
assert.equal(initial.point.value[0], .584); // Pure state, immutable preceding receipt.
assert.ok(length(sub(first.acceleration, initial.acceleration)) <= LIMITS.pawJerk * dt + 1e-10);
assert.ok(length(sub(first.velocity, initial.velocity)) <= LIMITS.pawAcceleration * dt + 1e-10);
assert.ok(first.point.value[0] > initial.point.value[0]); // Moving guard does not lerp to a frozen release-world point.
const cancelled = advanceFreeLimb(first, nativePoint([.5, .12, -.1]), [0, 0, 0], -.02, dt);
assert.ok(length(sub(cancelled.acceleration, first.acceleration)) <= LIMITS.pawJerk * dt + 1e-10);
assert.ok(length(sub(cancelled.velocity, first.velocity)) <= LIMITS.pawAcceleration * dt + 1e-10);
assert.deepEqual(advanceFreeLimb(initial, goal, [7.6, 0, 0], .01, dt), first); // No clock/random/future oracle.
const p = { space: 'authored-unit-z-up' as const, value: [2, -3, 4] as const };
assert.ok(length(sub(nativeToSource(sourceToNative(p)).value, p.value)) <= Number.EPSILON * length(p.value) * 4);

// Deliberately NOT the real asset: numerical identity rejection, provider policy and complete trace only.
const bind: BindDefinition = { geometryFingerprint: 'SYNTHETIC_NOT_THE_ASSET', masterSHA256: 'NONE', basis: 'native-m-y-up', rootBone: 'identity',
  heads: { pelvis: [0, 1, 0], spine: [0, 1.1, 0], chest: [0, 1.2, .2], head: [0, 1.3, .4] },
  parents: { pelvis: 'root', spine: 'pelvis', chest: 'spine', head: 'chest' },
  chains: Object.fromEntries(LIMBS.map((k, i) => [k, { parent: k[0] === 'F' ? 'chest' : 'pelvis', hip: [i % 2 ? .5 : -.5, 1, k[0] === 'F' ? .5 : -.5],
    upperLength: .7, lowerLength: .7, bendPole: [0, 0, 1], restSoleFromPaw: [0, -.1, 0], restPlant: [i % 2 ? .5 : -.5, .1, k[0] === 'F' ? .5 : -.5], footHalfExtents: [.2, .05, .2], movingMassKg: 127.5 }])) as BindDefinition['chains'] };
const carrier = { position: nativePoint([0, 0, 0]), yaw: 0, velocity: [0, 0, 0] as const, acceleration: [0, 0, 0] as const, yawRate: 0, yawAcceleration: 0 };
const state: OwnerState = { executionEvidence: 'native-current', clock: { tick: 0, time: 0 }, carrier,
  body: { amount: 0, rate: 0, acceleration: 0, target: 0, requestedAt: 0 },
  limbs: Object.fromEntries(LIMBS.map(k => [k, { ...initial, mode: 'loaded', point: nativePoint(bind.chains[k].restPlant), velocity: [0, 0, 0],
    lease: { owner: 'controlled-ground', revision: 1, generation: 'g1', localPoint: [0, 0, 0], localYaw: 0 } }])) as OwnerState['limbs'] };
const frame: Frame = { clock: { tick: 1, time: dt }, carrier, command: { stance: 1, cancel: false, move: false, turn: false } };
const fake = (kind: string): Witness => ({ clock: frame.clock, accepted: true, evidence: 'controlled-source', kind, receipt: 'NOT_NATIVE' });
const provider: ContactProvider = {
  committedPose: () => fake('pose'),
  transport: (_f, limb, lease) => ({ ...fake('transport'), lease, point: nativePoint(bind.chains[limb].restPlant), velocity: [0, 0, 0], acceleration: [0, 0, 0], yaw: 0, yawRate: 0 }),
  pad: (_f, _limb, point, yaw) => ({ ...fake('pad'), point, yaw, velocity: [0, 0, 0], normal: [0, 1, 0], lease: state.limbs.FL.lease! }),
  findPlant: () => null, authorizeUnload: () => fake('authorize'), release: () => fake('release'), footSweep: () => fake('sweep'),
  bodySweep: () => fake('body'), loadSupport: () => fake('load'),
};
const rejected = step(bind, state, frame, provider);
assert.equal(rejected.ok, false);
assert.ok(rejected.trace.failures.includes('ACTUAL_CURRENT_POSE_UNSUPPORTED_OR_MISMATCH'));
assert.deepEqual(Object.keys(rejected.trace.limbs), [...LIMBS]);
assert.equal(rejected.trace.clock.time, dt);
assert.ok(rejected.trace.bodyReceipts.every(w => w.evidence === 'controlled-source'));
assert.ok(rejected.trace.failures.includes('WHOLE_BODY_CLEARANCE_UNSUPPORTED_OR_BLOCKED'));
assert.deepEqual(state.limbs.FL.lease?.revision, 1);
assert.deepEqual(step(bind, state, frame, provider).trace, rejected.trace);
console.log('Controlled causal kernel/policy/rejection checks passed; asset/native/source circuit NOT qualified.');
