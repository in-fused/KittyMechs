import type RAPIER from '@dimforge/rapier3d-compat';
export interface OwnedCharacter {
    id: string;
    life?: number;
    body: RAPIER.RigidBody;
    collider: RAPIER.Collider;
}
interface Saved extends OwnedCharacter {
    bodyHandle: number;
    colliderHandle: number;
    velocity: {
        x: number;
        y: number;
        z: number;
    };
}
/** One synchronous physics-step lease for Simulation-owned character bodies.
 * Call beginStep before actor movement and endStep before the native world step.
 * A failed lease must abort physics and publication; this class provides no rollback.
 * The provider must be exactly Simulation.physics ownership, not all world bodies.
 * Physical id/body/collider ownership may not change inside a supported lease. Life
 * is observed metadata only. Actual supported hull
 * dimensions/offsets may change: query selection reads current native geometry.
 * A late unsupported mutation is failed physics, not a fictitious baseline fallback.
 */
export class OwnedCharacterMotion {
    private phase: 'idle' | 'baseline' | 'supported' | 'failed' = 'idle';
    private active = false;
    private saved: Saved[] = [];
    constructor(private readonly rapier: typeof RAPIER, private readonly owned: () => readonly OwnedCharacter[]) { }
    private entry() { if (this.active)
        throw Error('Reentrant owned character motion'); if (this.phase === 'failed')
        throw Error('Owned character physics lease failed'); }
    private caps(e: OwnedCharacter): {
        bottom: number;
        top: number;
    } | null {
        const c = e.collider;
        if (c.shapeType() !== this.rapier.ShapeType.RoundCylinder)
            return null;
        // WASM getters are decisive; c.shape may be a cached JS source descriptor.
        const half = c.halfHeight(), round = c.roundRadius(), radius = c.radius(), center = c.translation(), extent = half + round, bottom = center.y - extent, top = center.y + extent;
        return [half, round, radius, ...Object.values(center), extent, bottom, top].every(Number.isFinite) && half > 0 && round >= 0 && radius > 0 && extent > 0 ? { bottom, top } : null;
    }
    private unique(entries: readonly OwnedCharacter[]): boolean {
        const columns = [entries.map(e => e.id), entries.map(e => e.body), entries.map(e => e.collider), entries.map(e => e.body.handle), entries.map(e => e.collider.handle)];
        return entries.every(e => typeof e.id === 'string' && e.id.length > 0) && columns.every(values => new Set<unknown>(values).size === entries.length);
    }
    private valid(e: OwnedCharacter, full: boolean): boolean {
        const b = e.body, c = e.collider, r = c.rotation(), br = b.rotation();
        if (b.bodyType() !== this.rapier.RigidBodyType.KinematicPositionBased || Object.values(b.angvel()).some(v => v !== 0) || b.numColliders() !== 1 || b.collider(0).handle !== c.handle || c.parent()?.handle !== b.handle || !this.caps(e))
            return false;
        if ([r, br].some(q => q.x !== 0 || q.y !== 0 || q.z !== 0 || q.w !== 1))
            return false;
        if (![b.translation(), b.nextTranslation(), b.nextRotation(), c.translationWrtParent()].every(v => v !== null && Object.values(v).every(Number.isFinite)))
            return false;
        return !full || Object.values(b.linvel()).every(Number.isFinite);
    }
    private sameSupportedSet(current: readonly OwnedCharacter[]): boolean {
        return this.unique(current) && current.length === this.saved.length && current.every(e => {
            const prior = this.saved.find(s => s.id === e.id);
            return prior !== undefined && prior.body === e.body && prior.collider === e.collider && prior.bodyHandle === e.body.handle && prior.colliderHandle === e.collider.handle && this.valid(e, true) && Object.values(e.body.linvel()).every(v => v === 0);
        });
    }
    private restore(entries: Saved[], errors: unknown[]) {
        for (const e of entries) {
            try {
                e.body.setBodyType(this.rapier.RigidBodyType.KinematicVelocityBased, false);
                e.body.setLinvel(e.velocity, false);
            }
            catch (error) {
                errors.push(error);
            }
            finally {
                try {
                    e.body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, false);
                }
                catch (error) {
                    errors.push(error);
                }
            }
        }
    }
    private fail(errors: unknown[]): never { this.phase = 'failed'; if (errors.length === 1)
        throw errors[0]; throw new AggregateError(errors, 'Owned character physics/cleanup failure'); }
    beginStep(): boolean {
        this.entry();
        if (this.phase !== 'idle')
            throw Error('Previous physics-step lease still open');
        this.active = true;
        try {
            const entries = [...this.owned()];
            if (!this.unique(entries) || !entries.every(e => this.valid(e, true))) {
                this.phase = 'baseline';
                return false;
            }
            this.saved = entries.map(e => ({ ...e, bodyHandle: e.body.handle, colliderHandle: e.collider.handle, velocity: { ...e.body.linvel() } }));
            const errors: unknown[] = [];
            try {
                for (const e of this.saved) {
                    try {
                        e.body.setBodyType(this.rapier.RigidBodyType.KinematicVelocityBased, false);
                        e.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
                    }
                    finally {
                        e.body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, false);
                    }
                }
            }
            catch (error) {
                errors.push(error);
                this.restore(this.saved, errors);
                this.fail(errors);
            }
            this.phase = 'supported';
            return true;
        }
        catch (error) {
            this.phase = 'failed';
            throw error;
        }
        finally {
            this.active = false;
        }
    }
    computeColliderMovement(controller: RAPIER.KinematicCharacterController, ...args: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>): void {
        this.computeColliderMovementCore(controller, args);
    }
    /** Opt-in dynamic collision for owned rubble only. The caller snapshots
     * foreign dynamic/disabled collider handles before any native query; both
     * this predicate and the supplied predicate must use JS-only data. The set
     * must remain immutable for this synchronous call. Original flags still
     * decide owned-character classification, including combined-flag bypass. */
    computeColliderMovementWithDynamics(
        controller: RAPIER.KinematicCharacterController,
        collider: RAPIER.Collider,
        desired: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>[1],
        originalFlags: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>[2],
        groups: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>[3],
        predicate: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>[4],
        excludedDynamicColliderHandles: ReadonlySet<number>,
    ): void {
        const args: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']> = [collider, desired, originalFlags, groups, predicate];
        const nativeFlags = (originalFlags ?? 0) & ~this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;
        // Rapier catches predicate exceptions at its JS/WASM callback boundary.
        // Retain the actual fault and surface it after native borrow ends, inside
        // the same restoration/failure scope as the native query itself.
        const filterErrors: unknown[] = [];
        const nativePredicate = (candidate: RAPIER.Collider) => {
            if (filterErrors.length) return false;
            try { return !excludedDynamicColliderHandles.has(candidate.handle) && (!predicate || predicate(candidate)); }
            catch (error) { filterErrors.push(error); return false; }
        };
        this.computeColliderMovementCore(controller, args, [collider, desired, nativeFlags, groups, nativePredicate], filterErrors);
    }
    private computeColliderMovementCore(
        controller: RAPIER.KinematicCharacterController,
        args: Parameters<RAPIER.KinematicCharacterController['computeColliderMovement']>,
        nativeArgs = args,
        filterErrors?: unknown[],
    ): void {
        this.entry();
        if (this.phase === 'idle')
            throw Error('beginStep required');
        this.active = true;
        try {
            const compute = () => {
                controller.computeColliderMovement(...nativeArgs);
                if (filterErrors?.length) {
                    if (filterErrors.length === 1) throw filterErrors[0];
                    throw new AggregateError(filterErrors, 'Owned character dynamic filter failure');
                }
            };
            if (this.phase === 'baseline') {
                compute();
                return;
            }
            const current = [...this.owned()];
            if (!this.sameSupportedSet(current))
                this.fail([Error('Late unsupported ownership/geometry/velocity mutation')]);
            const caster = current.find(e => e.collider === args[0] && e.collider.handle === args[0].handle && e.body.handle === args[0].parent()?.handle);
            if (!caster)
                this.fail([Error('Caster missing from owned physics')]);
            if (args[2] !== this.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC || !caster.body.isEnabled() || !caster.collider.isEnabled()) {
                compute();
                return;
            }
            const from = this.caps(caster)!, selected = current.filter(e => e.body.isEnabled() && e.collider.isEnabled() && e.body.handle !== caster.body.handle && e.collider.handle !== caster.collider.handle).filter(e => { const c = this.caps(e)!; return c.bottom >= from.top || c.top <= from.bottom; }).map(e => ({ ...e, bodyHandle: e.body.handle, colliderHandle: e.collider.handle, velocity: { ...e.body.linvel() } }));
            const errors: unknown[] = [];
            try {
                for (const e of selected)
                    e.body.setBodyType(this.rapier.RigidBodyType.Fixed, false);
                compute();
            }
            catch (error) {
                errors.push(error);
            }
            finally {
                this.restore(selected, errors);
            }
            if (errors.length)
                this.fail(errors);
        }
        catch (error) {
            this.phase = 'failed';
            throw error;
        }
        finally {
            this.active = false;
        }
    }
    endStep(): void { this.entry(); if (this.phase === 'idle')
        throw Error('No physics-step lease'); this.active = true; try {
        if (this.phase === 'supported' && !this.sameSupportedSet([...this.owned()]))
            this.fail([Error('Unsupported final physical owner state before world step')]);
        this.saved = [];
        this.phase = 'idle';
    }
    catch (error) {
        this.phase = 'failed';
        throw error;
    }
    finally {
        this.active = false;
    } }
}
