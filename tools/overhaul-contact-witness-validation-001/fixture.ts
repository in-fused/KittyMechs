import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../../shared/simulation';
import { buildOverhaulDistrict } from '../../shared/overhaulDistrict';
import { cityBlockColliderDesc, rainlineStreetSource } from '../../shared/rainlineStreetAdmission';
import { terrainMesh } from '../../shared/world';

const OUT = resolve('.sites-runtime/overhaul-20261010/overhaul-contact-witness-validation-001');
const ORIGINAL = '.sites-runtime/overhaul-20261010/rainline-street-admission-001/native-check.json';
const CART_ID = '7734:overhaul:street001:west-loading:00:solid';
const PREDICTION = .04; // Exact failed query value, unchanged.
const NUMERIC_EPS = 1e-4; // Receipt consistency check only; never penetration/admission tolerance.
type V = { x: number; y: number; z: number };
type Q = V & { w: number };
type Pose = { position: V; rotation: Q };
type Clock = { world: 'provenance001-authority'; nativeStep: 1; seconds: number; timestep: number };
type TerrainRegistry = { chunks: Map<string, { terrain: RAPIER.Collider }> };
type OriginalRow = { id: string; position: V; penetrations: { handle: number; shape: number; distance: number; point1: V; point2: V; normal1: V; normal2: V }[] };
type RawContact = { distance: number; point1: V; point2: V; normal1: V; normal2: V };
const copy = (v: V): V => ({ x: v.x, y: v.y, z: v.z });
const plus = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const norm = (v: V) => Math.hypot(v.x, v.y, v.z);
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (v: V, n: number): V => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const sha = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
function finiteVector(v: V, label: string): void {
  assert.ok(v && [v.x, v.y, v.z].every(Number.isFinite), `${label}: nonfinite native vector`);
}
function finitePose(p: Pose): void {
  finiteVector(p.position, 'pose'); finiteVector(p.rotation, 'rotation');
  assert.ok(Number.isFinite(p.rotation.w) && Math.abs(Math.hypot(p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w) - 1) < NUMERIC_EPS, 'invalid native quaternion');
}
function currentPose(c: RAPIER.Collider): Pose { return { position: copy(c.translation()), rotation: { ...c.rotation() } }; }
function arrayHash(array: Float32Array | Uint32Array): string { return sha(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)); }
function shapeData(c: RAPIER.Collider) {
  const vertices = c.vertices(), indices = c.indices();
  return { shapeType: c.shape.type, vertices: Array.from(vertices), indices: indices ? Array.from(indices) : null,
    verticesBytesSHA256: arrayHash(vertices), indicesBytesSHA256: indices ? arrayHash(indices) : null,
    trimeshFlags: c.shape.type === RAPIER.ShapeType.TriMesh ? (c.shape as RAPIER.TriMesh).flags : null };
}
function flags(c: RAPIER.Collider) {
  return { enabled: c.isEnabled(), sensor: c.isSensor(), collisionGroups: c.collisionGroups(), solverGroups: c.solverGroups(),
    activeCollisionTypes: c.activeCollisionTypes(), activeHooks: c.activeHooks(), activeEvents: c.activeEvents(),
    contactSkin: c.contactSkin(), friction: c.friction(), restitution: c.restitution(), density: c.density(), mass: c.mass(),
    parent: c.parent() ? { handle: c.parent()!.handle, bodyType: c.parent()!.bodyType(), enabled: c.parent()!.isEnabled(),
      mass: c.parent()!.mass(), position: copy(c.parent()!.translation()), rotation: { ...c.parent()!.rotation() } } : null };
}
function nativeRaw(contact: RAPIER.ShapeContact | null): RawContact | null {
  return contact ? { distance: contact.distance, point1: copy(contact.point1), point2: copy(contact.point2), normal1: copy(contact.normal1), normal2: copy(contact.normal2) } : null;
}
function rotate(v: V, q: Q): V {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + q.y * tz - q.z * ty, y: v.y + q.w * ty + q.z * tx - q.x * tz, z: v.z + q.w * tz + q.x * ty - q.y * tx };
}

function validateRecordedNumbers(value: unknown, path = 'row'): void {
  if (typeof value === 'number') { assert.ok(Number.isFinite(value), `nonfinite recorded native/numeric value at ${path}`); return; }
  if (value === null || value === undefined || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) validateRecordedNumbers(child, `${path}.${key}`);
}
it('diagnoses exact frozen cart/terrain native witness provenance with raw-first validation STOP', async () => {
  mkdirSync(OUT, { recursive: true });
  const receipt: { status: string; started: string; closed?: string; rows: unknown[]; failure?: string; disposal?: unknown } = {
    status: 'RUNNING_DIAGNOSTIC_NOT_ADMISSION', started: new Date().toISOString(), rows: [] };
  const save = () => writeFileSync(resolve(OUT, 'receipt.json'), JSON.stringify(receipt, (_k, value) => typeof value === 'number' && !Number.isFinite(value) ? { nonfiniteRawNumber: String(value) } : value, 2));
  const worlds: RAPIER.World[] = []; let sim: Simulation | undefined;
  let originalFailure: unknown;
  const row = (value: unknown) => { receipt.rows.push(value); save(); validateRecordedNumbers(value); };
  try {
    const sourceSeal = JSON.parse(readFileSync(resolve(OUT, 'source-seal.json'), 'utf8')) as { inputs: { path: string; sha256: string }[] };
    const verifyInputs = () => sourceSeal.inputs.map(input => {
      const actualSHA256 = sha(readFileSync(input.path));
      assert.equal(actualSHA256.toUpperCase(), input.sha256.toUpperCase(), `frozen provenance input changed: ${input.path}`);
      return { path: input.path, sha256: actualSHA256 };
    });
    row({ kind: 'frozen-input-verification-before-native-allocation', files: verifyInputs() });
    const originalBytes = readFileSync(ORIGINAL), original = JSON.parse(originalBytes.toString()) as { checks: OriginalRow[] };
    const prior = original.checks[0]; assert.equal(prior.id, CART_ID); assert.equal(prior.penetrations.length, 1);
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 }); worlds.push(world);
    sim = new Simulation(world, 7734, 'pvp', 'STREET_NATIVE');
    sim.syncChunks([{ x: -55, y: 1, z: 27 }]); world.step(); // Exact failed authority initialization and one native step.
    const clock: Clock = { world: 'provenance001-authority', nativeStep: 1, seconds: world.timestep, timestep: world.timestep };
    const cart = sim.buildingCollider(CART_ID); assert.ok(cart, 'missing exact native cart owner');
    const chunkRegistry = (sim as unknown as TerrainRegistry).chunks;
    const terrainOwners = [...chunkRegistry].map(([tile, entry]) => ({ id: `terrain:7734:${tile}`, tile, collider: entry.terrain }));
    const sceneIdentity = terrainOwners.map(t => ({ id: t.id, tile: t.tile, handle: t.collider.handle, pose: currentPose(t.collider), flags: flags(t.collider) }));
    row({ kind: 'exact-world-owner-registry', clock, priorReceiptSHA256: sha(originalBytes), cartId: CART_ID, prior, terrainOwners: sceneIdentity, worldColliderCount: world.colliders.len() });
    const terrainOwner = terrainOwners.find(t => t.collider.handle === prior.penetrations[0].handle);
    assert.ok(terrainOwner, 'exact failed terrain handle does not map to canonical current terrain registry');
    const terrain = terrainOwner.collider, cartPose = currentPose(cart), terrainPose = currentPose(terrain);
    row({ kind: 'raw-current-pair-poses', clock, cart: { id: CART_ID, handle: cart.handle, pose: cartPose }, terrain: { id: terrainOwner.id, handle: terrain.handle, pose: terrainPose } });
    finitePose(cartPose); finitePose(terrainPose);
    assert.equal(world.getCollider(cart.handle), cart); assert.equal(world.getCollider(terrain.handle), terrain);
    assert.equal(sim.buildingCollider(CART_ID), cart); assert.equal(chunkRegistry.get(terrainOwner.tile)?.terrain, terrain);
    assert.ok(norm(minus(cartPose.position, prior.position)) < NUMERIC_EPS, 'canonical native cart pose changed');
    assert.equal(cart.shape.type, RAPIER.ShapeType.ConvexPolyhedron); assert.equal(terrain.shape.type, RAPIER.ShapeType.TriMesh);
    const [cx, cz] = terrainOwner.tile.split(',').map(Number), generated = terrainMesh(cx, cz, 32, 7734);
    const terrainData = shapeData(terrain), cartData = shapeData(cart);
    const block = buildOverhaulDistrict(7734)!.blocks.find(b => b.id === CART_ID); assert.ok(block);
    const source = rainlineStreetSource(block); assert.ok(source);
    const unchangedDescriptor = cityBlockColliderDesc(block);
    row({ kind: 'exact-native-pair-provenance', clock, worldSpace: 'native-metres-Y-up',
      terrain: { id: terrainOwner.id, revision: 1, generation: clock.world, tile: terrainOwner.tile, handle: terrain.handle, pose: terrainPose, flags: flags(terrain), data: terrainData,
        generatedVertices: Array.from(generated.vertices), generatedIndices: Array.from(generated.indices), generatedVerticesSHA256: arrayHash(generated.vertices), generatedIndicesSHA256: arrayHash(generated.indices) },
      cart: { id: CART_ID, revision: 1, generation: clock.world, handle: cart.handle, pose: cartPose, flags: flags(cart), data: cartData,
        source, declaredBlock: block, untouchedDescriptor: { mass: unchangedDescriptor.mass, friction: unchangedDescriptor.friction, restitution: unchangedDescriptor.restitution, shapeType: unchangedDescriptor.shape.type } } });
    for (const data of [cartData, terrainData]) {
      assert.ok(data.vertices.length >= 9 && data.vertices.length % 3 === 0, 'invalid native vertex-array dimensions');
      if (data.indices) assert.ok(data.indices.length % 3 === 0 && data.indices.every(i => Number.isSafeInteger(i) && i >= 0 && i < data.vertices.length / 3), 'invalid native triangle indices');
    }
    assert.equal(terrainData.verticesBytesSHA256, arrayHash(generated.vertices), 'canonical terrain vertex readback mismatch');
    assert.equal(terrainData.indicesBytesSHA256, arrayHash(generated.indices), 'canonical terrain index readback mismatch');
    const consistent = new Map<string, boolean>();
    const evaluate = (name: string, first: RAPIER.Collider, second: RAPIER.Collider, firstPose: Pose, secondPose: Pose, query: () => RAPIER.ShapeContact | null, space = 'canonical-native-world-m-Y-up') => {
      const raw = nativeRaw(query());
      const rawRow = { kind: 'native-contact-comparison', name, clock, space, firstOwner: first === terrain ? terrainOwner.id : CART_ID, secondOwner: second === terrain ? terrainOwner.id : CART_ID,
        firstHandle: first.handle, secondHandle: second.handle, firstPose, secondPose, prediction: PREDICTION, raw };
      row(rawRow); // Preserve exact native current result BEFORE any validation/exception.
      if (!raw) { consistent.set(name, false); row({ kind: 'contact-analysis', name, clock, result: 'NULL_NOT_A_SUPPORT_OR_SEPARATION_CERTIFICATE' }); return raw; }
      assert.ok(Number.isFinite(raw.distance), 'nonfinite native distance');
      for (const [label, v] of Object.entries(raw)) if (label !== 'distance') finiteVector(v as V, label);
      const delta = minus(raw.point2, raw.point1), projected = dot(delta, raw.normal1);
      const vectorResidual = norm(minus(delta, scale(raw.normal1, raw.distance)));
      const normalResidual = norm(plus(raw.normal1, raw.normal2));
      const firstProjection = first.shape.projectPoint(firstPose.position, firstPose.rotation, raw.point1, false);
      const secondProjection = second.shape.projectPoint(secondPose.position, secondPose.rotation, raw.point2, false);
      row({ kind: 'native-projection-raw', name, clock, firstProjection, secondProjection });
      finiteVector(firstProjection.point, 'first native projection'); finiteVector(secondProjection.point, 'second native projection');
      const firstSurfaceResidual = norm(minus(firstProjection.point, raw.point1)), secondSurfaceResidual = norm(minus(secondProjection.point, raw.point2));
      const finiteUnitNormals = Math.abs(norm(raw.normal1) - 1) < NUMERIC_EPS && Math.abs(norm(raw.normal2) - 1) < NUMERIC_EPS;
      const selfConsistent = finiteUnitNormals && vectorResidual < NUMERIC_EPS && normalResidual < NUMERIC_EPS && firstSurfaceResidual < NUMERIC_EPS && secondSurfaceResidual < NUMERIC_EPS;
      consistent.set(name, selfConsistent);
      row({ kind: 'contact-analysis', name, clock, nativeReadbackSpacePreserved: true, projectedDistance: projected,
        signedDistanceResidual: Math.abs(projected - raw.distance), pointNormalVectorResidual: vectorResidual,
        oppositeNormalResidual: normalResidual, firstSurfaceResidual, secondSurfaceResidual, finiteUnitNormals,
        declaredWorldSelfConsistent: selfConsistent, usableAsDeclaredWorldContact: selfConsistent,
        inconsistencyIsDiagnosticFindingNotCandidateFailure: true });
      return raw;
    };
    const canonical = evaluate('terrain.contactCollider(cart)', terrain, cart, terrainPose, cartPose, () => terrain.contactCollider(cart, PREDICTION));
    assert.ok(canonical, 'exact original contact no longer reproduced');
    const expected = prior.penetrations[0];
    row({ kind: 'original-failure-reproduction', clock, original: expected, current: canonical });
    assert.ok(Math.abs(canonical.distance - expected.distance) < NUMERIC_EPS && norm(minus(canonical.point1, expected.point1)) < NUMERIC_EPS &&
      norm(minus(canonical.point2, expected.point2)) < NUMERIC_EPS && norm(minus(canonical.normal1, expected.normal1)) < NUMERIC_EPS, 'exact failed native contact not reproduced');
    const colliderReverse = evaluate('cart.contactCollider(terrain)', cart, terrain, cartPose, terrainPose, () => cart.contactCollider(terrain, PREDICTION));
    const colliderShapeForward = evaluate('terrain.contactShape(cart.shape,currentPose)', terrain, cart, terrainPose, cartPose, () => terrain.contactShape(cart.shape, cartPose.position, cartPose.rotation, PREDICTION));
    const colliderShapeReverse = evaluate('cart.contactShape(terrain.shape,currentPose)', cart, terrain, cartPose, terrainPose, () => cart.contactShape(terrain.shape, terrainPose.position, terrainPose.rotation, PREDICTION));
    const explicitForward = evaluate('terrain.shape.contactShape(actualPoses)', terrain, cart, terrainPose, cartPose,
      () => terrain.shape.contactShape(terrainPose.position, terrainPose.rotation, cart.shape, cartPose.position, cartPose.rotation, PREDICTION));
    const explicitReverse = evaluate('cart.shape.contactShape(actualPoses)', cart, terrain, cartPose, terrainPose,
      () => cart.shape.contactShape(cartPose.position, cartPose.rotation, terrain.shape, terrainPose.position, terrainPose.rotation, PREDICTION));
    // One fixed common translation control, QUERY POSES ONLY. Actual colliders never move.
    const offset = { x: -cartPose.position.x, y: 0, z: -cartPose.position.z };
    const shiftedTerrain = { position: plus(terrainPose.position, offset), rotation: terrainPose.rotation }, shiftedCart = { position: plus(cartPose.position, offset), rotation: cartPose.rotation };
    const shiftedForward = evaluate('common-translation-control:terrain.shape→cart.shape', terrain, cart, shiftedTerrain, shiftedCart,
      () => terrain.shape.contactShape(shiftedTerrain.position, shiftedTerrain.rotation, cart.shape, shiftedCart.position, shiftedCart.rotation, PREDICTION), 'diagnostic-common-translation-world-m-Y-up');
    const shiftedReverse = evaluate('common-translation-control:cart.shape→terrain.shape', cart, terrain, shiftedCart, shiftedTerrain,
      () => cart.shape.contactShape(shiftedCart.position, shiftedCart.rotation, terrain.shape, shiftedTerrain.position, shiftedTerrain.rotation, PREDICTION), 'diagnostic-common-translation-world-m-Y-up');
    const translationPass: boolean[] = [];
    for (const [name, baseline, shifted] of [['forward', explicitForward, shiftedForward], ['reverse', explicitReverse, shiftedReverse]] as const) {
      translationPass.push(!!baseline && !!shifted && Math.abs(baseline.distance - shifted.distance) < NUMERIC_EPS &&
        norm(minus(minus(shifted.point1, offset), baseline.point1)) < NUMERIC_EPS && norm(minus(minus(shifted.point2, offset), baseline.point2)) < NUMERIC_EPS && norm(minus(shifted.normal1, baseline.normal1)) < NUMERIC_EPS);
      row({ kind: 'translation-equivariance-analysis', name, clock, offset, actualWorldModified: false,
        distanceResidual: baseline && shifted ? Math.abs(baseline.distance - shifted.distance) : null,
        point1ResidualAfterExplicitUndo: baseline && shifted ? norm(minus(minus(shifted.point1, offset), baseline.point1)) : null,
        point2ResidualAfterExplicitUndo: baseline && shifted ? norm(minus(minus(shifted.point2, offset), baseline.point2)) : null,
        normal1Residual: baseline && shifted ? norm(minus(shifted.normal1, baseline.normal1)) : null });
    }
    const symmetry = (forward: RawContact | null, reverse: RawContact | null) => forward && reverse ? {
      distanceResidual: Math.abs(forward.distance - reverse.distance), point1ToReverse2Residual: norm(minus(forward.point1, reverse.point2)),
      point2ToReverse1Residual: norm(minus(forward.point2, reverse.point1)), normal1ToReverse2Residual: norm(minus(forward.normal1, reverse.normal2)) } : null;
    const explicitSymmetry = symmetry(explicitForward, explicitReverse);
    row({ kind: 'order-symmetry-analysis', clock, contactCollider: symmetry(canonical, colliderReverse), contactShape: symmetry(colliderShapeForward, colliderShapeReverse), explicitShape: explicitSymmetry,
      note: 'Different valid face witness choices can break point symmetry; fail closed, do not relabel coordinates.' });

    const worldVertices: V[] = [];
    for (let i = 0; i < cartData.vertices.length; i += 3) worldVertices.push(plus(cartPose.position, rotate({ x: cartData.vertices[i], y: cartData.vertices[i + 1], z: cartData.vertices[i + 2] }, cartPose.rotation)));
    const minY = Math.min(...worldVertices.map(v => v.y)), lowest = worldVertices.filter(v => Math.abs(v.y - minY) < NUMERIC_EPS).slice(0, 3);
    row({ kind: 'actual-native-cart-lowest-vertices', clock, minY, selected: lowest, fullHullSupportClaim: false });
    for (const point of [cartPose.position, ...lowest]) {
      const origin = { x: point.x, y: cartPose.position.y + 2, z: point.z }, down = { x: 0, y: -1, z: 0 };
      const hit = terrain.castRayAndGetNormal(new RAPIER.Ray(origin, down), 4, true), projection = terrain.projectPoint(point, false);
      row({ kind: 'native-finite-ray-projection', clock, terrainOwner: terrainOwner.id, input: point, origin, direction: down, maxDistance: 4,
        ray: hit ? { timeOfImpact: hit.timeOfImpact, normal: copy(hit.normal), featureType: hit.featureType, featureId: hit.featureId,
          worldPoint: plus(origin, scale(down, hit.timeOfImpact)) } : null, projection });
      if (hit) { assert.ok(Number.isFinite(hit.timeOfImpact) && hit.timeOfImpact >= 0 && hit.timeOfImpact <= 4); finiteVector(hit.normal, 'ray normal'); }
      if (projection) finiteVector(projection.point, 'collider projection');
    }
    // Default fixed-fixed collision flags may produce no solver manifold. No force inference follows.
    const manifolds: { flipped: boolean; normal: V; localNormal1: V; localNormal2: V; subshape1: number; subshape2: number;
      contactCount: number; contacts: { localPoint1: V | null; localPoint2: V | null; distance: number; normalImpulse: number }[]; solverContactCount: number }[] = [];
    world.contactPair(terrain, cart, (m: RAPIER.TempContactManifold, flipped: boolean) => {
      const contactCount = m.numContacts();
      // Capture callback scalars and every available point immediately; validate only after the native borrow ends.
      // A malformed count is preserved without using it as an allocation size.
      const contacts = Number.isSafeInteger(contactCount) && contactCount >= 0 && contactCount <= 10000
        ? Array.from({ length: contactCount }, (_, i) => ({ localPoint1: m.localContactPoint1(i), localPoint2: m.localContactPoint2(i), distance: m.contactDist(i), normalImpulse: m.contactImpulse(i) })) : [];
      manifolds.push({ flipped, normal: m.normal(), localNormal1: m.localNormal1(), localNormal2: m.localNormal2(), subshape1: m.subshape1(), subshape2: m.subshape2(), contactCount, contacts, solverContactCount: m.numSolverContacts() });
    });
    row({ kind: 'fixed-fixed-native-manifold-observation', clock, manifolds, forceBearingClaim: false, absenceDoesNotProveSeparation: true });
    for (const manifold of manifolds) {
      assert.ok(Number.isSafeInteger(manifold.contactCount) && manifold.contactCount >= 0 && manifold.contactCount <= 10000, 'invalid native manifold contact count');
      assert.ok(Number.isSafeInteger(manifold.solverContactCount) && manifold.solverContactCount >= 0 && manifold.solverContactCount <= 10000, 'invalid native solver contact count');
      assert.ok(Number.isSafeInteger(manifold.subshape1) && Number.isSafeInteger(manifold.subshape2), 'invalid native manifold subshape metadata');
      finiteVector(manifold.normal, 'manifold normal'); finiteVector(manifold.localNormal1, 'manifold local normal1'); finiteVector(manifold.localNormal2, 'manifold local normal2');
      for (const contact of manifold.contacts) {
        assert.ok(contact.localPoint1 && contact.localPoint2, 'counted native manifold contact lacks a local point; unavailable witness STOP');
        finiteVector(contact.localPoint1, 'manifold local point1'); finiteVector(contact.localPoint2, 'manifold local point2');
      }
    }
    assert.equal(world.getCollider(cart.handle), cart); assert.equal(world.getCollider(terrain.handle), terrain);
    assert.deepEqual(currentPose(cart), cartPose); assert.deepEqual(currentPose(terrain), terrainPose);
    row({ kind: 'final-owner-pose-preservation', clock, actualWorldSteps: 1, dynamicTrajectory: 'NONE', canonicalPlacementUnchanged: true, shapes: { cart: cartData.verticesBytesSHA256, terrain: terrainData.verticesBytesSHA256 },
      currentShapes: { cart: arrayHash(cart.vertices()), terrain: arrayHash(terrain.vertices()) } });
    assert.equal(arrayHash(cart.vertices()), cartData.verticesBytesSHA256); assert.equal(arrayHash(terrain.vertices()), terrainData.verticesBytesSHA256);
    const explicitEligible = consistent.get('terrain.shape.contactShape(actualPoses)') === true && consistent.get('cart.shape.contactShape(actualPoses)') === true &&
      consistent.get('common-translation-control:terrain.shape→cart.shape') === true && consistent.get('common-translation-control:cart.shape→terrain.shape') === true &&
      translationPass.every(Boolean) && !!explicitSymmetry && Object.values(explicitSymmetry).every(v => v < NUMERIC_EPS);
    row({ kind: 'pair-specific-query-contract', clock, contactColliderDeclaredWorldUsable: consistent.get('terrain.contactCollider(cart)') === true,
      explicitShapeQuery: explicitEligible ? 'ELIGIBLE_FOR_THIS_FROZEN_PAIR_WITH_ALL_RECORDED_CONSISTENCY_GUARDS' : 'NO_EXPLICIT_SHAPE_QUERY_QUALIFIED',
      mandatoryGuards: ['actual current owner/pose/shape identity', 'finite unit normals and signed-distance/point agreement', 'both points project to their declared current surfaces', 'order and common-translation controls'],
      physicalSupport: 'UNKNOWN_FIXED_FIXED_NO_LOAD_TEST', productionAPIRepair: 'NONE', nativeStreetAdmission: 'DENIED', generalShapeClassApproval: false });
    row({ kind: 'frozen-input-verification-after-comparisons', clock, files: verifyInputs() });
    receipt.status = 'DIAGNOSTIC_COMPARISONS_RECORDED_NOT_ADMISSION';
  } catch (error) {
    originalFailure = error; receipt.status = 'FIRST_GENUINE_FAILURE_STOP_NO_RETRY'; receipt.failure = error instanceof Error ? error.stack : String(error); save();
  } finally {
    const disposed: string[] = [], cleanupErrors: { owner: string; error: string }[] = [];
    if (sim) try { sim.dispose(); disposed.push('Simulation'); } catch (error) { cleanupErrors.push({ owner: 'Simulation', error: error instanceof Error ? error.stack ?? error.message : String(error) }); }
    let freedWorlds = 0;
    for (const [index, world] of worlds.entries()) {
      try { world.free(); freedWorlds++; disposed.push(`World:${index}`); }
      catch (error) { cleanupErrors.push({ owner: `World:${index}`, error: error instanceof Error ? error.stack ?? error.message : String(error) }); }
    }
    receipt.disposal = { disposed, allocatedWorlds: worlds.length, freedWorlds, remainingOrUnknownWorlds: worlds.length - freedWorlds, cleanupErrors };
    if (cleanupErrors.length) {
      receipt.status = 'CLEANUP_FAILURE_STOP_NO_RETRY';
      // Preserve first original failure; cleanup failure is separate and never rewrites its raw witness.
      if (!originalFailure) originalFailure = Error(`native cleanup failed: ${JSON.stringify(cleanupErrors)}`);
    }
    receipt.closed = new Date().toISOString(); save();
  }
  if (originalFailure) throw originalFailure;
}, 60000);
