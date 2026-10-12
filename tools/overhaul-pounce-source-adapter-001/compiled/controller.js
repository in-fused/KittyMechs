import { add, angleDifference, boundedVector, cross, finite, length, mul, nativePoint, sub, yawRotate } from './coordinates.js';
import { LIMBS } from './contract.js';
import { hipLocal, poseOf, toWorld } from './kinematics.js';
/** Frozen prototype limits, not measured actuators or global native chassis calibration. */
export const LIMITS = Object.freeze({
    maxDt: 1 / 60, carrierSpeed: 7.6, carrierAcceleration: 32, carrierYawRate: 2.5, carrierYawAcceleration: 10,
    pawSpeed: 22, pawAcceleration: 160, pawJerk: 2400, pawYawRate: 8, pawYawAcceleration: 60, pawYawJerk: 800,
    bodyRate: 3, bodyAcceleration: 18, bodyJerk: 220, transitionIntent: .7,
    plantRelativeSpeed: .25, plantPositionError: .002, plantYawError: .015,
    unloadLift: .06, loadedReachReserve: .16, swingLift: .272,
    quadLoadedSeconds: .1044, uprightLoadedSeconds: .1848, actuatorPowerWatts: 220_000,
});
const scalarBound = (v, max) => Math.max(-max, Math.min(max, v));
const sameClock = (a, f) => a.clock.tick === f.clock.tick && a.clock.time === f.clock.time;
const usable = (w, f, policy) => w.accepted && sameClock(w, f) && w.evidence === policy;
const unsupported = (frame, reason) => ({ clock: frame.clock, accepted: false, evidence: 'controlled-source', kind: 'MISSING_PROVIDER_RECEIPT', reason, receipt: null });
function call(frame, action, fallback) {
    try {
        return action();
    }
    catch (error) {
        return { ...fallback, ...unsupported(frame, String(error)) };
    }
}
function bodyStep(previous, frame, dt, foreReleased) {
    // Cancellation changes the target; position/rate/acceleration are never reset.
    const target = frame.command.cancel ? 0 : frame.command.stance;
    const changed = target !== previous.target;
    const desired = (target - previous.amount) * 64 - previous.rate * 16;
    const acceleration = previous.acceleration + scalarBound(scalarBound(desired, LIMITS.bodyAcceleration) - previous.acceleration, LIMITS.bodyJerk * dt);
    // Body rise starts only after actual fore release. Existing rate is preserved through cancellation.
    const gated = target === 1 && previous.amount === 0 && !foreReleased;
    const nextAcceleration = gated ? 0 : acceleration;
    const rate = previous.rate + nextAcceleration * dt;
    return { amount: previous.amount + previous.rate * dt + .5 * nextAcceleration * dt ** 2,
        rate, acceleration: nextAcceleration, target, requestedAt: changed ? frame.clock.time : previous.requestedAt };
}
export function advanceFreeLimb(previous, goal, goalVelocity, goalYaw, dt) {
    const desired = add(mul(sub(goal.value, previous.point.value), 400), mul(sub(goalVelocity, previous.velocity), 40));
    const acceleration = add(previous.acceleration, boundedVector(sub(boundedVector(desired, LIMITS.pawAcceleration), previous.acceleration), LIMITS.pawJerk * dt));
    const velocity = add(previous.velocity, mul(acceleration, dt));
    const point = nativePoint(add(previous.point.value, add(mul(previous.velocity, dt), mul(acceleration, .5 * dt ** 2))));
    const yawDesired = scalarBound(angleDifference(goalYaw, previous.yaw) * 100 - previous.yawRate * 20, LIMITS.pawYawAcceleration);
    const yawAcceleration = previous.yawAcceleration + scalarBound(yawDesired - previous.yawAcceleration, LIMITS.pawYawJerk * dt);
    return { ...previous, point, velocity, acceleration, yaw: previous.yaw + previous.yawRate * dt + .5 * yawAcceleration * dt ** 2,
        yawRate: previous.yawRate + yawAcceleration * dt, yawAcceleration };
}
/** Pure causal owner. No authority mutation, global clock, future trajectory or private physics world. */
export function step(bind, previous, frame, provider) {
    const dt = frame.clock.time - previous.clock.time, failures = [];
    const receipts = [];
    const accept = (w) => usable(w, frame, previous.executionEvidence);
    if (!(dt > 0 && dt <= LIMITS.maxDt + 1e-12) || frame.clock.tick <= previous.clock.tick)
        failures.push('INVALID_COMMITTED_CLOCK');
    if (bind.geometryFingerprint !== '302781eb955fbb21614f637bf510e4242c55672bb08cde5e903f927d47f94220' || bind.rootBone !== 'identity' || bind.basis !== 'native-m-y-up')
        failures.push('IMMUTABLE_BIND_IDENTITY_MISMATCH');
    if (!finite(frame.carrier.position.value) || !finite(frame.carrier.velocity) || !finite(frame.carrier.acceleration)
        || ![frame.carrier.yaw, frame.carrier.yawRate, frame.carrier.yawAcceleration].every(Number.isFinite))
        failures.push('NONFINITE_CARRIER');
    if (length(frame.carrier.velocity) > LIMITS.carrierSpeed + 1e-9 || length(frame.carrier.acceleration) > LIMITS.carrierAcceleration
        || Math.abs(frame.carrier.yawRate) > LIMITS.carrierYawRate || Math.abs(frame.carrier.yawAcceleration) > LIMITS.carrierYawAcceleration)
        failures.push('COMMITTED_MOTION_OUTSIDE_DECLARED_SCOPE');
    const safeDt = dt > 0 && dt <= LIMITS.maxDt + 1e-12 ? dt : 0;
    const previousPose = poseOf(bind, previous.carrier, previous.body.amount, previous.limbs);
    const expectedCurrentPose = poseOf(bind, frame.carrier, previous.body.amount, previous.limbs);
    const committed = call(frame, () => provider.committedPose(frame, expectedCurrentPose), unsupported(frame, 'actual current pose absent'));
    receipts.push(committed);
    if (!accept(committed))
        failures.push('ACTUAL_CURRENT_POSE_UNSUPPORTED_OR_MISMATCH');
    const foreReleased = ['FL', 'FR'].every(k => previous.limbs[k].lease === null && previous.limbs[k].departingLease === null);
    const body = bodyStep(previous.body, frame, safeDt, foreReleased);
    if (body.amount < 0 || body.amount > 1 || Math.abs(body.rate) > LIMITS.bodyRate)
        failures.push('BODY_REQUEST_OUTSIDE_FINITE_POSE_DOMAIN');
    if (frame.clock.time - body.requestedAt > LIMITS.transitionIntent && Math.abs(body.target - body.amount) > .01)
        failures.push('RESPONSIVE_TRANSITION_INTENT_UNSUPPORTED');
    const next = { FL: previous.limbs.FL, FR: previous.limbs.FR, HL: previous.limbs.HL, HR: previous.limbs.HR };
    const emptyTrace = (limb) => ({ limb, before: previous.limbs[limb], proposed: previous.limbs[limb], goal: null, pose: expectedCurrentPose.chains[limb], receipts: [], failures: [] });
    const traces = { FL: emptyTrace("FL"), FR: emptyTrace("FR"), HL: emptyTrace("HL"), HR: emptyTrace("HR") };
    const period = body.amount > .95 ? .28 : .18;
    const parity = Math.floor(frame.clock.time / (period * .5)) % 2;
    const releaseBatch = body.target === 1 && body.amount < .95 ? ['FL', 'FR']
        : body.amount > .95 ? (parity ? ['HL'] : ['HR']) : (parity ? ['FR', 'HL'] : ['FL', 'HR']);
    for (const limb of LIMBS) {
        const before = previous.limbs[limb], chain = bind.chains[limb], limbFailures = [], rw = [];
        let proposed = { ...before }, goal = null;
        const hip = nativePoint(toWorld(hipLocal(bind, limb, body.amount), frame.carrier));
        const wantsGuard = limb[0] === 'F' && body.target === 1;
        if (before.lease) {
            const fallback = { ...unsupported(frame, 'transport absent'), lease: before.lease, point: before.point,
                velocity: before.velocity, acceleration: before.acceleration, yaw: before.yaw, yawRate: before.yawRate, yawAcceleration: before.yawAcceleration };
            const transport = call(frame, () => provider.transport(frame, limb, before.lease), fallback);
            rw.push(transport);
            const currentLease = transport.lease.owner === before.lease.owner && transport.lease.revision === before.lease.revision && transport.lease.generation === before.lease.generation;
            if (!accept(transport) || !currentLease) {
                if (!accept(transport))
                    limbFailures.push('SUPPORT_TRANSPORT_UNSUPPORTED');
                // Loss retires the lease immediately. The current physical point/velocity is retained, never transported by a stale owner.
                proposed = { ...before, mode: 'recovery', lease: null, departingLease: null, plantGoal: null };
            }
            else {
                const soleToPaw = yawRotate(chain.restSoleFromPaw, transport.yaw);
                const omega = [0, transport.yawRate, 0], alpha = [0, transport.yawAcceleration, 0];
                const rotationalVelocity = cross(omega, soleToPaw);
                const rotationalAcceleration = add(cross(alpha, soleToPaw), cross(omega, cross(omega, soleToPaw)));
                proposed = { ...before, point: nativePoint(sub(transport.point.value, soleToPaw)), velocity: sub(transport.velocity, rotationalVelocity), acceleration: sub(transport.acceleration, rotationalAcceleration),
                    yaw: transport.yaw, yawRate: transport.yawRate, yawAcceleration: transport.yawAcceleration, elapsedLoaded: before.elapsedLoaded + safeDt };
                const planted = call(frame, () => provider.pad(frame, limb, transport.point, transport.yaw, chain.footHalfExtents), {
                    ...unsupported(frame, 'current planted full-foot support absent'), lease: before.lease, point: transport.point, yaw: transport.yaw, normal: [0, 1, 0], velocity: transport.velocity,
                });
                rw.push(planted);
                if (!accept(planted) || planted.lease.owner !== before.lease.owner || planted.lease.generation !== before.lease.generation || planted.lease.revision !== before.lease.revision)
                    limbFailures.push('CURRENT_LOADED_FOOTPRINT_UNSUPPORTED');
                const distance = length(sub(proposed.point.value, hip.value));
                // Current committed speed and finite acceleration bound establish a conservative next-step unloading reserve, no future oracle.
                const reserve = LIMITS.loadedReachReserve + length(frame.carrier.velocity) * safeDt + .5 * LIMITS.carrierAcceleration * safeDt ** 2;
                const duty = body.amount > .95 ? LIMITS.uprightLoadedSeconds : LIMITS.quadLoadedSeconds;
                const needUnload = wantsGuard || distance > chain.upperLength + chain.lowerLength - reserve
                    || ((frame.command.move || frame.command.turn) && proposed.elapsedLoaded >= duty);
                if (needUnload && releaseBatch.includes(limb)) {
                    proposed = { ...proposed, mode: 'unload-requested' };
                    const authorize = call(frame, () => provider.authorizeUnload(frame, limb, before.lease, expectedCurrentPose, releaseBatch), unsupported(frame, 'current load-transfer authorization absent'));
                    rw.push(authorize);
                    if (accept(authorize))
                        proposed = { ...proposed, mode: 'unloading', lease: null, departingLease: before.lease, plantGoal: null, elapsedLoaded: 0 };
                }
            }
        }
        if (!proposed.lease) {
            if (proposed.departingLease) {
                const release = call(frame, () => provider.release(frame, limb, proposed.departingLease, expectedCurrentPose), unsupported(frame, 'actual committed separation absent'));
                rw.push(release);
                if (accept(release))
                    proposed = { ...proposed, departingLease: null, mode: wantsGuard ? 'to-guard' : 'to-plant' };
                else {
                    // First lift is commanded only after load authorization. Actual separation is verified at the next committed pose.
                    goal = nativePoint(add(before.point.value, [0, LIMITS.unloadLift, 0]));
                    proposed = { ...advanceFreeLimb(proposed, goal, frame.carrier.velocity, frame.carrier.yaw, safeDt), mode: 'unloading' };
                }
            }
            if (!proposed.departingLease && wantsGuard) {
                const offset = [limb[1] === 'L' ? -.176 : .176, -.4, .272];
                goal = nativePoint(add(hip.value, yawRotate(offset, frame.carrier.yaw)));
                const previousHip = toWorld(hipLocal(bind, limb, previous.body.amount), previous.carrier);
                const goalVelocity = safeDt ? mul(sub(hip.value, previousHip), 1 / safeDt) : frame.carrier.velocity;
                proposed = advanceFreeLimb(proposed, goal, goalVelocity, frame.carrier.yaw, safeDt);
                proposed = { ...proposed, mode: length(sub(proposed.point.value, goal.value)) < .03 ? 'guard' : 'to-guard', plantGoal: null };
            }
            else if (!proposed.departingLease) {
                // The preference uses only committed velocity and the current body. The provider returns a currently real reachable patch.
                const preference = nativePoint(add(toWorld(chain.restPlant, frame.carrier), mul(frame.carrier.velocity, .04)));
                let pad = proposed.plantGoal;
                if (pad) {
                    const refreshed = call(frame, () => provider.pad(frame, limb, pad.point, pad.yaw, chain.footHalfExtents), { ...pad, ...unsupported(frame, 'stale plant goal') });
                    rw.push(refreshed);
                    if (!accept(refreshed) || refreshed.lease.owner !== pad.lease.owner || refreshed.lease.generation !== pad.lease.generation || refreshed.lease.revision !== pad.lease.revision)
                        pad = null;
                    else
                        pad = refreshed;
                }
                if (!pad) {
                    try {
                        pad = provider.findPlant(frame, limb, hip, preference, chain.upperLength + chain.lowerLength, chain.footHalfExtents);
                    }
                    catch {
                        pad = null;
                    }
                }
                if (!pad || !accept(pad))
                    limbFailures.push('NO_CURRENT_REACHABLE_PLANT_PATCH');
                else {
                    rw.push(pad);
                    const soleOffset = yawRotate(chain.restSoleFromPaw, pad.yaw);
                    const pawGoal = nativePoint(sub(pad.point.value, soleOffset));
                    const toGoal = sub(pawGoal.value, proposed.point.value);
                    // Lift occurs on the finite current route, not an endpoint pop or imposed global-R interpolation.
                    const lift = Math.min(LIMITS.swingLift, Math.hypot(toGoal[0], toGoal[2]) * .4);
                    goal = nativePoint(add(pawGoal.value, [0, lift, 0]));
                    proposed = { ...advanceFreeLimb(proposed, goal, pad.velocity, pad.yaw, safeDt), mode: before.mode === 'recovery' ? 'recovery' : 'to-plant', plantGoal: pad };
                    const sole = nativePoint(add(proposed.point.value, yawRotate(chain.restSoleFromPaw, proposed.yaw)));
                    const actual = call(frame, () => provider.pad(frame, limb, sole, proposed.yaw, chain.footHalfExtents), { ...pad, ...unsupported(frame, 'no actual sole contact') });
                    rw.push(actual);
                    if (accept(actual) && length(sub(sole.value, actual.point.value)) <= LIMITS.plantPositionError
                        && length(sub(proposed.velocity, actual.velocity)) <= LIMITS.plantRelativeSpeed && Math.abs(angleDifference(proposed.yaw, actual.yaw)) <= LIMITS.plantYawError) {
                        proposed = { ...proposed, mode: 'loaded', lease: actual.lease, departingLease: null, plantGoal: null, elapsedLoaded: 0 };
                    }
                }
            }
        }
        if (!finite(proposed.point.value) || !finite(proposed.velocity) || !finite(proposed.acceleration))
            limbFailures.push('NONFINITE_LIMB');
        if (length(proposed.velocity) > LIMITS.pawSpeed || length(proposed.acceleration) > LIMITS.pawAcceleration + 1e-9
            || Math.abs(proposed.yawRate) > LIMITS.pawYawRate)
            limbFailures.push('FINITE_ACTUATOR_LIMIT_EXCEEDED');
        const workRate = Math.abs(chain.movingMassKg * (proposed.acceleration[0] * proposed.velocity[0] + proposed.acceleration[1] * proposed.velocity[1] + proposed.acceleration[2] * proposed.velocity[2]));
        if (workRate > LIMITS.actuatorPowerWatts)
            limbFailures.push('PROTOTYPE_ACTUATOR_POWER_EXCEEDED');
        const sweep = call(frame, () => provider.footSweep(frame, limb, before, proposed, chain.footHalfExtents), unsupported(frame, 'foot swept volume absent'));
        rw.push(sweep);
        if (!accept(sweep))
            limbFailures.push('FOOT_SWEEP_UNSUPPORTED_OR_BLOCKED');
        next[limb] = proposed;
        // A complete trace is formed for every chain even if an earlier chain is already rejected.
        traces[limb] = { limb, before, proposed, goal, pose: poseOf(bind, frame.carrier, body.amount, { ...previous.limbs, [limb]: proposed }).chains[limb], receipts: rw, failures: limbFailures };
        if (!traces[limb].pose.valid)
            limbFailures.push('FIXED_CHAIN_REACH_REJECTED_NO_CLAMP');
        failures.push(...limbFailures.map(reason => `${limb}:${reason}`));
    }
    const pose = poseOf(bind, frame.carrier, body.amount, next);
    const bodySweep = call(frame, () => provider.bodySweep(frame, previousPose, pose), unsupported(frame, 'whole-body sweep absent'));
    const load = call(frame, () => provider.loadSupport(frame, pose, next), unsupported(frame, 'load/COM support absent'));
    receipts.push(bodySweep, load);
    if (!accept(bodySweep))
        failures.push('WHOLE_BODY_CLEARANCE_UNSUPPORTED_OR_BLOCKED');
    if (!accept(load))
        failures.push('SUPPORTED_WEIGHT_TRANSFER_UNSUPPORTED');
    const proposed = { executionEvidence: previous.executionEvidence, clock: frame.clock, carrier: frame.carrier, body, limbs: next };
    const trace = { clock: frame.clock, previousClock: previous.clock, dt, carrier: frame.carrier, previousCarrier: previous.carrier,
        command: frame.command, geometryFingerprint: bind.geometryFingerprint, bodyBefore: previous.body, bodyProposed: body,
        limbs: traces, bodyReceipts: receipts, failures, continuousClearance: 'UNKNOWN' };
    return failures.length ? { ok: false, retained: previous, proposed, pose, trace } : { ok: true, state: proposed, pose, trace };
}
