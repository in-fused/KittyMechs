# Validation: upright locomotion and feline jump agility

Independent critic reviewed 2026-10-04T13:13:40.266Z. All four areas are APPROVE for fingerprint `2f09d6f495342a2e83eeebc49f72602a9bd47851b41d4cf69242025cbe0c89e6` across 272 covered files. The preserved published v10 baseline is `6cf28cca9ac31b7f16053d02eeb3935867f7ebb5`. See [critical review](critical-review.md), [motion proof](upright-motion-review.md) and [performance evidence](browser-performance.json).

## Result and scope

Each original player now has four appended upright clips: longer walk, faster stride and mirrored hind-paw turns. Realized displayed distance and angular travel advance their phase; matching support relinquishes lifted paws through all contact passes. Original geometry/materials/skins/binds and all 28 prior clips decode exactly equal, with 2,264,756 compared numeric values and maximum error zero. Players have 32 clips; Sentinel 17 clips and 25 other admitted GLBs remain unchanged.

Quad launches by Pounce/Bastion/Lynx/Caracal are 12.2/9.4/12.4/10.5 m/s, giving actual sampled rise 3.282/1.931/3.392/2.419 m. Upright launches 5.76/5.2/6.56/5.6 and separate Pounce ability launch 5 remain unchanged, along with gravity, horizontal acceleration, air control, yaw and traversal/collision rules.

## Completed gates

- Lint, typecheck, production build and all 29 shipping GLB validations pass.
- 283 unit tests in 35 files pass. New authority tests use natural default-floor Rapier motion, validated inputs, real ceilings, grip detach and roof gates.
- 27 distinct local browser scenarios pass across three accepted runs: corrected upright 1, retained 25, focused medic 1. The retained run has one documented input-readiness failure and one public-only environment skip; it is not a single uninterrupted 27-test pass. Fresh public execution of the skipped ONLINE_URL scenario is a separate rollout requirement.
- Independent 77-test authority verification and 27 paired old/new natural trajectories pass; upright/ability traces remain equivalent and all 12 new quad arcs match discrete gravity.
- Independent actual Actor callback replay covers 35,640 candidate frames across 24 terrain/step/edge/roof fixtures. Final sampled paw corners have zero positive penetration, forbidden/fore anchors zero and at most 20 contact casts. Maximum rigid error is 1.041 micrometres. Sampled upright central-bone vertices fit their radius/3.8m hull; maximum sampled height 3.482m. Explicit CPU fixture positions and selected vertices are separate from ordinary browser travel and every-vertex clearance.
- Eight ordinary local/dedicated cases, four side captures, four portrait coarse-pointer cases and a real rendered PeerJS pair pass. Steady local individual footfalls are approximately 4.67/3.37/5.33/4.72 per second. Carrier-subtracted pelvis range is 23.9/17.0/30.2/20.0mm versus effectively zero before. A 2-second blocked Bastion window moves 1.18 cm with both hind supports 1.

## Preserved failures and practical limits

The new browser counter initially required a low-to-high support change in consecutive frames and missed smooth intermediate placement. A latched release observer retains both thresholds and all original cadence/contact requirements; independent recomputation of the same raw sequences proves the correction. The retained medic test sent a 150 ms host tap after guest control without foreground/mounted readiness. Its test-only repair explicitly qualifies focus, loading/contact and actor readiness, then requires a newly accepted ability replicated to the guest. Neither repair changes shipping runtime. All original failed traces remain under `.sites-runtime/upright-motion-*`.

Raw mixed HR paw minima ofâˆ’4.58..âˆ’7.44cm remain disclosed. Production contact/IK corrects the sampled corners; source pose bounds alone are not safe-contact proof. Rendered strong-support slip reaches 19.1 mm in main local routes and 23.2 mm in portrait touch; peer maximum 6.1 mm. Fast reversal yaw, arbitrary steep/adjacent obstacles, dynamic platforms and complete landing choreography remain further work.

The inherited wide touch layout hides controls above 800 CSS px ; 390×844 portrait motion passes, while landscape/tablet support remains open. Physical mobile and all hardware/network conditions are not qualified.

## Cost and pacing

Player GLBs total 3,866,872 bytes versus 3,423,320 (+12.96% for animation data); mesh detail is unchanged. Fresh medium 1440×900 Pounce solo, camera 10 and normal flashes, averages 60 FPS / 243.6 calls / 1,298,544 triangles / 146 geometries / 57 textures versus matched v10 60/243.5/1,298,536/146/57. Candidate settled RAF p99/max is19.3/31 ms with zero gaps above 50 ms. Paired upright routes have Pounce p99 old/new 18.6/18.3 ms and Lynx18.0/18.5ms, with zero gaps above 50 or 100 ms. Short same-machine windows establish no observed regression here; they do not establish a speedup, long-session plateau or hardware guarantee.

## Release and continuing work

The source receipt gates publication; fresh public HTTPS/WSS checks and served bundle/model byte verification occur after the frozen arena refresh. Native deployment IDs, exact source/art/archive identities and actual public outcomes are recorded in `.sites-runtime/release.json` and the immutable per-commit release receipt. Earlier public asset-transport failures are retained and are not repaired by this movement work.

Twelve previously admitted Higgsfield media remain. Native 3D Jutsu revision 3 coolant with original editable source and a single PBR primitive is staged for separate admission; optimized in-game appearance, LOD and source compatibility remain open. Dedicated playable mech armor/materials and a dense directional-damage district are defined in [the art plan](mech-art-next.md) and [the city plan](city-destruction-next.md). This movement milestone does not complete those features or AAA quality. Durable hosting is deferred, the continuous goal stays active and the original Unreal tree remains read-only.
