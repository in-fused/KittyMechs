# Contact witness provenance 001 — independent text gate

Actual review start **2026-10-10 10:59:05 UTC**; inclusive deadline **11:05:05 UTC**. Source/API text inspection only; no compiler, native query, browser, Blender, render or source mutation.

**DENY execution under the frozen contract as written.** One specific first-failure requirement is missing: nonfinite native provenance/manifold values are recorded but do not necessarily stop execution. No malformed value has actually been observed in this unrun packet; this is a control-flow defect in its promised diagnostic policy, not a claim of bad native geometry or an engine defect. No automatic repair, alternate packet or retry is authorized.

Source seal SHA256 `85C001131F1836CB63033768F4E7FCC94531FDD733031D141B3EC8A0DE9F641A` matches. All4 owned rows and13 frozen-input rows match listed byte counts/hashes. Fixture SHA256 is `7DDF5D5E4EB8DE982F9A19F77A715E1F671ADA0CE4E5DD2E5008C034AF6E220A`. Original failed street receipt and shared geometry/placements are unchanged. This review does not requalify any earlier candidate.

## Exact blocker

The sealed document says nonfinite native data is a genuine STOP. In `fixture.ts`, `flags()` at47–52 copies native contact skin, friction, restitution, density/mass and parent pose/mass without finite validation. The manifold callback at188–192 copies normals, local points, distances and impulses without finite validation. Installed declarations allow local contact points to be null; these values also have no explicit interpretation/validation policy in the fixture.

The serializer deliberately preserves nonfinite numbers as tagged raw values, which is useful evidence preservation. But preserving a tag is not rejection: after these rows, execution can still calculate an explicit-shape eligibility label and set `DIAGNOSTIC_COMPARISONS_RECORDED_NOT_ADMISSION`. For example, a finite main contact with nonfinite native manifold distance follows that completion path, contrary to the stated first-invalid-native policy. A root/manual postinspection is necessary for any raw diagnosis, but does not make the frozen fixture implement its promised stop. Do not describe this as complete finite native validation or execute it under that unchanged guarantee.

One finite next requirement, if root separately authorizes work, is to make this diagnostic's **raw-value validation and STOP policy match its frozen contract**, while preserving the original packet and every native raw result before rejection. This is a diagnostic control-flow correction, not permission to change geometry, prediction, grade, masses, numeric contact consistency bounds or the scene. This review requests no manufacturing proof, additional shape classes or new gameplay candidate.

## Useful design already present

The reconstruction uses the original authority Simulation seed/mode/syncChunks and one unchanged native world step. Actual cart factory identity and terrain registry map the original handle to a concrete tile. It records current poses, full native arrays/flags and regenerated terrain arrays, with matching terrain hashes; a missing owner or unreproduced original contact rejects. Named diagnostic generation/revision describe this created fixture, not a production support lease. It does not move the actual colliders, spawn actors, fire or run settlement.

Both collider orders, collider/explicit-shape routes and the one common-translation query control retain their declared coordinate spaces. The translated query is labeled separately and offset undo occurs only in named arithmetic; there is no silent local/world relabel. The main contact branches preserve raw results before finite validation and test unit/opposite normals, point-normal-distance agreement and native surface projection. Finite inconsistent contacts are diagnostic findings rather than false candidate passes. Null contact is not a support or separation certificate. The fixed numeric epsilon checks receipt coherence, not physical placement clearance.

Current hull-bottom rays/projections are a finite independent observation, not complete shape support. The fixed-fixed manifold row explicitly disclaims force bearing and acknowledges absence is inconclusive. The callback immediately reads manifold data into ordinary JS values, retaining no `TempContactManifold` reference and making no world mutation/query inside the callback; installed vector accessors return copied JS vectors. No callback-borrow misuse was found.

The normal cleanup path disposes Simulation and frees the allocated World. A constructor failure still leaves its World tracked for cleanup. This source review is not fault-injection proof of disposal: a thrown `sim.dispose()` would bypass the subsequent free loop, so unconditional successful cleanup must be read from an eventual receipt rather than inferred here. No execution has occurred and there is no disposal result to approve.

Even a corrected, separately authorized successful diagnostic could establish only a conditional query interpretation for this exact frozen pair. It cannot approve actual support/load/COM, arbitrary terrain/hulls, production API repairs, physical street admission, full feline body/R/climb/pairs, ordinary destruction/gameplay or Gate1. All those qualifications remain denied/incomplete; no counts change.
