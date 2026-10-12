# Asset pipeline independent review

Reviewed 2026-09-26 by the combat/mission specialist. Scope: `Art/Models/README.md`, `Tools/Blender`, model metadata and validation receipts; no geometry edits. Acceptance remains **M0 articulated export prototypes**, consistent with the README. This is not final art, Unreal import, animation integration or performance approval.

## Evidence executed in this review

- Parsed all five Blender Python scripts successfully with Python's AST parser.
- Independently reran the existing GLB inspector's read-only `inspect()` on all six exports. All passed its structural checks; no validation receipts were overwritten.
- Recomputed every file hash listed in both `qa-metadata.json` files. All matched the current files.
- Read the source, FBX re-import receipts and animation sample receipts. Blender re-import/render/deformation sampling was **not rerun** in this review. Unreal compilation, import, cooking and gameplay were **not executed**.

| Asset | LOD0 triangles | LOD1 | LOD2 | Materials per LOD | Rest mesh height |
|---|---:|---:|---:|---:|---:|
| Pounce v004 | 42,672 | 23,468 | 11,948 | 12 | 3.842 m |
| Bastion v004 | 36,288 | 19,958 | 10,160 | 12 | 3.842 m |

## Acceptance limitations and next gates

1. **Preserve the stated M0 boundary.** The source produces a shared 25-bone rig, rigid armor weights, three exported LODs, UV0 and Idle/Walk takes. The README correctly distinguishes meter/Z-up/-Y source coordinates from glTF coordinates and explicitly excludes preview scenery from export. These are useful interchange checks, not evidence that Unreal materials, facing, scale or animation playback work. Import one kit, inspect it against a meter reference and the gameplay capsule, then import the other against the same skeleton.

2. **Fit the render body deliberately before enabling it in play.** The source height is about 384 cm; the present gameplay capsule is 250 cm tall (`KMMechCharacter.cpp`, capsule half-height 125). This is not a defect in an unattached art prototype, but importing at scale 1 and attaching it without an explicit fitting decision would create a substantial visual/collision mismatch. Verify feet, camera obstruction, shoulders, weapon origin and traversal clearance; record the chosen cosmetic scale/offset. The collision JSON correctly states that it is guidance rather than an Unreal PhysicsAsset.

3. **Animation receipts show a known contact defect.** Existing v004 Walk samples report maximum ground penetration of approximately 1.67 cm for Pounce and 2.53 cm for Bastion at source scale. The sampler verifies finite deformation and records penetration; it does not enforce a contact threshold, test inter-part collisions or validate exported clip playback. The README already excludes foot locking. Before gameplay art acceptance, inspect full loops and turning/slope behavior, clean contacts, and add kit actions/hit reactions when their integration is ready. A single mid-step still cannot approve an animation loop.

4. **LOD triangle reduction is not a performance result.** Every LOD retains 12 material sections, including canopy transparency, and the reduction is generic decimation. Screen-size thresholds, cockpit readability, silhouette stability, skinning quality and material/shadow cost need engine checks. Do not turn these counts into an FPS guarantee on the target PC. An atlas/material consolidation pass is justified only after measuring the actual render cost and preserving the readable pilot.

5. **Bind validation receipts to their inputs before treating them as durable approvals.** The main metadata records export hashes, which match now. The separate GLB, FBX and animation receipts do not record input SHA-256/revision or validator version. Rebuilding the model leaves old receipts in place until the separate validation commands run, so an earlier `passed` receipt could be mistaken for the new build's evidence. Record the source/export hash and validator revision in each receipt, or invalidate receipts on rebuild. This is a pipeline hardening item, not a current hash mismatch.

6. **Keep validator claims precise.** The GLB checker compares bone names and inverse bind matrices, but does not compare node parent hierarchy; the FBX checker compares local rest matrices but also does not assert parent links. Source/metadata include the hierarchy, so there is no demonstrated current skeleton mismatch. If automated shared-skeleton approval is desired, additionally compare parent relationships and validate each exported LOD/clip in the target importer. The FBX round-trip script currently checks LOD0 only. README wording should continue to distinguish checked properties from broader skeletal compatibility.

## Root integration follow-up

The added `/Game/Materials`, `/Game/Audio`, `/Game/Mechs` and `/Game/Data` cook rules address the earlier missing-reference finding at source level. The shared controller target selector now applies pickup range/availability, objective eligibility, line of sight and revive priority to both prompt and action. The test runner now requires a fresh unique report and nonempty successful KittyMech results; prefer checking the two exact required mission/checkpoint test paths instead of only a count of at least two. These fixes still need their respective engine execution gates.

The extraction HUD marker now remains eligible during active extraction. Objective and partner markers share a projection helper: targets behind the camera retain a left/right turn direction and distance; offscreen targets clamp to an edge; onscreen names remain unchanged. Text bounds are measured before drawing so long edge labels remain visible. Shutter lowering now checks the remaining travel volume every tick and requests authoritative reopening if occupied; clients pause their visual/collision descent locally while awaiting replication. Required runtime checks: step beneath a descending shutter in solo and as a delayed-network client, retry beside it, leave/return to an active extraction zone, and rotate away from both an objective and a downed ally at several UI scales. No engine behavior is claimed from static inspection.
