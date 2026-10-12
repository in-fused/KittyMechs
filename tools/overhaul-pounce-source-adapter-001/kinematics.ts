import { add, cross, dot, length, mul, sub, unit, xRotate, yawRotate, nativePoint } from './coordinates.js';
import type { V3 } from './coordinates.js';

import type { BindDefinition, Carrier, ChainPose, Core, Limb, LimbState, Pose } from './contract.js';
export const CORE_ANGLES: Readonly<Record<Core, number>> = { pelvis: -.10, spine: -.85, chest: -.40, head: 1.65 };
export interface CoreFrame { readonly angle: number; readonly translation: V3 }
/** Absolute skeleton-local frames. The root bone stays identity. Crouch is explicit native Y. */
export function coreFrames(bind: BindDefinition, amount: number): Readonly<Record<Core | 'root', CoreFrame>> {
  const frames: Record<Core | 'root', CoreFrame> = {
    root: { angle: 0, translation: [0, 0, 0] },
    pelvis: { angle: 0, translation: [0, 0, 0] }, spine: { angle: 0, translation: [0, 0, 0] },
    chest: { angle: 0, translation: [0, 0, 0] }, head: { angle: 0, translation: [0, 0, 0] },
  };
  for (const name of ['pelvis', 'spine', 'chest', 'head'] as const) {
    const parent = frames[bind.parents[name]], angle = parent.angle + CORE_ANGLES[name] * amount;
    frames[name] = { angle, translation: add(parent.translation, sub(xRotate(bind.heads[name], parent.angle), xRotate(bind.heads[name], angle))) };
  }
  return frames;
}
export function hipLocal(bind: BindDefinition, limb: Limb, amount: number): V3 {
  const c = coreFrames(bind, amount)[bind.chains[limb].parent];
  return add(xRotate(bind.chains[limb].hip, c.angle), c.translation);
}
export const toWorld = (local: V3, carrier: Carrier): V3 => add(carrier.position.value, yawRotate(local, carrier.yaw));
export const toLocal = (world: V3, carrier: Carrier): V3 => yawRotate(sub(world, carrier.position.value), -carrier.yaw);
/** No reach clamp, epsilon enlargement, stretched link or hidden target projection. */
export function chainPose(bind: BindDefinition, limb: Limb, amount: number, carrier: Carrier, state: LimbState): ChainPose {
  const c = bind.chains[limb], hip = hipLocal(bind, limb, amount), paw = toLocal(state.point.value, carrier);
  const delta = sub(paw, hip), distance = length(delta), maximum = c.upperLength + c.lowerLength;
  const valid = Number.isFinite(distance) && distance > Math.abs(c.upperLength - c.lowerLength) && distance < maximum;
  let knee: V3 | null = null;
  if (valid) {
    const axis = unit(delta), along = (c.upperLength ** 2 - c.lowerLength ** 2 + distance ** 2) / (2 * distance);
    const core = coreFrames(bind, amount)[c.parent];
    const pole = xRotate(c.bendPole, core.angle);
    const plane = sub(pole, mul(axis, dot(pole, axis)));
    const radiusSquared = c.upperLength ** 2 - along ** 2;
    if (length(plane) > 1e-9 && radiusSquared >= 0) knee = add(add(hip, mul(axis, along)), mul(unit(plane), Math.sqrt(radiusSquared)));
  }
  const localYaw = state.yaw - carrier.yaw;
  const sole = add(state.point.value, yawRotate(c.restSoleFromPaw, state.yaw));
  return {
    hipLocal: hip, kneeLocal: knee, pawLocal: paw, hipWorld: nativePoint(toWorld(hip, carrier)),
    kneeWorld: knee ? nativePoint(toWorld(knee, carrier)) : null, pawWorld: state.point,
    soleWorld: nativePoint(sole), distance, reachMaximum: maximum, pawYawLocal: localYaw, valid: valid && knee !== null,
  };
}
export function poseOf(bind: BindDefinition, carrier: Carrier, amount: number, states: Readonly<Record<Limb, LimbState>>): Pose {
  const chains: Record<Limb, ChainPose> = { FL: chainPose(bind, "FL", amount, carrier, states.FL), FR: chainPose(bind, "FR", amount, carrier, states.FR), HL: chainPose(bind, "HL", amount, carrier, states.HL), HR: chainPose(bind, "HR", amount, carrier, states.HR) };
  return { carrier, rootBone: 'identity', coreAmount: amount, chains };
}
/** Orthonormal direction frame for the adapter; bind inverse must be applied once there. */
export function directionFrame(head: V3, tail: V3, pole: V3): readonly V3[] {
  const y = unit(sub(tail, head)), x = unit(cross(y, pole)), z = cross(x, y);
  return [x, y, z, head];
}

