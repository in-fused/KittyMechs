import type { NativePoint, V3 } from './coordinates.js';
export const LIMBS = ['FL', 'FR', 'HL', 'HR'] as const;
export type Limb = typeof LIMBS[number];
export type Core = 'pelvis' | 'spine' | 'chest' | 'head';
export type Evidence = 'native-current' | 'controlled-source';
export interface Clock { readonly tick: number; readonly time: number }
export interface Carrier {
  readonly position: NativePoint; readonly yaw: number;
  readonly velocity: V3; readonly acceleration: V3;
  readonly yawRate: number; readonly yawAcceleration: number;
}
export interface SupportLease {
  readonly owner: string; readonly revision: number; readonly generation: string;
  readonly localPoint: V3; readonly localYaw: number;
}
export interface Witness {
  readonly clock: Clock; readonly accepted: boolean; readonly evidence: Evidence;
  readonly kind: string; readonly reason?: string; readonly receipt: unknown;
}
export interface Transport extends Witness {
  /** point is the supported SOLE reference, not the paw bone head. */
  readonly lease: SupportLease; readonly point: NativePoint; readonly velocity: V3;
  readonly acceleration: V3; readonly yaw: number; readonly yawRate: number;
}
export interface Pad extends Witness {
  /** point and lease.localPoint are the actual supported SOLE reference. */
  readonly lease: SupportLease; readonly point: NativePoint; readonly velocity: V3;
  readonly yaw: number; readonly normal: V3;
}
export interface ChainBind {
  readonly parent: 'pelvis' | 'chest'; readonly hip: V3;
  readonly upperLength: number; readonly lowerLength: number;
  readonly bendPole: V3; readonly restSoleFromPaw: V3;
  readonly restPlant: V3; readonly footHalfExtents: V3;
  readonly movingMassKg: number;
}
/** Adapter must extract these exact values from the preserved master, not fabricate a new rig. */
export interface BindDefinition {
  readonly geometryFingerprint: string; readonly masterSHA256: string;
  readonly basis: 'native-m-y-up'; readonly rootBone: 'identity';
  readonly heads: Readonly<Record<Core, V3>>;
  readonly parents: Readonly<Record<Core, Core | 'root'>>;
  readonly chains: Readonly<Record<Limb, ChainBind>>;
}
export type Mode = 'loaded' | 'unload-requested' | 'unloading' | 'to-guard' | 'guard' | 'to-plant' | 'recovery';
export interface LimbState {
  readonly mode: Mode; readonly point: NativePoint; readonly velocity: V3; readonly acceleration: V3;
  readonly yaw: number; readonly yawRate: number; readonly yawAcceleration: number;
  readonly lease: SupportLease | null; readonly elapsedLoaded: number;
  /** No longer a loaded plant; retained only to verify physical separation during bounded unloading. */
  readonly departingLease: SupportLease | null;
  readonly plantGoal: Pad | null;
}
export interface BodyState { readonly amount: number; readonly rate: number; readonly acceleration: number; readonly target: 0 | 1; readonly requestedAt: number }
export interface OwnerState {
  /** Immutable execution policy. Controlled-source receipts can never authorize native admission. */
  readonly executionEvidence: Evidence;
  readonly clock: Clock; readonly carrier: Carrier; readonly body: BodyState;
  readonly limbs: Readonly<Record<Limb, LimbState>>;
}
export interface Command { readonly stance: 0 | 1; readonly cancel: boolean; readonly move: boolean; readonly turn: boolean }
export interface Frame { readonly clock: Clock; readonly carrier: Carrier; readonly command: Command }
export interface ChainPose {
  readonly hipLocal: V3; readonly kneeLocal: V3 | null; readonly pawLocal: V3;
  readonly hipWorld: NativePoint; readonly kneeWorld: NativePoint | null; readonly pawWorld: NativePoint;
  readonly soleWorld: NativePoint; readonly distance: number; readonly reachMaximum: number;
  readonly pawYawLocal: number; readonly valid: boolean;
}
export interface Pose { readonly carrier: Carrier; readonly rootBone: 'identity'; readonly coreAmount: number; readonly chains: Readonly<Record<Limb, ChainPose>> }
/** Every receipt is current-clock and candidate-specific. Unsupported is a rejection, never permission. */
export interface ContactProvider {
  /** Actual current pose compared with the owner expectation; never inferred from grounded or floor rays. */
  committedPose(frame: Frame, expected: Pose): Witness;
  transport(frame: Frame, limb: Limb, lease: SupportLease): Transport;
  pad(frame: Frame, limb: Limb, sole: NativePoint, yaw: number, halfExtents: V3): Pad;
  findPlant(frame: Frame, limb: Limb, hip: NativePoint, preference: NativePoint, reach: number, halfExtents: V3): Pad | null;
  /** Actual remaining support/load permits this declared batch to unload; does not claim separation. */
  authorizeUnload(frame: Frame, limb: Limb, lease: SupportLease, previousPose: Pose, batch: readonly Limb[]): Witness;
  /** Actual separation AND supported load transfer, not an input flag or KCC grounded bit. */
  release(frame: Frame, limb: Limb, lease: SupportLease, committedPose: Pose): Witness;
  footSweep(frame: Frame, limb: Limb, from: LimbState, to: LimbState, halfExtents: V3): Witness;
  /** Whole body/armor/head/skin between committed poses; native cuboid-only provider cannot supply this. */
  bodySweep(frame: Frame, previous: Pose, proposed: Pose): Witness;
  /** Current actual supported load/COM footprint, including loss of a support revision. */
  loadSupport(frame: Frame, pose: Pose, states: Readonly<Record<Limb, LimbState>>): Witness;
}
export interface LimbTrace {
  readonly limb: Limb; readonly before: LimbState; readonly proposed: LimbState;
  readonly goal: NativePoint | null; readonly pose: ChainPose;
  readonly receipts: readonly Witness[]; readonly failures: readonly string[];
}
export interface Trace {
  readonly clock: Clock; readonly previousClock: Clock; readonly dt: number;
  readonly carrier: Carrier; readonly previousCarrier: Carrier; readonly command: Command;
  readonly geometryFingerprint: string; readonly bodyBefore: BodyState; readonly bodyProposed: BodyState;
  readonly limbs: Readonly<Record<Limb, LimbTrace>>; readonly bodyReceipts: readonly Witness[];
  readonly failures: readonly string[]; readonly continuousClearance: 'UNKNOWN';
}
export type StepResult = { readonly ok: true; readonly state: OwnerState; readonly pose: Pose; readonly trace: Trace }
  | { readonly ok: false; readonly retained: OwnerState; readonly proposed: OwnerState; readonly pose: Pose; readonly trace: Trace };
