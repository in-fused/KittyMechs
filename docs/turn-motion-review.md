# Independent authored-turn motion proof

Reviewer `/root/critic`, `gpt-6.1-sol`, 2026-10-04. This proof records a bounded improvement to actual turn footfalls. Final integration approval remains subject to the current critical-review receipt; this document alone does not authorize a release.

## Matched actual baseline and candidate

Frozen v7 source `240baeb` was captured before asset replacement and again from its frozen service. Four real local 60 Hz peer-host PVP chassis use medium quality at 1440×900 in Edge, a 6 m camera and a normal mouse pitch of -0.25 for the close full-paw comparison. Real keyboard/mouse controls cover slow stationary left/right aimed fire, abrupt 180-degree requests, directional reversals and stops. Slow keyboard travel uses 60 ms keydown / 160 ms keyup duty cycles; these are not analog controls. Continuous RAF, contact and camera data accompany actual screenshots and WebM footage.

The old renderer advances footfall phase by translation only. During stationary firing turns, it rotates the body over idle paws, then releases and replants them through reach limits. The new shipping clips visibly lift paws and sweep support around the presented heading. Angular phase follows actual signed heading travel, including wraps and reversals, while stopped packets cannot advance it. Authority yaw response and balance are unchanged: rapid requests can still turn the body very quickly, so this is not a physically weighted turn-rate redesign or perfect-fluidity claim.

| Chassis | v7 left-turn strong-paw fraction | New left-turn fraction | v7 right-turn fraction | New right-turn fraction |
| --- | ---: | ---: | ---: | ---: |
| Pounce | 87.7% | 65.8% | 81.6% | 63.5% |
| Bastion | 81.6% | 73.7% | 75.6% | 68.1% |
| Lynx | 90.4% | 62.4% | 84.1% | 57.7% |
| Caracal | 88.9% | 72.6% | 77.8% | 67.7% |

These are strong admitted paw samples divided by four times the actual render-frame count, not a perceived-quality score. Fewer locked feet are expected during genuine swing. Different command/capture timing prevents a strict latency claim; measured angular travel and negligible stationary translation are retained in the raw receipts. All four paw/body views were inspected. New local captures provide 4,665 frames and 11,587 strong samples, with maximum admitted drift 3.003 cm and sole-plane error 3.266 mm, at most twenty casts per actor/frame and no camera violations or page errors. This desktop capture predates only the later release-footprint clearance repair; unchanged art and turn actions are independently rechecked below.

## Shipping and contact truth

An independent Meshopt-decoded audit compares all seven candidate rigs against actual frozen-v7 shipping files. Mesh/index/UV/normal/skin arrays, retained 26 player / 15 Sentinel animation channels, node rest matrices/hierarchy, materials and embedded image hashes are exact. Each rig adds only two finite normalized zero-root turn clips, yielding 28 player / 17 Sentinel clips. The four profiles differ in arc, duty, lift and support order. Source-tagged armor composition receipts cover 540 mixtures per rig, including mirrored turns, adjacent gaits and additive attacks; these receipts do not measure final head aiming, terrain tilt or IK.

The independent CPU compositor exercises identical actual Rapier input trajectories at screened 4.6–7.2% slopes for four chassis in three theaters: 15,120 frames of stationary fire turns, rapid reversals, slow travel/reverse, stopping, jump, forms and ability turns. It calls the actual production contact helpers and independently casts final sole corners. Maximum strong-support drift is 2.719 cm, sole-plane error 6.322 mm and segment-length change below 0.524 micrometers. Explicit form/air transitions still reset cosmetic settling; those resets are excluded from ordinary grounded continuity claims.

A real release bug was rejected: one Caracal rapid-turn frame moved its released paw about 59 cm uphill while final clearance retained the old footprint's ceiling. The sampled final-corner intersection was 2.280 cm, versus a 7.337 mm frozen-v7 maximum along identical inputs. The repair refreshes the current whole rotated footprint before release completes, replacing the scheduled query rather than adding a second query in that frame. The unchanged replay now measures at most 3.591 mm for that Caracal rapid stage, below the baseline. Strict footprint/reach/surface filters and rigid IK remain unchanged; the new actual-shipping-paw regression passes. Each helper call uses at most five rays, with at most twenty per actor/frame; regular probes retain 30 Hz cadence with an early refresh on finishing releases.

This is not a claim of zero corner intersection everywhere. Unplanted Pounce rapid-turn and Lynx boost samples retain approximately 3.726 mm and 8.591 mm corner limits, both slightly below their matched v7 values. The steeper natural coastal endpoint around (-141,-27) rejects all strong paw plants during its revolution; its capture demonstrates safe unsupported-surface exclusion, not verified coastal planting. Arbitrary rocks, mixed edges and dynamic platforms remain unqualified.

## Rebuilt production checks

Four real coarse-pointer local chassis use actual analog arcs, reversals, two-finger aim/fire, both forms, abilities and jump/landing. Their 6,040 render frames and 11,868 strong samples pass with maximum admitted drift 2.776 cm, sole-plane error 2.378 mm, no camera/page errors and the twenty-ray ceiling.

An actual Bastion held against the authored solid service facade keeps a 5.60 m/s movement intent while its body turns 1.362 radians along only 1.482 m of tangent travel. All four paws swing, so blocked movement does not suppress angular footfalls merely because intent speed is high. The complete normal route and turn probe supplies 3,827 frames, with maximum admitted drift 2.831 cm and sole-plane error 5.166 mm. The coastal branch is qualified separately above.

Two actual rendered WebSocket clients exercise side-view stationary turns, rapid reversal, upright fire, jump/landing, down transition and return-to-hangar cleanup. Final repaired-build evidence contains 3,440 frames and 9,462 strong samples; all four paw indices swing on both views, maximum admitted drift is 3.132 cm, sole error 4.936 mm, with zero stable-air anchors, upright forepaw plants, camera violations or page errors. Latest snapshots are approximately 100 ms ahead of rendered contacts; a retained failed takeoff assertion compared these different times. The corrected settled-air check waits more than 200 ms of continuous latest-air state and does not claim exact first-air-frame coverage. Pure timeline tests separately cover jitter, wraps, stalls, shared frame cache and discontinuities.

## Matched quiet cost

The unchanged historical v7 profile remains in `browser-performance-environment-baseline.json`. A fresh same-session medium 1440×900 GTX 1070 Ti ten-sample run measures v7 at 57.0 FPS / 243.3 calls / 1,262,353.6 triangles / 146 geometries / 57 textures; the repaired candidate measures 56.9 / 243.3 / 1,262,345.6 / 146 / 57. The tiny triangle difference reflects scene timing; decoded geometry is exact. This does not prove identical throughput across hardware or large rooms.

Separate screenshot-free matched Pounce turn/reversal RAF windows last 15.121 seconds / 862 samples for v7 and 15.045 seconds / 858 samples for the candidate. Baseline p50/p95/p99/max are 17.5 / 18.4 / 19.0 / 20.2 ms; candidate values are 17.5 / 18.6 / 19.3 / 25.0 ms. Both record zero intervals above 50 or 100 ms, zero errors/camera violations and the same settled 104 geometries / 50 textures. These short samples do not qualify long sessions or all motion routes.

The seven actor models increase from 4,899,924 to 5,299,640 bytes: an additional 399,716 bytes (8.16%). Player files are 839,080–888,016 bytes. The extra baked channels cost download bytes despite unchanged mesh/render counts.

Raw baseline, rejected assertions, source audit, trajectories, screenshots, videos and final production receipts remain under `.sites-runtime/critic/authored-turn/`. `docs/browser-performance.json` records the exact current samples and qualified comparisons. All four final decisions and the independently recomputed source fingerprint are recorded in `docs/critical-review.md/json`; the final repaired-build ten-scenario run passes without reruns. Any covered source change invalidates that receipt.
