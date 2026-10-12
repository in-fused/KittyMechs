# Gait088 bounded source candidate

Writer CLOSED. Source candidate only; no tests, build, browser, Blender, or background job ran. Live045 was not changed or restarted. This candidate requires the parent-owned independent critic gate and one integrated ordinary-public-travel candidate build/capture for both stances and moving R before retention. Visual quality/contact/performance remain unqualified.

## Causal source evidence

The current 058E manifest declares ordinary stance duty .72 Walk, .62 Trot, .52 Gallop and .64 both upright gaits. The saved source evaluator `tools/overhaul-gait-058e/graft_verify.py:114` uses Walk offsets FL0 FR.5 HL.75 HR.25; Trot/Gallop use FL0 FR.5 HL.5 HR0; upright HL0 HR.5. Preimage067 used duty .64 and Walk offsets for all quadruped clips. Thus it released authored Walk stance early, held authored Trot/Gallop swing as planted, and selected the wrong rear footfall for Trot/Gallop. Its procedural Hermite swing ran after the source mixer at increasing influence, replacing actual authored lift/joint motion. Reach-triggered startSwing could further change those footfalls independently of source phase. This is a demonstrable ownership defect, independent of screenshots.

Preimage005 advanced phase solely by nonnegative `p.distance`; `renderTimeline.ts` derives that distance by horizontal hypot. Both forward and reverse therefore played the same authored stance sweep forward. Shared direction is (-sin(yaw),0,-cos(yaw)); the candidate derives sign from displayed root displacement projected onto that heading while retaining measured distance magnitude/stride.

Viewed actual baseline PNGs: prototype-idle, prototype-backpedal and standard-backpedal from performance084-baseline. They show limited leg articulation/similar extension, but single stills do not prove cycle failure or absence of motion. No motion improvement claim is based on those stills. The source contradictions above justify this finite candidate.

## Source changes

`identity57Runtime005.ts` now normalizes signed measured gait phase into [0,1); reverse travel samples the source cycle backwards. Moving R advances the same signed measured distance without changing authored transform time. The selected ordinary gait name/duty reaches the existing feet owner. No native action, source translation/bind, camera, combat/climb contract or asset was changed.

`movingRFfeet067.ts` now gives ordinary footfall timing to 058E. It leases/probes only declared authored stance; authored swing has no IK solve/recovery pose and retains the mixer's actual joint rotations/lift. An unavailable/unreachable ordinary stance releases to source, instead of inventing a procedural travel-recovery footfall. Stance correction keeps existing rotation-only fixed-length solve, support validation and constructor-derived actual weighted-sole marker. Clip changes and handoff to/from R retire preceding leases so an authored swing with no lease cannot enter procedural swing. The existing procedural recovery path remains for transform/idle/turn; this candidate does not redesign unmeasured turn motion or generate unsupported R additive clips.

No additional vertex sampling, all-vertex work, actor, logging or source asset was introduced. Existing per-frame diagnostics remain the bounded four-chain set. Initial foot geometry is still sampled once by the existing constructor.

## Review limits and next finite gate

No typecheck/build/play verification was authorized in this source-only assignment. Candidate may still be rejected visually: abrupt gait speed-band switches, true lateral travel, source pad-envelope clearance, gait-to-idle settling, R replant continuity and reach-release behavior need the integrated observation. Sideways travel retains existing distance magnitude; sign is defined only by heading projection and is not a new strafe animation. Ordinary support may fail to seed if the authored weighted marker is farther than existing .03m tolerance; the source pose then remains visible and no contact certificate is claimed.

Parent gate: independently inspect source, then ONE integrated ordinary public-input travel capture with actual clear forward AND reverse travel in quadruped/upright, deceleration/resume and unobstructed moving R both ways. Keep articulated legs/feet visible through several full measured cycles. Compare the captured source-owner diagnostics against visible footfalls; judge actual lift, joints, planted stance, reverse, R release and resume. A passing test is insufficient. Do not add vertex-wide runtime probes or lower tests to manufacture contact proof. Preserve native movement/combat/climb authority and live045 recovery. If critic rejects, restore only the two owned source preimages; retain evidence.

## Exact owned source closure

Preimage005 SHA256: `18794a8b616b3934d198c2c5e78839eae8680a203e90701660e60542ad2cc9b3`.

Preimage067 SHA256: `2f1e3281f6247e416318d9c458eff215c8a6bd8c9cab5d2b3854d3fd9447f9f8`.

Candidate005 SHA256: `ac76f154f8b1745183b95c44ac723168e3827efebf86cf53b5b1e1f4bc449dce`.

Candidate067 SHA256: `7d2f017354391143d497f797f12acfa649e703cbcf709b21160499f7dbbd5a61`.

`source-seal.json` records exact owned source/preimage and read dependency/PNG hashes. CameraRig belongs to agent087 and was untouched. No jobs remain from writer088.
