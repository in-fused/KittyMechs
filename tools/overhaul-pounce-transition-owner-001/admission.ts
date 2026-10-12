import { angleDifference, length, nativePoint, sub, yawRotate, add } from './coordinates.js';
import { LIMBS } from './contract.js';
import type { BindDefinition, ContactProvider, Evidence, Frame, Limb, LimbState, OwnerState, Witness } from './contract.js';
import { poseOf } from './kinematics.js';

export interface AdmissionResult { readonly accepted: boolean; readonly proposed: OwnerState; readonly receipts: readonly Witness[]; readonly failures: readonly string[] }
/** Initial conditions must come from an actual current pose reader, not rest plants or a grounded boolean. */
export function admitLoaded(bind: BindDefinition, frame: Frame, evidence: Evidence, current: Readonly<Record<Limb, Omit<LimbState, 'mode' | 'lease' | 'departingLease' | 'elapsedLoaded' | 'plantGoal'>>>, amount: 0 | 1, provider: ContactProvider): AdmissionResult {
  const failures: string[] = [], receipts: Witness[] = [], limbs = {} as Record<Limb, LimbState>;
  const accept = (w: Witness): boolean => w.accepted && w.evidence === evidence && w.clock.tick === frame.clock.tick && w.clock.time === frame.clock.time;
  for (const limb of LIMBS) {
    const k = current[limb], sole = nativePoint(add(k.point.value, yawRotate(bind.chains[limb].restSoleFromPaw, k.yaw)));
    const pad = provider.pad(frame, limb, sole, k.yaw, bind.chains[limb].footHalfExtents); receipts.push(pad);
    if (!accept(pad) || length(sub(pad.point.value, sole.value)) > 1e-8 || Math.abs(angleDifference(pad.yaw, k.yaw)) > 1e-8) failures.push(`${limb}:EXACT_CURRENT_SOLE_LEASE_UNAVAILABLE`);
    limbs[limb] = { ...k, mode: 'loaded', lease: accept(pad) ? pad.lease : null, departingLease: null, elapsedLoaded: 0, plantGoal: null };
  }
  const proposed: OwnerState = { executionEvidence: evidence, clock: frame.clock, carrier: frame.carrier,
    body: { amount, rate: 0, acceleration: 0, target: amount, requestedAt: frame.clock.time }, limbs };
  const pose = poseOf(bind, frame.carrier, amount, limbs);
  const actual = provider.committedPose(frame, pose), load = provider.loadSupport(frame, pose, limbs); receipts.push(actual, load);
  if (!accept(actual)) failures.push('INITIAL_ACTUAL_POSE_UNSUPPORTED');
  if (!accept(load)) failures.push('INITIAL_LOAD_SUPPORT_UNSUPPORTED');
  if (LIMBS.some(k => !pose.chains[k].valid)) failures.push('INITIAL_FIXED_CHAIN_REACH_INVALID');
  if (bind.geometryFingerprint !== '302781eb955fbb21614f637bf510e4242c55672bb08cde5e903f927d47f94220') failures.push('INITIAL_IMMUTABLE_BIND_MISMATCH');
  return { accepted: failures.length === 0, proposed, receipts, failures };
}
