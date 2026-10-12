# 132 CLOSED source candidate

Writer CLOSED. Source only; no tests, builds, browser, server, Blender or author jobs run. Full gameplay/contact/art goal remains unaccepted.

## Causal diagnosis

The actual125 reverse tick904 selected only FelineGallop, phase .6743649654, speed 5.32465396 m/s. Its actual121 distance is approximately 2.43589744 m/cycle and stance duty .26: a plant lasts approximately .1189 seconds at that speed, and .0852 seconds at tick916's 7.43307517 m/s. The old authored branch required .12 seconds of accumulated presentation time to reach unit constraint influence; every positive authored swing reset that accumulation. Thus ordinary gallop could finish a whole authored stance without becoming planted. This is a mismatch between a wall-clock acquisition lifecycle and the distance-clocked source gait.

The old failure branch also retained an unreachable support lease and called recovery against the last solved marker. The next authored stance frame changed release back to touch and retried that stale anchor. Tick904 FR had source-to-anchor error 1.90394 m, final marker-to-anchor error 1.24590 m, effectiveWeight .669116, yet a tiny task error: the task was an interpolated recovery endpoint, not that anchor. Tick1562 HR similarly had source error 1.07552 m, final anchor error .38489 m and weight .64213. Those marker errors and the final attached-skin subset are separate provenances; a tiny endpoint residual never certified either plant or native collision.

## One structural correction

Only movingRFfeet067.ts production code changes. An authored stance can acquire support only through the existing near-ground .03 m admission check. That admitted task now receives an exact unit-weight fixed-chain solve immediately instead of waiting for a wall-clock fade. The unchanged strict reach and 1e-4 m residual guard decide success. A failed exact plant retires its lease and task completely, restores source through the existing solver failure path, and can acquire current support on a subsequent frame. It cannot keep/retry the stale anchor as a partially weighted plant. Any positive authored swing, source-only action or forelimb unload continues to surrender the joints immediately. Retained legacy/no-metadata branches are unchanged.

All source translations, scales, bind matrices, inverse binds, lengths, source poles, phase/distance selection, native movement/collision and eligibility remain unchanged. Identity57Runtime005.ts and authoredFootfalls123.ts were read and preserved, but not edited. No thresholds were changed. No new per-frame vertex scan or telemetry framework was added.

## Remaining pose limitation

Large pre-solve lateral source-marker excursions already exist in125 (e.g. FR x -6.98638 against actor x approximately -8.00079). They precede this contact solve. Upright forelimbs are explicitly unloaded by the actual positive upright contributor, so this owner cannot explain or repair the broadside source guard. The 121 studio/125 gameplay discrepancy still requires comparison of actual selected mixer output, additive transition and final model-space source pose. This patch does not establish which body component causes those excursions, or claim functional anatomy/contact quality. If the next actual review fails, reassess weighted-marker/source-blend ownership; do not retry acquisition constants.

## Directed fixture and next gate

tests/contact-lifecycle132.test.ts is UNRUN. It uses actual121 duty/offset records, an explicitly synthetic unit-plane provider and real attached weighted skin, and checks immediate short-gallop planting, signed carrier travel, strict unreachable-anchor retirement/reacquisition, positive R unload and true suspension with immutable joint translations/scales. It is not a native/world or whole production-pose certificate. Existing authored-footfalls123 and contact-skin098 fixtures remain relevant; a failure stops this candidate.

After independent source review, propose one bounded ordinary actual-play review: unobstructed W/S in both stances and moving R up/down while reversing, require at least 1 m actual displacement in each travel segment and actual selected contributors. Record current native hull clearance with +/- movement, final rigid marker and attached-skin subset separately, and actual footage. Require reachable sampled full stance and unchanged release/suspension; do not label an action gallop from Shift input. Root134 owns this observation. No human Lowest-lag qualification follows from it.

Exact production/test/preimage hashes are in source-seal.json; original live053 preimages are immutable under preimages/. Only the production owner and the new directed fixture are changed game/test paths.
