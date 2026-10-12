import RAPIER from '@dimforge/rapier3d-compat';

/** This module owns no world, controller, bones, forces, or physics stepping. */
export type NativePoint = Readonly<{ space: 'native-m-y-up'; x: number; y: number; z: number }>;
export type AuthoredPoint = Readonly<{ space: 'authored-unit-z-up'; x: number; y: number; z: number }>;
export type NativeDirection = Readonly<{ space: 'native-unit-direction-y-up'; x: number; y: number; z: number }>;
export type NativeVelocity = Readonly<{ space: 'native-m-per-s-y-up'; x: number; y: number; z: number }>;
export type ColliderLocalPoint = Readonly<{ space: 'collider-local-m'; x: number; y: number; z: number }>;
export type ColliderLocalDirection = Readonly<{ space: 'collider-local-unit-direction'; x: number; y: number; z: number }>;
export type QueryShapeLocalPoint = Readonly<{ space: 'queried-shape-local-m'; x: number; y: number; z: number }>;
export type QueryShapeLocalDirection = Readonly<{ space: 'queried-shape-local-unit-direction'; x: number; y: number; z: number }>;
export type Rotation = Readonly<{ x: number; y: number; z: number; w: number }>;
export type Clock = Readonly<{ generation: string; tick: number; seconds: number; dt: number }>;
export type OwnerKey = Readonly<{ generation: string; id: string; revision: number }>;
export type Motion = Readonly<{ displacement: NativePoint; angularRadians: number }>;
export type Pad = Readonly<{ center: NativePoint; half: NativePoint; yaw: number }>;
export type Pose = Readonly<{ position: NativePoint; rotation: Rotation }>;
export type RayWitness = Readonly<{ origin: NativePoint; direction: NativeDirection; maxDistance: number;
  owner: OwnerKey; point: NativePoint; normal: NativeDirection; distance: number; featureType: number; featureId?: number }>;
export type ContactWitness = Readonly<{ distance: number; pointOnSupport: NativePoint;
  pointOnPad: NativePoint; normalOnSupport: NativeDirection; normalOnPad: NativeDirection }>;
export type SupportWitness = Readonly<{ kind: 'complete-cuboid-pad'; clock: Clock; owner: OwnerKey;
  pad: Pad; colliderPose: Pose; localAnchor: ColliderLocalPoint; localNormal: ColliderLocalDirection;
  worldAnchor: NativePoint; worldNormal: NativeDirection; rays: readonly RayWitness[];
  contact: ContactWitness; edgeMargin: number }>;
export type QueriedShape = Readonly<{ shape: 'cuboid';
  halfExtents: NativePoint; startPose: Pose; displacement: NativePoint; localFrame: 'queried-shape-local';
} & ({ kind: 'exact-pad'; representsActualPadSurface: true } | { kind: 'conservative-yaw-enclosure'; representsActualPadSurface: false })>;
export type SweepHit = Readonly<{ owner: OwnerKey; fraction: number; queriedShape: QueriedShape;
  queriedShapePoseAtHit: Pose; colliderPoseAtHit: Pose; witness1Local: QueryShapeLocalPoint;
  witness2Local: ColliderLocalPoint; normal1Local: QueryShapeLocalDirection; normal2Local: ColliderLocalDirection }>;
export type SweepWitness = Readonly<{ kind: 'committed-cuboid-envelope-sweep'; clock: Clock;
  enclosure: 'exact-fixed-yaw' | 'conservative-all-yaw-square-prism'; angularPathBound: number;
  queriedHalf: NativePoint; queriedRotation: Rotation; queriedShape: QueriedShape;
  pad: Pad; displacement: NativePoint; intervalSeconds: number; clearance: number;
  checked: readonly { owner: OwnerKey; pose: Pose; colliderShape: { shape: 'cuboid'; halfExtents: NativePoint }; motion: Motion; hit: SweepHit | null }[] }>;
export type Result<T> = { accepted: true; witness: T } | { accepted: false; reason: string; raw?: unknown };

const EPS = 1e-5;
const MAX_INTERVAL = 1 / 30;
const claimedGenerations = new Set<string>();
const claimedWorlds = new WeakSet<RAPIER.World>();
export const native = (x: number, y: number, z: number): NativePoint => Object.freeze({ space: 'native-m-y-up', x, y, z });
export const authored = (x: number, y: number, z: number): AuthoredPoint => Object.freeze({ space: 'authored-unit-z-up', x, y, z });
/** Right handed boundary: authored +X -> native +X, +Y -> -Z, +Z -> +Y; length scale .8. */
export function toNative(p: AuthoredPoint): NativePoint { assertAuthored(p); return native(.8 * p.x, .8 * p.z, -.8 * p.y); }
export function toAuthored(p: NativePoint): AuthoredPoint { assertNative(p); return authored(p.x / .8, -p.z / .8, p.y / .8); }
const add = (a: NativePoint, b: NativePoint) => native(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: NativePoint, b: NativePoint) => native(a.x - b.x, a.y - b.y, a.z - b.z);
const vec = (p: { x: number; y: number; z: number }) => native(p.x, p.y, p.z);
const tagged = <S extends string>(space: S, p: { x: number; y: number; z: number }) => Object.freeze({ space, x: p.x, y: p.y, z: p.z });
const direction = (p: { x: number; y: number; z: number }): NativeDirection => tagged('native-unit-direction-y-up', p);
const finite = (...n: number[]) => n.every(Number.isFinite);
type XYZ = { x: number; y: number; z: number };
const UNIT_TOLERANCE = 1e-5; // Validation tolerance only, not query/geometry tuning.
export class NativeValidationError extends Error {
  constructor(message: string, readonly nativeRaw: unknown) { super(message); }
}
function validateXYZ(p: XYZ, label: string): void {
  if (!p || !finite(p.x, p.y, p.z) || !finite(Math.fround(p.x), Math.fround(p.y), Math.fround(p.z)))
    throw new NativeValidationError(`invalid native ${label}: nonfinite/unrepresentable vector`, p);
}
function validateNormal(p: XYZ, label: string): void {
  validateXYZ(p, label);
  if (Math.abs(Math.hypot(p.x, p.y, p.z) - 1) > UNIT_TOLERANCE)
    throw new NativeValidationError(`invalid native ${label}: nonunit normal`, p);
}
function validateRotation(q: Rotation, label: string): void {
  if (!q || !finite(q.x, q.y, q.z, q.w) || Math.abs(Math.hypot(q.x, q.y, q.z, q.w) - 1) > UNIT_TOLERANCE)
    throw new NativeValidationError(`invalid native ${label}: nonfinite/nonunit quaternion`, q);
}
/** No sanitization, no fallback geometry; only finite positive native cuboid shapes participate. */
function validateCollider(c: RAPIER.Collider): void {
  validateXYZ(c.translation(), 'collider position'); validateRotation(c.rotation(), 'collider rotation');
  if (c.shape.type !== RAPIER.ShapeType.Cuboid) throw new NativeValidationError('unsupported native collider geometry', { type: c.shape.type });
  const actual = c.halfExtents(), copied = (c.shape as RAPIER.Cuboid).halfExtents;
  validateXYZ(actual, 'collider half extents'); validateXYZ(copied, 'shape half extents');
  if (Math.min(actual.x, actual.y, actual.z) <= 0 || Math.min(copied.x, copied.y, copied.z) <= 0 ||
    Math.abs(actual.x - copied.x) > EPS || Math.abs(actual.y - copied.y) > EPS || Math.abs(actual.z - copied.z) > EPS)
    throw new NativeValidationError('invalid native cuboid extents', { actual, copied });
}
function validateRay(hit: RAPIER.RayIntersection, maxDistance: number): void {
  if (!finite(hit.timeOfImpact) || hit.timeOfImpact < 0 || hit.timeOfImpact > maxDistance)
    throw new NativeValidationError('invalid native ray distance', hit);
  validateNormal(hit.normal, 'ray normal');
  if (!Number.isSafeInteger(hit.featureType) || (hit.featureId !== undefined && !Number.isSafeInteger(hit.featureId)))
    throw new NativeValidationError('invalid native ray feature', hit);
}
function validateContact(contact: RAPIER.ShapeContact): void {
  if (!finite(contact.distance)) throw new NativeValidationError('invalid native contact distance', contact);
  validateXYZ(contact.point1, 'contact point1'); validateXYZ(contact.point2, 'contact point2');
  validateNormal(contact.normal1, 'contact normal1'); validateNormal(contact.normal2, 'contact normal2');
}
function validateCast(hit: RAPIER.ShapeCastHit): void {
  if (!finite(hit.time_of_impact) || hit.time_of_impact < 0 || hit.time_of_impact > 1)
    throw new NativeValidationError('invalid native cast fraction', hit);
  validateXYZ(hit.witness1, 'cast witness1'); validateXYZ(hit.witness2, 'cast witness2');
  validateNormal(hit.normal1, 'cast normal1'); validateNormal(hit.normal2, 'cast normal2');
}
function rejectionRaw(frame: Frame, collected: unknown, e?: unknown): unknown {
  return { clock: frame.clock, collected, invalidNative: e instanceof NativeValidationError ? e.nativeRaw : undefined };
}
function assertNative(p: NativePoint): void {
  if (!p || p.space !== 'native-m-y-up') throw Error('units: native metres/Y-up required');
  validateXYZ(p, 'tagged input');
}
function assertAuthored(p: AuthoredPoint): void {
  if (!p || p.space !== 'authored-unit-z-up' || !finite(p.x, p.y, p.z)) throw Error('units: authored units/Z-up required');
}
function rotate(p: NativePoint, q: Rotation, inverse = false): NativePoint {
  const x = inverse ? -q.x : q.x, y = inverse ? -q.y : q.y, z = inverse ? -q.z : q.z;
  const tx = 2 * (y * p.z - z * p.y), ty = 2 * (z * p.x - x * p.z), tz = 2 * (x * p.y - y * p.x);
  return native(p.x + q.w * tx + y * tz - z * ty, p.y + q.w * ty + z * tx - x * tz, p.z + q.w * tz + x * ty - y * tx);
}
const quat = (yaw: number): Rotation => Object.freeze({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
function pose(c: RAPIER.Collider): Pose { validateCollider(c); return deepFreeze({ position: vec(c.translation()), rotation: { ...c.rotation() } }); }
function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') { for (const child of Object.values(v)) deepFreeze(child); Object.freeze(v); }
  return v;
}
function signature(c: RAPIER.Collider): string {
  return JSON.stringify({ pose: pose(c), enabled: c.isEnabled(), sensor: c.isSensor(),
    parent: c.parent()?.handle ?? null, parentEnabled: c.parent()?.isEnabled() ?? true,
    shape: c.shape });
}
interface Entry { key: OwnerKey; collider: RAPIER.Collider; active: boolean; geometry: string; parent: RAPIER.RigidBody | null }
interface Snapshot { entry: Entry; signature: string; pose: Pose; motion: Motion }
export interface Frame { readonly clock: Clock }

/** Trusted scene lifecycle registry. IDs cannot be rebound without a strictly newer revision.
 * Handle alone is never identity. Caller must retire before removal and register replacement.
 * Each physics commit must publish a monotonic clock and the committed motion of EVERY collider.
 */
export class NativeContactProvider {
  private entries = new Map<string, Entry>();
  private colliders = new Map<RAPIER.Collider, Entry>();
  private frames = new WeakMap<Frame, Snapshot[]>();
  private supports = new WeakSet<object>();
  private current?: Frame;
  private lastClock?: Clock;
  private disposed = false;
  constructor(readonly world: RAPIER.World, readonly generation: string) {
    if (!generation.trim() || claimedGenerations.has(generation) || claimedWorlds.has(world)) throw Error('generation/world missing/reused');
    claimedGenerations.add(generation); claimedWorlds.add(world);
  }
  register(id: string, revision: number, collider: RAPIER.Collider): OwnerKey {
    this.live();
    const previous = this.entries.get(id);
    if (!id.trim() || !Number.isSafeInteger(revision) || revision < 1 ||
      (previous && revision <= previous.key.revision) || this.colliders.has(collider) ||
      !collider.isValid() || this.world.getCollider(collider.handle) !== collider) throw Error('owner registration invalid/reused');
    if (previous?.active) throw Error('retire current owner before replacement');
    validateCollider(collider);
    const key = deepFreeze({ generation: this.generation, id, revision });
    const entry = { key, collider, active: true, geometry: JSON.stringify(collider.shape), parent: collider.parent() };
    this.entries.set(id, entry); this.colliders.set(collider, entry); this.current = undefined;
    return key;
  }
  retire(key: OwnerKey): void {
    this.live(); const e = this.resolve(key); e.active = false; this.current = undefined;
  }
  dispose(): void { this.disposed = true; this.current = undefined; this.entries.clear(); this.colliders.clear(); }
  private live(): void { if (this.disposed) throw Error('provider disposed'); }
  private resolve(key: OwnerKey): Entry {
    const e = this.entries.get(key.id);
    if (key.generation !== this.generation || !e || !e.active || e.key.revision !== key.revision ||
      !e.collider.isValid() || this.world.getCollider(e.collider.handle) !== e.collider ||
      !e.collider.isEnabled() || e.collider.isSensor() || e.collider.parent() !== e.parent || JSON.stringify(e.collider.shape) !== e.geometry ||
      (e.collider.parent() && !e.collider.parent()!.isEnabled()))
      throw Error('owner retired/disabled/reused/stale');
    validateCollider(e.collider); return e;
  }
  beginFrame(clock: Clock, motions: ReadonlyMap<string, Motion>): Frame {
    this.live();
    const previous = this.lastClock;
    if (clock.generation !== this.generation || !Number.isSafeInteger(clock.tick) || clock.tick < 0 ||
      !finite(clock.seconds, clock.dt) || clock.seconds < 0 || clock.dt <= 0 || clock.dt > MAX_INTERVAL + 1e-12 ||
      !finite(this.world.timestep) || Math.abs(this.world.timestep - clock.dt) > 1e-8 ||
      (previous && (clock.tick !== previous.tick + 1 || Math.abs(clock.seconds - previous.seconds - clock.dt) > 1e-8)))
      throw Error('clock: noncommitted/inconsistent interval');
    const snapshots: Snapshot[] = [];
    this.world.forEachCollider(c => {
      validateCollider(c);
      const e = this.colliders.get(c);
      // Disabled/sensor colliders do not participate; an enabled unregistered/retired collider bars admission.
      if (!c.isEnabled() || c.isSensor() || (c.parent() && !c.parent()!.isEnabled())) return;
      if (!e || !e.active || this.resolve(e.key).collider !== c) throw Error('unregistered/retired active collider');
      const m = motions.get(e.key.id);
      if (!m) throw Error('missing committed owner motion');
      assertNative(m.displacement);
      assertNative(add(vec(c.translation()), m.displacement));
      if (!finite(m.angularRadians) || m.angularRadians !== 0) throw Error('angular committed motion unsupported');
      snapshots.push({ entry: e, signature: signature(c), pose: pose(c), motion: deepFreeze({ displacement: vec(m.displacement), angularRadians: 0 }) });
    });
    const frame = deepFreeze({ clock: { ...clock } }); this.frames.set(frame, snapshots); this.current = frame; this.lastClock = frame.clock; return frame;
  }
  private check(frame: Frame): Snapshot[] {
    this.live(); const snapshots = this.frames.get(frame);
    if (!snapshots || this.current !== frame) throw Error('clock: stale/foreign frame');
    let enabled = 0;
    this.world.forEachCollider(c => { validateCollider(c); if (c.isEnabled() && !c.isSensor() && (!c.parent() || c.parent()!.isEnabled())) enabled++; });
    if (enabled !== snapshots.length) throw Error('scene changed after commit');
    for (const s of snapshots) if (this.resolve(s.entry.key).collider !== s.entry.collider || signature(s.entry.collider) !== s.signature)
      throw Error('scene/owner changed after commit');
    return snapshots;
  }
  private pad(pad: Pad): { shape: RAPIER.Cuboid; rotation: Rotation } {
    assertNative(pad.center); assertNative(pad.half);
    if (!finite(pad.yaw) || Math.min(Math.fround(pad.half.x), Math.fround(pad.half.y), Math.fround(pad.half.z)) <= 0) throw Error('invalid finite pad');
    const rotation = quat(pad.yaw); validateRotation(rotation, 'pad rotation');
    return { shape: new RAPIER.Cuboid(pad.half.x, pad.half.y, pad.half.z), rotation };
  }
  samplePad(frame: Frame, pad: Pad): Result<SupportWitness> {
    const raw: RayWitness[] = [];
    try {
      const snapshots = this.check(frame), { shape, rotation } = this.pad(pad);
      const soleY = pad.center.y - pad.half.y, probeRise = .025, probeDepth = .05;
      for (const offset of [native(0, 0, 0), native(-pad.half.x, 0, -pad.half.z), native(-pad.half.x, 0, pad.half.z), native(pad.half.x, 0, -pad.half.z), native(pad.half.x, 0, pad.half.z)]) {
        const turned = rotate(offset, rotation), origin = native(pad.center.x + turned.x, soleY + probeRise, pad.center.z + turned.z);
        assertNative(origin);
        const down = direction({ x: 0, y: -1, z: 0 }), ray = new RAPIER.Ray(origin, down);
        let nearest: { snapshot: Snapshot; hit: RAPIER.RayIntersection } | undefined;
        for (const snapshot of snapshots) {
          const hit = snapshot.entry.collider.castRayAndGetNormal(ray, probeRise + probeDepth, true);
          if (hit) validateRay(hit, probeRise + probeDepth);
          if (hit && (!nearest || hit.timeOfImpact < nearest.hit.timeOfImpact)) nearest = { snapshot, hit };
        }
        if (!nearest) return { accepted: false, reason: 'partial footprint: missing native ray', raw: rejectionRaw(frame, raw) };
        const { snapshot, hit } = nearest;
        const point = native(origin.x, origin.y - hit.timeOfImpact, origin.z); assertNative(point);
        raw.push(deepFreeze({ origin, direction: down, maxDistance: probeRise + probeDepth, owner: snapshot.entry.key,
          point, normal: direction(hit.normal), distance: hit.timeOfImpact, featureType: hit.featureType, featureId: hit.featureId }));
      }
      const center = raw[0], support = snapshots.find(s => s.entry.key === center.owner)!;
      if (raw.some(r => r.owner !== center.owner || r.normal.y < .99999 || !finite(r.distance) || Math.abs(r.point.y - soleY) > .002 || Math.abs(r.point.y - center.point.y) > EPS))
        return { accepted: false, reason: 'partial/discontinuous/nonhorizontal support', raw: rejectionRaw(frame, raw) };
      const c = support.entry.collider;
      if (c.shape.type !== RAPIER.ShapeType.Cuboid) return { accepted: false, reason: 'unsupported face geometry; rays alone cannot prove pad coverage', raw: rejectionRaw(frame, raw) };
      const half = c.halfExtents(), localNormal = rotate(vec(center.normal), support.pose.rotation, true);
      const components = [localNormal.x, localNormal.y, localNormal.z], axis = components.findIndex(n => Math.abs(n) > .99999);
      if (axis < 0 || components.some((n, i) => i !== axis && Math.abs(n) > EPS)) return { accepted: false, reason: 'not one planar cuboid face', raw: rejectionRaw(frame, raw) };
      const extents = [half.x, half.y, half.z], sign = Math.sign(components[axis]); let edgeMargin = Infinity;
      for (const r of raw) {
        const p = rotate(sub(r.point, support.pose.position), support.pose.rotation, true), xyz = [p.x, p.y, p.z];
        if (Math.abs(xyz[axis] - sign * extents[axis]) > EPS) return { accepted: false, reason: 'native ray outside selected finite face', raw: rejectionRaw(frame, raw) };
        for (let i = 0; i < 3; i++) if (i !== axis) edgeMargin = Math.min(edgeMargin, extents[i] - Math.abs(xyz[i]));
      }
      // Convex rectangle: all four corners strictly inside the actual finite face entails whole sole containment.
      if (edgeMargin < .001) return { accepted: false, reason: 'footprint reaches/exceeds finite face edge', raw: rejectionRaw(frame, raw) };
      const contact = c.contactShape(shape, pad.center, rotation, .002);
      if (contact) validateContact(contact);
      if (!contact || !finite(contact.distance) || contact.distance < -.0001 || contact.distance > .002 || contact.normal1.y < .99999)
        return { accepted: false, reason: 'native pad/support contact envelope rejected', raw: rejectionRaw(frame, { rays: raw, contact }) };
      // Other geometry must not intersect the measured pad volume; support is the only tolerated contact.
      for (const s of snapshots) if (s !== support && shape.intersectsShape(pad.center, rotation, s.entry.collider.shape, s.pose.position, s.pose.rotation))
        return { accepted: false, reason: 'pad volume overlaps other native geometry', raw: rejectionRaw(frame, raw) };
      this.check(frame);
      const localAnchor = rotate(sub(center.point, support.pose.position), support.pose.rotation, true);
      validateXYZ(localAnchor, 'support local anchor'); validateNormal(localNormal, 'support local normal');
      const witness: SupportWitness = deepFreeze({ kind: 'complete-cuboid-pad', clock: frame.clock, owner: center.owner,
        pad: { center: vec(pad.center), half: vec(pad.half), yaw: pad.yaw }, colliderPose: support.pose,
        localAnchor: tagged('collider-local-m', localAnchor), localNormal: tagged('collider-local-unit-direction', localNormal),
        worldAnchor: center.point, worldNormal: center.normal, rays: raw, edgeMargin,
        contact: { distance: contact.distance, pointOnSupport: vec(contact.point1), pointOnPad: vec(contact.point2), normalOnSupport: direction(contact.normal1), normalOnPad: direction(contact.normal2) } });
      this.supports.add(witness); return { accepted: true, witness };
    } catch (e) { return { accepted: false, reason: String(e), raw: rejectionRaw(frame, raw, e) }; }
  }
  /** Transport is a lifecycle/pose witness, NOT renewed contact, force, or plant permission. Call samplePad again. */
  transport(frame: Frame, previous: SupportWitness): Result<{ clock: Clock; owner: OwnerKey; worldAnchor: NativePoint; worldNormal: NativeDirection; colliderPose: Pose; measuredVelocity: NativeVelocity }> {
    try {
      const snapshots = this.check(frame);
      if (!this.supports.has(previous) || previous.clock.generation !== frame.clock.generation || previous.clock.tick + 1 !== frame.clock.tick ||
        Math.abs(frame.clock.seconds - previous.clock.seconds - frame.clock.dt) > 1e-8)
        throw Error('foreign/stale/nonprevious admitted support');
      const entry = this.resolve(previous.owner), s = snapshots.find(s => s.entry === entry);
      if (!s) throw Error('support not current');
      const worldAnchor = add(s.pose.position, rotate(vec(previous.localAnchor), s.pose.rotation)), delta = sub(worldAnchor, previous.worldAnchor);
      assertNative(worldAnchor); assertNative(delta);
      const measured = { x: delta.x / frame.clock.dt, y: delta.y / frame.clock.dt, z: delta.z / frame.clock.dt };
      validateXYZ(measured, 'measured velocity');
      const normal = rotate(vec(previous.localNormal), s.pose.rotation); validateNormal(normal, 'transported normal');
      return { accepted: true, witness: deepFreeze({ clock: frame.clock, owner: entry.key, colliderPose: s.pose, worldAnchor,
        measuredVelocity: tagged('native-m-per-s-y-up', measured), worldNormal: direction(normal) }) };
    } catch (e) { return { accepted: false, reason: String(e), raw: rejectionRaw(frame, { previousClock: previous.clock }, e) }; }
  }
  /** Conditional finite interval evidence: pad and every scene collider follow supplied committed linear motions.
   * Pad yaw uses a conservative all-yaw square prism; scene angular motion and pad tilt are unsupported.
   * No ignored support collider; a loaded pad touching its floor blocks.
   */
  sweep(frame: Frame, pad: Pad, motion: Motion, clearance = .001): Result<SweepWitness> {
    const checked: SweepWitness['checked'][number][] = [];
    try {
      const snapshots = this.check(frame), exact = this.pad(pad);
      assertNative(motion.displacement);
      if (!finite(motion.angularRadians, clearance) || motion.angularRadians < 0 || motion.angularRadians > 2 * Math.PI || clearance < 0 || clearance > .02) throw Error('unsupported rotation/clearance');
      const rotating = motion.angularRadians > 0, radius = Math.hypot(pad.half.x, pad.half.z);
      const queriedHalf = rotating ? native(radius, pad.half.y, radius) : vec(pad.half);
      assertNative(queriedHalf);
      const shape = rotating ? new RAPIER.Cuboid(radius, pad.half.y, radius) : exact.shape;
      const rotation = rotating ? quat(0) : exact.rotation;
      validateRotation(rotation, 'queried shape rotation');
      assertNative(add(pad.center, motion.displacement));
      const queriedShape: QueriedShape = deepFreeze({
        shape: 'cuboid', halfExtents: queriedHalf, startPose: { position: vec(pad.center), rotation },
        displacement: vec(motion.displacement), localFrame: 'queried-shape-local',
        ...(rotating ? { kind: 'conservative-yaw-enclosure' as const, representsActualPadSurface: false as const } : { kind: 'exact-pad' as const, representsActualPadSurface: true as const }) });
      for (const s of snapshots) {
        if (s.entry.collider.shape.type !== RAPIER.ShapeType.Cuboid) throw Error('unsupported sweep obstacle geometry');
        assertNative(sub(pad.center, s.pose.position)); assertNative(sub(motion.displacement, s.motion.displacement));
        // Velocities are displacements per normalized interval; maxToi=1 means the complete committed dt.
        const hit = shape.castShape(pad.center, rotation, motion.displacement, s.entry.collider.shape,
          s.pose.position, s.pose.rotation, s.motion.displacement, clearance, 1, true);
        if (hit) validateCast(hit);
        const fractionPose = (start: Pose, displacement: NativePoint, fraction: number): Pose => {
          const position = native(start.position.x + displacement.x * fraction, start.position.y + displacement.y * fraction, start.position.z + displacement.z * fraction);
          assertNative(position); return deepFreeze({ position, rotation: start.rotation });
        };
        const witness: SweepHit | null = hit ? deepFreeze({ owner: s.entry.key, fraction: hit.time_of_impact, queriedShape,
          queriedShapePoseAtHit: fractionPose(queriedShape.startPose, motion.displacement, hit.time_of_impact), colliderPoseAtHit: fractionPose(s.pose, s.motion.displacement, hit.time_of_impact),
          witness1Local: tagged('queried-shape-local-m', hit.witness1), witness2Local: tagged('collider-local-m', hit.witness2), normal1Local: tagged('queried-shape-local-unit-direction', hit.normal1), normal2Local: tagged('collider-local-unit-direction', hit.normal2) }) : null;
        checked.push(deepFreeze({ owner: s.entry.key, pose: s.pose, colliderShape: { shape: 'cuboid', halfExtents: vec(s.entry.collider.halfExtents()) }, motion: s.motion, hit: witness }));
      }
      this.check(frame);
      const witness: SweepWitness = deepFreeze({ kind: 'committed-cuboid-envelope-sweep', clock: frame.clock,
        enclosure: rotating ? 'conservative-all-yaw-square-prism' : 'exact-fixed-yaw', angularPathBound: motion.angularRadians, queriedHalf, queriedRotation: rotation, queriedShape,
        pad: { center: vec(pad.center), half: vec(pad.half), yaw: pad.yaw }, displacement: vec(motion.displacement),
        intervalSeconds: frame.clock.dt, clearance, checked });
      if (checked.some(c => c.hit)) return { accepted: false, reason: 'native swept envelope blocked', raw: witness };
      return { accepted: true, witness };
    } catch (e) { return { accepted: false, reason: String(e), raw: rejectionRaw(frame, checked, e) }; }
  }
}
