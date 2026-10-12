# Contact098 — isolated attached-skin lifecycle candidate

Writer CLOSED. Exactly one bounded candidate derived from immutable rejected093; no active game/test files were edited. No fixture execution, test/build/browser/Blender/background jobs or additional agents ran. Active067 remains exact047 SHA7d2f017354391143d497f797f12acfa649e703cbcf709b21160499f7dbbd5a61; live048 remains LIMITED. Parent alone may admit/apply after the independent High source gate. Rejected093 remains untouched.

## Causal proof from installed Three

Installed `Object3D.updateWorldMatrix` updates ancestors and descendants by calling their updateWorldMatrix methods. It does not dispatch updateMatrixWorld. Installed SkinnedMesh overrides updateMatrixWorld, calls its superclass, then refreshes bindMatrixInverse from CURRENT matrixWorld for AttachedBindMode (or the immutable bindMatrix for DetachedBindMode). applyBoneTransform subsequently computes each weighted bone.matrixWorld * skeleton.boneInverses with bindMatrix, then applies that cached bindMatrixInverse. localToWorld applies current mesh.matrixWorld.

For attached skin, the expected current mesh.world * inverse(current mesh.world) pair cancels. Rejected093 could instead record current mesh.world * inverse(previous mesh.world) * current weighted bone/bind result. A translated/rotated carrier thus changes the recorded skin point even though bones are current and the underlying solve can be correct. Later camera/render refresh cannot fix stored arrays. Constructor sampling had the same lifecycle risk if the cloned actor graph had moved since its prior binding refresh. Closed094 identifies exactly this provenance blocker;097 confirms093 was rejected and047 restored before integration.

## One correction, inherited task-space design

Candidate exports `refreshSkinPose098(model)`: first model.updateWorldMatrix(true,true) establishes current ancestors, mesh transforms and bones, then model.updateMatrixWorld(true) dispatches Three's normal attached-skin inverse refresh throughout that current graph. The constructor calls it before ANY geometry sampling. The final eligible frame calls it once AFTER ALL four limb solves/restorations and BEFORE building diagnostics and calling skinWitness. No sampling of a foot occurs between a later correction and this final refresh. Ineligible/air/source-action frames return no skin-witness rows.

This refresh does not rebind or write bindMatrix, skeleton inverse binds, source translations, scales or geometry. It updates the engine-managed attached inverse cache using the renderer's standard implementation. It adds one bounded hierarchy refresh after final poses; no additional vertex scan or renderer/GPU loop is introduced. At most five cached extrema per foot, twenty actual skin vertices per actor/frame, remain the093 limit.

All093 contact rules/tolerances are inherited unchanged: world task interpolation before exact fixed-length IK, no final joint quaternion slerp, source knee/hock pole and paw twist, authored normal-direction release/lift, explicit touch/release/unloaded states, full endpoint authority plus <=1e-4m rigid-marker residual for stance, existing .03m seed/.06m reach margin/provider rays and normals. Valid plants survive gait-band name changes when the new authored phase still declares stance. Source/native action ownership and transform core are untouched.

Diagnostics preserve pre-source, commanded task, post-solve rigid marker, effective weight and every leased mode's anchor residual. Current final-bone/bind skin subset witnesses now have the explicit same-frame inverse lifecycle. They remain CPU render-equation witnesses, not GPU readback or native pad/force/balance certificates; fullFootEnvelope remains false. The rigid marker remains the solve endpoint. Articulated skin-subset penetration or poor visible motion can still reject this candidate even with exact rigid residuals.

## Focused fixture source — UNRUN

`candidate-test-contact-skin098.test.ts` is intended for parent-admitted `tests/contact-skin098.test.ts`, importing the admitted owner at ../src/game/entities/movingRFfeet067. It intentionally cannot test active047 before that admission. Candidate owner retains its original ./groundSupport067 type import, intended for its admitted src/game/entities destination.

Two directed tests use actual installed Three SkinnedMesh binding, two genuinely weighted bones, separate mesh and carrier transforms and toe articulation. An independent attached-world render-equation oracle computes weighted bone/bind positions without reading bindMatrixInverse, calling applyBoneTransform or refreshing/recalculating bindings. The first test requires the old updateWorldMatrix-only path to disagree by >.5m after carrier translation/rotation/scale, then requires the corrected lifecycle to agree within1e-10m. The second changes final carrier/toe transforms repeatedly without any render and requires current samples to agree each time. Both preserve original bindMatrix, bone inverse binds and source joint translations. These tolerances test matrix lifecycle/identity, not altered contact thresholds. No source-string checks or geometry/contact waiver is present.

This fixture tests the canonical lifecycle helper and actual skin equation; independent source review must also inspect its constructor/final-diagnostics call order. It is not a full gait, pad-envelope, native-contact, source asset or performance test. No result exists and no pass is claimed.

## Proposed finite admission only

Independent High source gate may reject candidate/fixture. If admitted, parent applies ONLY candidate owner and directed test, preserving048/047 rollback. One directed test command; first failure stops. At most one combined integration/build/freeze and one ordinary Low public forward/reverse gait/R-up/R-down capture with matching source/task/skin telemetry and actual video/PNGs follows a separate observer gate. No new baseline/profile/camera/standard scope, threshold tuning or automatic second candidate. Actual visible foot/joint motion, plants, skin gaps/slip and fluid R remain decisive. Parent's closed observer is tools/overhaul-contact-play-100/capture.mjs; this writer neither read nor changed it.

Remaining inherited risks: short horizontal release modifies source joint pose while retaining authored normal lift; transfer/replant and gait-band continuity remain visually unqualified; source rigid marker may differ from the articulated plantar surface; cached extrema do not cover every digit/action. One extra hierarchy traversal's cost is unmeasured. Correct inverse freshness alone cannot establish convincing contact or full Gate1. Actual IAB lag remains unresolved.

## Exact closed files

Candidate owner: candidate-movingRFfeet067.ts, SHA282973c14b956985e72f2714c62079a3651f440eb15f8347288c2ead5dda5ccd.

Candidate test: candidate-test-contact-skin098.test.ts, SHA780857aee12fa11de1ea9b0ba86b5a062c99114f0858f77d20c609779730662b.

047 preimage is preserved under preimages/movingRFfeet067-047.ts; immutable093 input and reviewed094/097 copies are under inputs. source-seal.json records exact input/output sizes and hashes with writer CLOSED. Active067 is deliberately excluded from sealed files because only parent may subsequently apply the admitted candidate; its exact047 preimage is sealed instead. Writer098 CLOSED; no jobs remain.
