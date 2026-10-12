# Persistent structural ruins: native ownership contract

`shared/overhaulRuins.ts` owns authoritative persistent exact component cuboids. `src/game/world/overhaulRuinCollision.tsx` mirrors the selected guest presentation snapshot with native kinematic/fixed collision. Neither owner steps Rapier, edits authority actor poses, installs hidden carrier colliders or removes a ruin based on age.

## Authority transaction and identity

Resolve and commit structural support closure, collect all detached source components, retire **all** their original static collision/damage/roof/grip/navigation handles and invalidate accepted actor contacts, then call `ruinsOwner.detach` for the collected components. Capacity sweeps must not hit source colliders that are about to disappear. Keep the stable district revision and block-array ordering for the entire match; `state.block` is the compiled source component index. Every native ruin has exactly the source's `halfExtents`; `state.position` is its world center and `state.rotation` is the full world quaternion, already including initial block yaw.

```ts
const owner = new OverhaulRuinsOwner(world, district, terrainHeightAt, {
  canSupport: collider => /* optional native fixed-support admission filter */ true,
});
owner.detach(sourceBlock, authorityTime, incoming);
// Only the existing fixed physics owner calls world.step().
owner.advance(authorityTime);
owner.snapshot();                 // stable block-sorted deep pose copies
owner.handles();                  // active and settled actual collider handles
owner.collider(blockIndex);      // exact native collider, if admitted
owner.patches();                  // only settled native face patches
owner.patches(false);             // includes moving faces for diagnostics
owner.diagnostics();              // totals, cap, sweeps, settlements, reactivations
owner.dispose();                 // idempotent full native ownership cleanup
```

Union actual ruin handles into the existing authoritative movement/clearance/solid collision admission filters where appropriate. Active native dynamics remain governed by existing owned character-motion policy. Surface/roof/paw queries must not accidentally exclude settled ruin colliders merely because their static source node is gone. Source topology receipts are retired; new ruin contacts use native ruin identity, revision, current collider and exact face data. Pose animation completion does not apply structural damage.

## Native falling and settlement

The hard bound is **16 dynamic bodies**, regardless of the number of retained settled pieces. Each admitted source is one CCD-enabled dynamic native cuboid with its original material density, damping, friction and deterministic incoming-direction angular/linear motion. A downward support-loss impulse still gives narrow pieces native angular motion. The owner does not invent fractures or replace cells with dust. Persistent fixed cells remain in the native world and source manifest until session disposal.

An active piece attempts settlement when native sleep confirms rest, or after four seconds in its current dynamic episode. Settlement requires an eligible real native fixed collider, with upward contact normal Y>=.5 and actual shape contact within the native contact margin. Sensors, other dynamics, kinematics and explicitly excluded support colliders cannot certify a settlement. A sampled terrain height determines the finite downward search range and an underground-source search origin; it is **never** enough to freeze a piece or invent a support plane.

The ordinary case preserves an existing native upward contact and confirms it with a short exact shape cast. This retains a sleeping tilted piece's solver pose instead of lifting it over a nearby column and claiming it fell again. Otherwise the full current oriented cuboid is swept down onto the nearest eligible native support, including raised roofs. Rotated vertical radius derives from all three rotated local half axes; it is not the source's unrotated half-height. Native contact is rechecked before converting the body to fixed.

When a same-tick burst reaches16 active bodies, the owner tries the lowest actual bottom first, then age/index. It settles a supported body before admitting the next dynamic body. Existing nearby fixed pieces can overlap the source pose before physics has had an opportunity to separate them; the settlement search origin moves above their broad bounds, then the exact native sweep chooses the final supported position. Those broad bounds are search/culling data only, never wall/roof contact patches or final support geometry. This capacity policy shortens some physical motion and can move a source piece directly to a native supported pile; it is a bounded simulation policy, not a claim that every component completes a freely simulated fall.

Freshly settled bodies may not yet be in Rapier's next broadphase update. Direct native collider-vs-shape sweeps include them immediately without an extra world step, so a burst forms real stacks instead of overlapping fixed pieces at the ground. Overlapping footprints are culled using transformed conservative radii, then all final intersections/contacts use actual native shapes. Side/deep penetration is rejected. An initial TOI0 cast with unavailable/zero hit normal is resolved using the actual native shape contact rather than treating it as either a false roof or missing ground.

If every bounded candidate fails to obtain real support, admission throws `OverhaulRuinSupportError`. Existing pieces are retained; the new body has not been silently admitted, removed or frozen above ground. The caller must latch this as an authority failure. Unsupported active bodies that fall more than32m below sampled terrain also fail explicitly instead of being discarded. Search distance is capped at256m, and each world sweep skips at most eight non-upward hits. There is no arbitrary body eviction or age-based fade.

## Support loss and snapshot persistence

A fixed piece stores its actual supporting native collider and contact. Each advance validates that collider and the upward contact, recursively validating owned fixed stacks. If a roof or lower chunk loses support, the dependent piece changes back to a dynamic body, retains its source index and original birth time, and starts a new four-second dynamic episode. The16-body bound also applies to reactivation. This prevents settled debris from hanging at the old roof altitude after the roof disappears.

Root integration must retain native terrain support beneath simulated persistent chunks or treat its unloading as real support loss. The owner does not fabricate a replacement terrain body. The optional `canSupport` filter can restrict support to stable authoritative native surfaces but cannot authorize unsupported floating settlement. Streaming a supporting fixed collider away without an appropriate authority surface lifetime policy can legitimately reactivate a pile and eventually trigger missing-support failure.

`OverhaulRuinState` now includes optional `revision`; current owner output always supplies it. Birth is immutable. Revision starts at0 and increments on settle and reactivate. Snapshot admission should require:

- Source block index and birth identity persist; no ordinary snapshot can omit previously accepted ruins or resurrect their source cells.
- Revision is a nonnegative safe integer and never decreases (`undefined` means0 for compatibility).
- A settled/active state transition requires a strictly larger revision.
- A settled pose cannot change at the same revision. A newer revision can release/re-settle the piece at a changed pose.
- Active poses may move while retaining the same revision; arrival selection must still be monotonic by authority tick/time.
- Source index is in the current district, indices are unique, birth<=snapshot time, finite position is bounded and quaternion is near-unit. The parser normalizes accepted near-unit quaternions before guest rendering/collision use and rejects more than16 active entries.

`parseOverhaulRuins` bounds total entries by the source component count and returns only the admitted wire fields, not caller-supplied dimensions/collision recipes. It validates individual values; previous-snapshot persistence belongs to root `snapshotAdmission` as above. Settled is not globally monotonic because real support loss is a legitimate reactivation.

## Guest clock and lifecycle

Mount `<OverhaulRuinCollision seed={seed} presentation={cityPresentation}/>` outside art/Suspense, in the existing Rapier provider. It creates no guest proxies for the authority. For guests, World selects/presents city state at priority-1.25; the child synchronizes at-1.2 before actor contact/animation at-1. Each proxy consumes the **same selected discrete pose** as ruin art; no new extrapolation, independent gravity or animation transform is introduced. Active guest proxies are kinematic position based, settled proxies fixed, both with exact source cuboids. Newly received but not yet presented ruins remain absent.

`CityPresentation` must notify or advance selected ticks while ruins are present; a structural revision signature alone cannot publish moving native poses to art. The collision child also polls `presentation.read()` by selected tick, so movement is not tied only to structural mask changes. Do not have art interpolate while collision uses a different clock unless both are moved to the identical common presentation sampler.

The exported `OverhaulRuinCollisionOwner` has `sync(poses,tick,time)`, `collider(block)`, `handles()`, `patches(settledOnly=true)`, `snapshot()` and `dispose()`. `overhaulRuinGuestCollision(world)` retrieves the current mounted owner. Sync parses source-bounded values, ignores backward ticks, updates exact native transforms, and removes proxies omitted by a newer presented set. Incoming allocation is completed before stale support is retired; allocation failure rolls back incoming ownership. Generation fences and layout cleanup unregister listeners and remove every owned native body before the Rapier provider retires its world. Same-tick calls do not create duplicate proxies.

Rapier broadphase insertion for a brand-new collider occurs at the next existing world step; this owner does not add a hidden physics step. The returned exact collider supports direct native `castRayAndGetNormal`/`castShape`/`contactShape` immediately for current presented-face queries. Direct native casts are tested before the next step. Consumers needing same-frame first-birth contact should use that exact collider handle/face candidate rather than assuming broadphase insertion has already occurred. Existing proxy transforms are propagated to native colliders synchronously.

## Exact oriented faces and future climbing

`overhaulRuinPatches(sourceBlock,state)` returns six oriented native cuboid face descriptions: stable source-face ID, block/birth/revision, center, world normal, orthogonal world U/V axes, half dimensions and four corners. Owner `patches()` also supplies each current native collider handle. Normals classify as roof(Y>=.65), underside(Y<=-.65), wall(|Y|<=.35), or slope. A slope remains sloped; no AABB side becomes a fake climb wall. The bounds of every returned plane match the source native cuboid transformed by its current **full world** quaternion and center.

Universal ruined-structure climbing is still a root integration gate. Candidate face geometry alone is not a support receipt: admission must additionally verify current native collider validity, exact contact/clearance, body stability/velocity policy, revision and match generation, and existing traversal reach. Active patches are diagnostic by default. A native ruin whose pose/support changes invalidates old face/grab/paw/mantle receipts; a source wall anchor ID does not grant control of the fallen plane. Art uses `poseQuaternion * canonicalModuleOrientationOffset`, avoiding double application of original block yaw. Decorative module details cannot enlarge these physical faces.

## Hard bounds and validation

Dynamic bodies<=16. Total persistent authority/guest components<=district.blocks.length (934 in the first district); each has one native body and one exact cuboid. Settlement performs at most eight world hit attempts, and direct shape casts only against nearby valid fixed components. Fixed support chains are acyclic, admitted by actual native contacts; support checks are bounded by retained component count. No package or native runtime version has changed.

`npx vitest run tests/overhaul-ruins.test.ts tests/overhaul-support.test.ts`: **19 tests passed**. Native ruin coverage includes actual gravity and character grounding, raised native roof landing,90-degree rotated extent, same-tick25-piece pile and the16-dynamic cap without hidden world stepping, missing-ground explicit failure, actual45-cell authored building collapse with every component retained and every fixed cell's upward native support witness, support-loss reactivation/fall to a lower real floor, exact face/native-ray parity, guest selected-pose collision/removal/disposal, and malformed/over-cap admission. Focused strict TypeScript checks pass. These tests qualify native geometry/ownership; browser visuals, real multiplayer transport and universal ruined-face climbing remain parent integration checks.
