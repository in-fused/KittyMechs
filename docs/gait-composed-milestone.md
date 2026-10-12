# KittyMech composed quadruped gait milestone

2026-10-06. **Private animation progression; shipping gait adoption remains pending.** The source change in this iteration adds read-only reach diagnostics. All four public models and current gait selections remain unchanged. The original Unreal project is read-only, the friend build is unchanged, durable hosting remains deferred, and the continuous goal remains active.

## Production diagnostic change

`pawContact.ts` now records `requestedReach` and `ikClamped` immediately before the existing `applyPawIK` call. The solver mutates its target to fit joint limits; post-solver `reach` alone could hide an unreachable request. The new helper reads the existing hip/target/segment lengths and writes only diagnostic scalars. It does not change the target, pose, root, anchor, query, input, animation selection or physics.

`Actors.tsx` clears these values on every completed contact frame, including skipped paws. Zero/false defaults are not proof that a solver ran. Existing detached contact snapshots carry the scalars without exposing the pooled registry. Tests exercise an actual solver shortening an unreachable target, preservation of the original request, detached copies, an inner joint limit and a subsequent reachable request.

Fresh checks: **157 tests in nine files passed**, followed by lint, typecheck and Vite build, all with recorded numeric-zero terminals in `.sites-runtime/quad-composed-contact-001/root/checks-001`. This is focused qualification, not a new full native suite pass. The previous experimental physical-rubble grounding failure remains unresolved.

## Why the first fluid clips were rejected

The previous private cubic clips reduced isolated paw velocity discontinuities, but their standalone reach checks did not cover actual carrier/aim/additive/contact composition. Root built a small execution shell around the exact Actor callback, actual render timeline, mixer/effects, cloned skeleton/carrier graph, current paw-contact functions, real Rapier static planes and final camera matrix update. Only candidate clip names and measured stance-sweep calibration change in the private variant. Shared observers read the requested target before the solver can clamp it.

The first 24,000-frame fixture exposed a new Bastion slope-gallop request of **1.00845 times leg length**, with ten clamps versus baseline zero. Pounce, Lynx and Caracal also had inherited baseline clamps; those were retained separately and did not excuse the Bastion regression. The initial air counter used the new synthetic state while the render timeline still presented the prior grounded frame. The successor uses the coherent presented diagnostic state; its airborne-anchor count is zero.

The expanded successor includes actual gait weights/phases, additive pulse/missile/ability/hit layers, stop/turn, jump/landing, both transformation directions, held presentation, reset, death and respawn. These are synthetic authority states/timestamps, not native controls or accepted feline-strike events. It retains continuous mixer/contact/timeline state and inspects all eight paw-bound corners, including unplanted transition paws. Caracal exposed **1.289 mm**, then **4.006 mm**, of raw transformation penetration in intermediate candidates despite passing strong-plant checks. Both failed attempts remain.

## Private source refinements

The specialist authored deterministic animation-only successors using installed Three/Meshopt. Each retains the old 32 actions, graph, graphics/binds and old BIN prefix, then appends three periodic cubic clips. Existing editable Blender sources remain lineage references; the new Node author scripts and pose-key JSON are the procedural authority for these refinements. They are not newly saved Blender scenes.

The source revision lowers the pelvis within the existing **.14 source-meter total cap**, then re-solves fixed-length chains to the original paw trajectories with the original knee branch and world paw rotation. Duties, footfall order, swing height and stance sweep remain unchanged from the private cubic proposal. Fresh closure/reach/retained-action guards pass. A failed first sampling implementation restored bind poses despite Three's skipped unchanged writes; that failed attempt is retained, and its successor uses restore/mixer/capture ordering.

Calibrated source-world paw clearance is 12 mm divided by chassis scale for Pounce/Bastion/Caracal and 40 mm divided by scale for Lynx. These are authored reference-frame offsets. Carrier rotation/lean/settling means the final game world-Y difference is not guaranteed to equal those numbers. Final corners and actual visible planting/floating still decide admission. No sweep reduction or source cap increase was used.

The final private manifest is `.sites-runtime/quad-composed-contact-001/mechs/refined-004/manifest.json`; its three unchanged rows refer to exact refined003 files, while Lynx has one fresh model. Root's additive `latest-private-candidates.json` records actual byte deltas and author paths: inherited `addedBytes`/`editable` labels in specialist manifests belong to the earlier proposal and are not final transport-size/current-editable claims. Old manifest wording about literal runtime-world offsets is superseded by the reference-frame explanation above; no closed evidence was rewritten.

## Final early fixture result

`root/trial-005/report.json` contains **29,760 composed render frames across 16 traces** (four chassis, old/new variants, flat/slope). All **119,040 render-diagnostic paw slots** match the independent pre-solver observer or their unevaluated zero/false defaults. This is not 119,040 native-authority comparisons or solver invocations.

For the eight candidate traces, maximum requested reaches are below .98: Pounce .97923, Bastion .96173, Lynx .97992 and Caracal .97777. There are zero recorded clamps, strong-contact errors, invalid full plants, nonfinite joint coordinates or presented-air anchors. Every sampled final sole corner clears the actual fixture plane; the minimum is approximately **3.99971 mm**, with disclosed float32 ray arithmetic. Strong plants stay below the unchanged .04 m slip/.015 m sole-error gates, rigid segment drift stays below one micrometer, knee branches remain aligned, and production query budgets stay at twenty quadruped/ten upright rays per actor/frame.

The fixture uses synthetic local authority actor frames at 60 Hz and simple real static planes with a disclosed synthetic radius-based slope-floor offset. Materials/textures are stubbed. It does not qualify native KCC movement, rendered appearance, physics cadence/FPS, guest/transport behavior, climb/retraction, accepted pounce/tackle/dive, hitches/reversals/strafe, every mixed phase, roof/edge/half-step/support-removal cases, all maps or hardware. The held-paw displacement statistic includes idle breathing/aim/settling and is not isolated gait phase travel. The actual installed decoder is `meshoptimizer/index.js` → `meshopt_decoder.js`; final binding includes those bytes. Older filtered `.mjs` bindings are retained as incomplete historical instrumentation.

## Required next admission work

Use the final private clips with the actual native movement and local/guest R3F paths. Measure continuous contact and visible gait cadence/foot floating, including interruption, held/jittered arrivals, transformations, strikes, climb/retraction and life changes. Assess exact source-tagged posed physical hulls, armor/guard versus moving limb intersections, knee clearance and all relevant structural support cases. The specialist's classification lineage tables supply verified Lynx/Caracal vertex indices and Bastion physical part IDs; unknown Pounce vertices remain conservative until a source-index lineage exists. Do not substitute central-bone cosmetic supersets for physical-hull proof.

The appended animation payload remains about 1.4 MB per rig and needs download/decode/frame-cost qualification. No new paid Higgsfield generation or dependency migration was performed. Existing motion references remain style guidance, not animation transfer or rendering proof. Independent critic review must approve any subsequent gait adoption and release; this iteration does not claim AAA completion, absence of regressions or universal traversal/destruction completion. All four formal release areas stay pending, physical rubble remains denied/default-off, and public deployment approval is false.
