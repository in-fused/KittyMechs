# First Unreal motion diagnostic: independent rejection

Reviewed 2026-09-26. Run: `Artifacts/Validation/MechMotion/20260926T184929534499Z/`, with `motion.json`, ten PNGs, and `Artifacts/Validation/mech-motion-01.log`. **Do not accept Walk animation, visual LOD correctness, or gameplay mesh activation from this run.**

## Evidence that survives the review

The script receipt contains 40 component bone-pose samples: nine LOD0 samples for each chassis/clip pair, plus two additional LOD samples for each chassis. Recorded actor/component rotations are upright yaw -90; local +Y measures approximately world +X. These are useful transform measurements, subject to the diagnostic's explicit 250 cm experimental fit, not approval to resize the authored 384 cm art.

Validation copies report three LODs with decreasing vertex counts: Pounce 31,053 / 19,189 / 11,438; Bastion 26,199 / 16,293 / 9,770. Every LOD records 12 material sections. This supports successful attachment of LOD data to those copies, not correct rendered transitions or silhouette preservation.

The 32 original package hashes match their recorded final hashes. This reviewer independently rehashed all 32 current original files; all still match. The executed script hash also matched the receipt when inspected: `7e2467f468219f97ca9535185c8be43e0e498ee88a43cb9d30e8a8bbdbdde81d`.

## Blocking motion finding

All ten PNG files are 1,173,227 bytes, but their independently recomputed SHA-256 hashes are different. Equal length is not evidence of identical pixels. Directly viewed Idle at 0%, Walk at 25% LOD0, and Walk at 25% LOD2: legs remain visibly standing with little apparent pose change.

The numeric measurements identify a stronger failure than file similarity. Across all nine Walk samples for each chassis, every thigh/calf/foot quaternion remains exactly unchanged. Foot position relative to pelvis changes by less than 3e-14 cm (floating-point noise). The apparent 0.783733 cm absolute leg motion is the shared pelvis bob, not a gait. Idle shows the same locked-leg behavior. The reported maximum 13.782671 cm Pounce Walk bone displacement comes from `tail_07`; a moving tail allowed the generic any-bone-motion check to pass.

Thus `sampled_pending_independent_review` is not animation acceptance. Determine whether the Walk asset contains the wrong imported action or component playback selected the wrong data before blaming capture alone. Add gait-specific evidence: changing thigh/calf rotations and relative foot movement at intended stride phases, correlated with actual rendered poses. Keep Idle and Walk identities explicit. A PNG hash difference alone is insufficient because noise or tail motion can change it.

Recorded sole-proxy penetration describes these sampled poses only; it cannot establish foot contact for an absent walking gait. Forced LOD index requests and vertex counts do not establish that the images show the intended animated LOD. Require visibly and numerically correlated pose/LOD evidence in a corrected run.

## Process outcome

Root reports process exit -1073741819 (Windows access violation), despite the log reaching normal shutdown text. This is an unresolved process failure; do not call the run cleanly completed. Preserve the diagnostic output and failure while investigating teardown separately. A receipt written before process exit cannot override its exit status.

Canonical art remains preserved and gameplay meshes should remain disabled. No additional generation or geometry revision is justified by this diagnostic failure alone.

## Corrected run 02: bounded animation/LOD evidence accepted

Reviewed `Artifacts/Validation/MechMotion/20260926T185830412512Z/motion.json` and actual Walk 25% images at LOD0, LOD1 and LOD2. Root reports clean process exit 0 for this run. Explicit assignment of the live single-node animation asset fixed the run01 clip-switch defect; each sample now records and checks the actual animation asset. Script SHA-256: `ee0cccb9296cf19381c3356ae47ff3dbe3a3682efb67089f48d2a5445428067b`.

Both legs now articulate: Pounce foot excursion relative to pelvis is approximately 38.811 cm and Bastion 38.809 cm, with approximately 34.250 degrees of thigh rotation on each side. Actual images show bent knees and different stride poses, consistent with this evidence. The three inspected LOD images retain coherent silhouette and materials without obvious exploded geometry at the displayed distance. All 32 original package files were independently rehashed and still match; LOD vertex counts match the earlier attachment evidence.

**Accept frozen editor Idle/Walk playback, measured upright facing and LOD attachment with one-view visual continuity as M0 diagnostic evidence.** This does not establish runtime animation switching, automatic LOD transitions, multiplayer animation, gun/cockpit fit during gameplay, or collision fit. At 250 cm height, visual widths are approximately 199 cm Pounce / 231 cm Bastion versus a 124 cm capsule diameter; armor can extend past collision protection.

Contact remains unresolved. Maximum sampled rigid sole-box penetration is 0.702 cm in Idle and 2.822 cm Pounce / 3.386 cm Bastion in Walk. These are proxy boxes, not measured skinned vertices. Raising the preview by 4 cm is acceptable as a reversible experiment, but nine phase samples do not bound the whole cycle, and a constant lift may create visible floating at other phases. Before default gameplay-art activation, perform a full-frame native clip contact check and inspect the actual gameplay camera/ground fit, including animation transitions. Keep the capsule unchanged and preserve the authored source models. A temporary offset must be documented as a prototype compromise, not a foot-locking or slope-contact solution.

## Full source-key run 03: contact compromise measured

Reviewed `Artifacts/Validation/MechMotion/20260926T191114746909Z/motion.json`, matched neutral/raised Walk frame 8 images, raised Idle frame 0 and raised Walk frame 23. Root reports clean exit 0. Reflected imported data-model grids are 24 fps with 60 Idle keys / 59 intervals and 32 Walk keys / 31 intervals for each chassis. Ordered key coverage is complete, including end keys. Neutral, LOD and raised comparison jobs now record matching source-frame indices. All 32 canonical files independently still match their original hashes.

Whole-source-key Walk maxima are 2.917 cm Pounce / 3.579 cm Bastion proxy penetration at neutral placement. Deriving a constant +4 cm lift gives minimum sole-box height 1.083 cm / 0.421 cm respectively at the checked keys. It also leaves both Idle feet visibly unplanted in the measurement: minimum 3.298 cm and maximum lower-foot clearance 4.781 cm. Walk lower-foot clearance reaches approximately 3.99 cm. These are sampled rigid-box measurements; neither between-key interpolation nor actual skinned soles and slopes are certified.

The raised images preserve readable mech poses and do not exhibit an extreme gap at this inspection camera, but shadows and image distance can mask small floating. **Accept +4 cm only as a reversible M0 preview compromise for subsequent actual gameplay-camera inspection.** It is not a grounded-animation fix and does not authorize default art activation by itself. Runtime transition, turn, slope and camera-fit evidence remain necessary; final art needs authored contact/foot locking rather than a permanent floating offset. Keep canonical geometry, clips and gameplay capsule unchanged.
