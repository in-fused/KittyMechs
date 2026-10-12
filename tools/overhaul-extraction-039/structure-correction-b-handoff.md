# Structural test correction B

Second bounded039 technical repair, source only, 2026-10-10. Initial039 source
and handoff receipts remain preserved. Changes are confined to
`tests/overhaul-support.test.ts` and `tests/overhaul-density-clearance.test.ts`.
No compiler, old/new layout, damage graph, actor or art source changed.

Root's first focused run reported41/43 passing tests. Its complete031 prefix
comparison passed, as did all24 ordinary native building climbs, including all
three appended buildings. Two harness failures remained: the density test
spent30s scanning88 source colliders for each sample; and the support route
test projected a retained inspection hatch into a tall2D road obstruction.
The original run output is preserved at
`.sites-runtime/overhaul-20261010/extraction039-test-process/stdout.txt`.

The density assertion keeps every original wall/corner/roof/road/NPC sample,
all88 owner colliders and the same -1e-5 penetration threshold. Native world
`intersectionsWithShape` now supplies its broadphase; owner-handle filtering
retains exactly those88 solids before exact shape/contact penetration checks.
The30s test bound remains unchanged.

The retained population002 west-relay-maintenance inspection hatch has a
.125m-high native convex envelope, from graded y=-.08 to y=.045. Its footprint
crosses the old relay street. The old2D metric counted that walkable low ground
feature as a vertical barrier. Actual shipping `addActor` controller profile
uses offset.02, autostep(.55,.2,true), ground snap.35, max climb slope pi/3.5
and min slide slope pi/3. Merely replacing its convex hull with a bounds test,
omitting the hatch, or relaxing radius/penetration would not classify it.

Every district street now receives actual native controller traversal with
full radius2.05m, height3.8m rounded cylinder and ALL compiled cuboid/convex
solids. The added ground plane is exactly the existing grading rectangle and
height. Each route advances in <=.25m horizontal steps with downward contact,
the exact shipping controller profile and no collider-exclusion predicate.
Every centerline sample must remain within.05m of its requested x/z; a blocked,
sliding or nonfinite route retains a failure listing actual collider owners.
Vertical autostep is native movement, not a bounds/height waiver. Existing
spawn/objective4.5m conservative entry-distance assertions remain unchanged.

No root repeat test or native success result is claimed here. If the exact
controller still blocks, the test remains failed and the inherited layout
obstruction must be reported. Correction source hashes, original handoff hash
and failure-output hash are in `structure-correction-b-seal.json`.
