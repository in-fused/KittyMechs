# Foot contact093 — one source-only candidate

Writer CLOSED. One bounded implementation of diagnosis091. No tests, fixture/build/browser/Blender/background jobs or additional agents ran. No second candidate or quality claim. Live047 was untouched; the parent may freeze a combined048 candidate only after independent source review. Changes are confined to `src/game/entities/movingRFfeet067.ts`. Owner005, Actor, camera, native movement/action authority, assets and parent's report092 files were untouched.

## Concrete mechanism changed

The final correction previously solved a world target and then interpolated each joint back toward source, destroying its endpoint constraint. The candidate constructs the world endpoint BEFORE solving: source marker interpolates toward its touch/swing/support task using the existing .12s acquisition/release time with smoothstep. It then solves the final target with full endpoint authority, preserving existing source knee/hock pole and paw twist/normal alignment. No post-solve quaternion blend remains.

The task point cannot cross below its reserved support plane. An explicit release retains the source marker's motion normal to that plane, so actual authored gait/R lift remains the lift owner while horizontal correction transfers away. On unreachable or nonfinite/residual-failed solves, the source pose is restored where needed, contact stays unplanted and a reason is recorded. No source bone translations/scale/binds or chain lengths are changed; no native carrier compensation, whole-body freeze, upper-body recoil or additive action fallback was introduced.

`touch` means an acquiring world endpoint; `release` means transferring back toward source; `stance` is assigned only at full task authority with rigid endpoint-to-anchor residual <=1e-4m. The new 1e-4m criterion is a tight computational endpoint check, not a loosened support threshold. Existing .03m source seed, support ray/normal, source duty/offset and reach criteria remain unchanged. Procedural idle/turn/R rear recovery retains its existing reach/travel planner and timings; this pass changes the final contact task, not all unmeasured footfall choreography.

Valid planted anchors survive gait-band name changes when the new source phase still declares stance. The new phase's authored swing releases them; a swing handoff discards its former pending procedural target. Fore R unloading is explicit release/unloaded and is never called planted at partial control. Its reserved support can guide horizontal release; source normal-direction lift remains authored. Once fore control is fully restored during R-down/quad, the existing near-floor probe seeds a new touch task rather than relabeling an unloading foot as planted.

## Error and skin provenance

Each row now distinguishes sourceMarker/sourceError (before correction), taskTarget/taskError (commanded endpoint and final rigid-marker residual), effectiveWeight, and final marker/error against its support anchor. `error` is reported whenever a lease exists, INCLUDING touch/release/procedural swing. This intentionally broadens the old stance-only field: reviewers must filter by mode when judging plants and must not interpret expected airborne/releasing anchor distances as stationary contact errors. Large transfer distances stay visible instead of disappearing under a stance label or hidden control multiplier. The support lease remains a fixed client-scene support reservation; it is not a native foot-contact certificate.

Constructor caches at most FIVE extremal indices per foot from the original source lowest band (x/z extrema and minimum y), with their actual mesh, geometry and original position. Each final frame skins at most20 selected vertices per actor using Three's current final bone.matrixWorld/inverseBind and mesh bind pair, then samples world positions/support-plane normal gaps. `CURRENT_FINAL_BONE_BIND_SKIN_SUBSET` explicitly names this provenance. The local Three implementation was read to verify that applyBoneTransform uses those current matrices directly. This matches the skinning equation; it is not a captured GPU palette/readback. UUID/index fields identify each sampled vertex.

The subset follows articulated toe/claw bones with actual skin weights and keeps rigid-marker error separate. `fullFootEnvelope:false` is explicit: constructor lowest-band selection does not guarantee the entire pad/claw envelope remains lowest in every action, and no per-frame all-vertex scan is added. Skin points are witnesses, not inputs to the rigid-marker solve in this candidate. A tight rigid-marker plant can therefore still be rejected for skin penetration/slip or poor visible limb motion. No semantic plantar-patch/material classification or native contact/force/balance proof is invented.

## Remaining limits for independent gate

No typecheck or runtime verification has run. The independent critic may reject source outright or reject actual ordinary play despite passing checks. Review task-space release continuity under fast gait-band switches, exact rigid-marker endpoint feasibility with the retained rear hock model, fore touchdown timing near R-down completion, authored swing clearance and stationary idle/turn behavior. Release keeps authored normal lift but transfers horizontal limb correction for up to the existing .12s; it is therefore not identical source joint rotation during that short transfer. After release, full source swing resumes. The measured gait phase/signed travel remains owner005's existing implementation.

The endpoint is still the original constructor-derived rigid source marker. The bounded skin witnesses make its limits observable; this pass does not silently claim that a solved marker equals a solved plantar patch. Full physically convincing contact remains subject to the skin/visible review. Unreachable transfers can still visibly return to source; this is explicit, not qualified natural motion. Gait-to-idle/turn and R source handoffs, actual client costs and lateral travel remain unqualified.

Parent gate should use ONE integrated ordinary public-input candidate capture with unobstructed forward/reverse in both stances, acceleration across existing bands, stop/resume and moving R both ways. Capture source/task/final endpoint distinctions and actual small skin witness gaps with coherent owner clocks; judge visible leg/joint lift, real plants, pad/claw clearance and fluid R. A renamed mode or smaller rigid scalar alone cannot accept it. Keep047 fallback and all original evidence. No follow-up candidate loop is authorized by this handoff.

## Exact source closure

047 preimage: `tools/overhaul-foot-contact-093/preimages/movingRFfeet067.ts`, 15768 bytes, SHA256 `7d2f017354391143d497f797f12acfa649e703cbcf709b21160499f7dbbd5a61`.

093 candidate: `src/game/entities/movingRFfeet067.ts`, 19274 bytes, SHA256 `f665944a4fe366a45eab1d82916947f0d2709521b85733686c79d3d43cd1bce4`.

Exact owned/preimage/read-dependency hashes are in `source-seal.json`. Sourceinspection only; no check receipt exists. First failed source/check gate must stop this candidate rather than trigger an automatic second attempt. Restore only the owned preimage if rejected. Writer093 CLOSED; no writer jobs remain.
