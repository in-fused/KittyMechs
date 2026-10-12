# Pose/contact owner 001 — CLOSED, UNADMITTED

Actual start2026-10-10 08:17:37 UTC; hard deadline08:57:37 UTC. The ONE Blender bake/export/render execution, session **59771**, began approximately08:31:00 UTC and closed exit0 after **157.422 seconds** (approximately08:33:38 UTC). Heavy slot released08:34:04 UTC. No literal execution repair, second job, geometry change, profile/pose retry or runtime/public migration occurred. Only the new `assets/source/overhaul-pounce-pose-owner-001/` and this document were written. All writers/jobs are closed at the final seal; live production v3 remains unchanged. Gate1 remains INCOMPLETE.

## Exact preservation and freeze chronology

`pre-author-freeze.json` records08:30:39.4796998 UTC, zero jobs, controller/author/contract and immutable master hashes. Root's offline-versus-causal-runtime concern arrived immediately afterward; a **description-only** contract addition was recorded in `pre-author-amended-freeze.json` at08:31:00.0642176 UTC before Blender launch. Initial freeze is preserved. Controller, author, geometry and profiles did not change between those freezes or after the job.

- Author SHA256: `6D5F37D6F8AA044663950B064B742099F3991095584E0017C824D757C01B5922`
- Pure controller SHA256: `D5DF901CBB95FF49C27F143D268D4281DBFB27C8C95C1456124D7775B2D29C76`
- Amended contract SHA256: `E6090999111481FDB59B38F4A2FC88F58150FFB028E8F2FEB9CDA868F261533D`

The exact mesh vertices/faces, material names/assignments, skin/rigid weights, bone bind matrices, parents, heads and tails have identical before/after geometry fingerprints:
`302781EB955FBB21614F637BF510E4242C55672BB08CDE5E903F927D47F94220`.
Skinned001 master/raw GLB/original receipt/seal remain byte-identical. `protected-master-check.json` independently compares all eight original protected v1/v3/v5/v6/v7/v8/frame/anatomy records against their preserved hashes. No detailed part was deleted, cut, shifted in mesh space or reweighted; all130 retained detailed parts remain.

Complete separate `Pounce_PoseOwner_001.blend`, raw GLB, immutable original `source-receipt.json`, job log and three `review-{quad,rise,upright}-full.png` source views are saved. Views fit all actual deformed vertices with15% perspective padding; actual pixels show complete extremities. Root still finds bulky upright proportions and large glossy sparse surfaces. Stills cannot approve finish, motion or physics. No continuous footage was produced.

- Blend SHA256: `F0A12CD603542555CDA5FD65D5EC586368E48968C0A700AE2658F51894D43958`
- Raw GLB SHA256: `BCF7A01FC439138D97A2AA5C061C6972675D1B30F879415906F9CF0DF2EECBA3`
- Exact complete file hashes/UTC are in final `seal.json`.

## Implemented source ownership, and its causal limit

`pose_controller.py` is pure source math, with no Blender import or geometry mutation. `Trajectory.at(t)` supplies ONE prescribed carrier position/yaw/speed/body amount. `SkeletonKinematics` derives hierarchical core motion and actual fixed-chain hip locations. `ContactPlanner(trajectory, feet, fixedLimits, hip_at, fullPadBounds).update(t)` produces requested skeleton-local/world paw targets, reach, immutable loaded world plants/yaw, support owner/revision and finite swing lifecycle. A preissued swing target uses the actual declared touchdown carrier and validates swing plus following stance reach; unreachable requests are rejected, not clipped by IK. Quad profile.18s/.58 duty and upright.28s/.66 duty are frozen new source profiles, not the existing runtime stride/duty constants.

The Blender adapter applies carrier translation/yaw **once on the rig object**. Core/leg matrices are skeleton-local; it no longer premultiplies every bone by the carrier. Raw120Hz receipts preserve actual requested/achieved hip/knee/paw values, full retained-paw bounds, matrix transforms, support/revision/planted flags, plant error/slip and sole yaw at matching clocks. Mesh/support tests remain source diagnostics, not native contact queries. The constant root-bone crouch declaration has an additional basis discrepancy: assigning pose-local Z produces source +Y translation. Raw root matrices expose this; absolute compiled core matrices still carry the intended source Z crouch. It was not repaired after the genuine failure and must not be presented as a completely corrected root/core convention.

Exact future carrier lookahead is an **offline source schedule**, unavailable for arbitrary future live commands/contacts. It removes the old constant-velocity prediction error for this prescribed circuit, but does not implement a qualified causal runtime planner. Live admission requires current authoritative motion, bounded reachable forecasting/replanning under changing commands, actual support leases and coordinated interruption/recovery. The2ms plan samples and measured-distance-rate margin are diagnostic estimates; guaranteed between-clock reach, triangle clearance and dynamic support remain **UNKNOWN**.

The intended connected circuit freezes quad7.6m/s acceleration/cruise/cancel, an actual90-degree eight-step lift/replant turn, nonzero-momentum .7s rise7.6→4.864, upright4.864, moving .7s reverse4.864→7.6, one .20m source obstacle, moving R cancellation/Hermite recovery and brake. Gravity22/friction.8 and NEW finite1800kg approximation remain declared goals/context; source supports and carrier are prescribed, not native reaction/momentum evidence.

## First genuine failure — STOP, no repair

The circuit stops at **frame781, t=6.508333333s**, during **moving rise**, approximately.108333s into .7s R. The adapter rejects **FR** before issuing/clamping its IK:

- Actual current hip source: **[.730000019,-.911798716,1.603368163]**.
- Current requested target source local: **[.736378968,.155887410,.173299029]**.
- Requested distance: **1.784682575m source**; unchanged upper **.869825304** + lower **.878535748** = **1.748361051**, approximately **1.020775** of the chain.

This is an actual source moving-R contact/planner rejection. The forefoot has unloaded but its early guard interpolation remains close to its prior world release anchor as the carrier advances. It does not receive a reach-validated moving-R swing/guard lifecycle; reach validation in ordinary gait swings does not cover this direct fore-guard path. Lowering speed, moving geometry, lengthening links, clamping the target or silently relocating the foot was not done. It is not evidence that preserved anatomical geometry or the native hull is globally impossible.

The last COMPLETE raw receipt is previous frame780 at6.5s: carrier source **[6.647914262,-19.95,0]**, yaw90degrees, speed **7.536349378m/s**, body amount **.023264116**. FR is already **UNLOADED_FORE_GUARD**, with reach ratio **.997693359**, not a planted contact. The exception preserves current actual hip/request/distance but only the PREVIOUS full carrier/chain receipt; current carrier/world target/all-chain observability is missing and must not be mislabeled matching-clock raw evidence. No reconstruction/native rerun was used to fill it.

The valid sampled prefix has **781 full raw receipts** and records maximum chain error **2.43219e-7m native**, requested/achieved target error **2.18515e-7m**, planted sole slip **1.61352e-6m**, and yaw error **4.60216e-7rad**. These narrowly show that the earlier29.5m per-bone carrier explosion is absent in this prefix and that earlier quad/turn samples were retained. They do not qualify a complete circuit or source supports. The first original head/new-armor obstruction was not witnessed before this early-R rejection; full R/upright clearance was **NOT REACHED**, and static rendered postures do not certify its resolution.

## Unadmitted remainder and runtime replacement boundary

Moving R, reverse, upright cruise, obstacle, R cancellation, supported recovery and new root-free named clips were NOT completely qualified. The circuit is intentionally partial. Export retains all older actions, including the failed skinned001 diagnostic and unqualified pair/tackle/climb/react/air actions; the new scene FPS120 also changes the exported timing interpretation of those old60FPS actions. This GLB must not replace the live asset or imply repaired legacy clips. No native/full moving-body proxy/mass/reaction/terrain/guest/ordinary-two-client gate ran.

Native authority would have to supply support pose/normal/owner/revision and full-paw/full-hull queries, committed carrier motion and contact loss/wake events. Runtime locomotion/R admission would replace the current mixer-distance phase, terrain/body lean, locomotion paw IK, look/tail pose writes and R/rubble contact disabling with one causally valid owner; merely swapping a GLB URL or profiles leaves competing owners. Strike/climb/pair/reaction states remain separately unqualified. The same finite1800kg source partition from skinned001 is retained as an approximation; no newly calibrated native chassis or force solver is claimed.

Result: complete unchanged geometry and a preserved failed source planner, CLOSED/UNADMITTED. The identified next issue is moving-R fore contact choreography and its causal boundary, plus the exposed root-basis convention and still-unreached clearance/support gates. No automatic new candidate, profile repair, renderer migration or public release is authorized by this packet.
