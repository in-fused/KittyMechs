# Actual-pawn art preview: independent review

Reviewed 2026-09-26. Actual PNGs and runtime receipts:

- Pounce: `Artifacts/Validation/RenderSmoke/20260926-193541-057-26e651d330ae4a2b9db1d216e15fc40f/`.
- Bastion: `Artifacts/Validation/RenderSmoke/20260926-193809-925-50934af4c573440aabe7f428ab69abe2/`.

Both are opt-in EditorGame D3D11 renders at 1920 × 1080 / UI scale 1, with exit code 0. These are not packaged art or moving gameplay tests.

## Measured integration

The actual selected chassis, canonical mesh and corresponding Idle/Walk clip paths are correct. Both use `UKMPreviewAnimInstance`, forced canonical LOD0, relative yaw -90 degrees, local imported forward transformed to actor +X, and measured offset approximately +4 cm. Imported heights are 384.151 / 384.176 cm; scales 0.650786 / 0.650743 produce the stated experimental 250 cm fit.

Both receipts retain capsule radius 62 / half-height 125 cm and the existing camera: FOV 85, boom length 720, socket offset (0,105,110). Actual idle speed and Walk weight are zero; animation updates reached 272 Pounce / 285 Bastion. This proves initialized, updating idle presentation on the real stationary pawn, not an actual moving Idle-to-Walk transition.

## Visual disposition

The skeletal mechs replace the primitives coherently, remain upright and forward-facing, and fit inside the current camera frame without obscuring the crosshair or HUD. Tail versus left shield and larger shoulders distinguish the two chassis. Materials are visible without exploded parts. Accept those properties as diagnostic integration evidence.

**Default gameplay-art activation remains unaccepted.** There is no clearly visible mech ground shadow in either frame even though the station's ground shadow is visible. Combined with the known vertical offset and normal capsule floor gap, this makes the feet appear disconnected from the ground. Diagnose actual component shadow flags, render bounds and relevant light/physics-asset behavior before attributing a cause. Installed `Character.cpp` already defaults its mesh's dynamic-shadow flag to true; adding a guessed flag without measurement is insufficient.

The rear torso is a large, plain plate whose small details read like a face/mask. The pilots are not visible from the normal rear gameplay camera. Do not rotate the mech backward to expose the pilot; future art needs deliberate rear silhouette/detail and other appropriate pilot views. Both bodies still share similar arm/torso shapes, and this camera does not establish the intended premium art quality.

The known +4 cm compromise and rate-1 slow gait remain explicit. These stationary screenshots cannot approve ground contact, movement speed matching, turning, weapon alignment, shield effects, combat/downed/aerial poses, collision clearance or automatic LOD transitions. No gameplay tuning or canonical mesh changes are justified by this static review alone.

Pounce capture occurred after 5.033 world seconds but 33.247 wall seconds; Bastion after 5.035 / 13.826 seconds. Startup/loading costs are visible in that discrepancy. These offscreen diagnostics support neither seamless startup nor a frame-rate claim. Preserve the flag-off graybox baseline and keep preview opt-in while the remaining issues are investigated.

## Matched flag-off comparison

Independently viewed `Artifacts/Validation/RenderSmoke/20260926-193957-493-2029f40b901b4b37b22ef9a2b3f4c614/render-smoke.png` and its runtime receipt. It confirms `art_preview_active=false`, original Pounce primitives, the same 1920 × 1080 / UI scale 1 opening view, and a technical PASS. The graybox has soft darkening beneath its feet but no clearly resolved directional mech-shadow silhouette either. The large station shadow remains visible.

Therefore the missing resolved shadow is **not isolated to the skeletal preview**. This comparison supports intact flag-off presentation and a broader small-caster/scene-shadow diagnostic; it does not prove a defective skeletal asset, missing physics asset, or shadow flag. The preview's offset/foot-contact issue remains independently measured, but should not be conflated with the unresolved scene-shadow cause. Investigate matched actual component/light settings and vary one relevant shadow setting at a time before choosing a fix.

## Explicit sun orientation, actual comparison

Viewed Pounce baseline `RenderSmoke/20260926-201559-429-728b888498064890a065ab102e955e6c` and corrected `RenderSmoke/20260926-203502-128-c2f9b96627564e29954b4a4dbbf63ffa` PNGs and compared receipts. The single explicit world-rotation line corrects measured light direction from (0.031,-0.016,-0.999) to (0.656,-0.349,-0.669). Installed native directional-light root pitch explains the prior spawn-composition mismatch. Camera position/rotation, 170.412398 cm skeletal bounds radius, casting flags and all recorded shadow CVars agree between runs. The station's face and trim illumination change visibly.

Accept the actual orientation correction. A clearly resolved mech ground-shadow silhouette remains absent from the corrected view; foot contact/art activation are not approved by this change. No shadow-distance, resolution, bias or other CVar changed in this comparison.

The separate staged RenderClock correction is accepted for native compilation: watchdogs start at the first actual controller tick while receipts retain initialization-to-first-tick delay and total initialized wall time. Five/ten seconds of both actual ticking wall time and simulated world time are required for capture/exit, and the external default 120-second process bound remains. This prevents a measured 39.53-second pre-tick asset-registry stall from consuming nearly all diagnostic ticking time. It does not hide startup latency or establish performance. Native execution of the revised clocks remains pending.

## Actual distance comparison and clock validation

Independently viewed baseline `RenderSmoke/20260926-205331-230-f5265759cbfb4581aa8b28671997a0ef` and experiment `RenderSmoke/20260926-205543-612-25376d91550e4588bfed28105d492377`. Executable/module hashes and all 54 Content/Config/project inventory entries agree. Baseline receipt lineage and both PNG hashes verify. The only differing recorded shadow control is DistanceScale, 0.7 versus 0.2; animation phases are recorded but not locked.

At 0.2 a visible pawn shadow appears, but it is broad, blurred and visibly detached from the feet. Strong irregular dark banding also appears under the station roof trim. This supports a distance/projection contribution to the missing shadow. It does not approve 0.2 for production, prove exact atlas/bias causation, resolve measured foot-contact gaps, or establish distant shadow coverage or runtime cost.

The new first-tick clocks also have actual evidence: baseline startup delay 47.956 seconds, capture/exit ticking-wall 5.032/10.127 seconds; candidate startup delay 6.356 seconds, capture/exit ticking-wall 5.028/10.291 seconds. Both retain total initialized-wall timing and satisfy the five/ten simulated-second gates and clock arithmetic within rounding tolerance. Accept the bounded diagnostic clock correction, while retaining the long baseline startup as an unresolved runtime experience issue rather than a performance pass.
# Editor24 conventional profile: independently viewed

Baseline `Artifacts/Validation/RenderSmoke/20260926-213144-791-cd40ad3cb5b948fa988a47db32fdf3c1` and candidate `20260926-213328-570-9d36daf72bce47218c9fa1f0a1b4e424` both exited 0. Independent checks confirmed identical executable/module hashes and 54-entry input inventory, the recorded baseline receipt hash, and both PNG hashes. The only changed recorded shadow observations are MaxCascades 1→3, MaxCSMResolution 1024→2048, DistanceScale .7→.35, and TransitionScale .25→1. This is a coherent four-control profile comparison, not single-variable causal evidence.

Both full PNGs were viewed. The candidate visibly resolves the two legs and broader body/tail silhouette on the ground, with much stronger near-foot grounding than the baseline. Roof-edge shadow stair stepping remains conspicuous; the existing +4cm art offset and idle foot float remain uncorrected. This is sufficient to proceed to bounded graybox/Bastion and near/mid/far traversal comparisons. Another static Pounce parameter search is not warranted first. The candidate is not approved as a production default, AAA art, or a performance improvement; movement/cascade transitions and measured frame cost remain open.

The first-tick clock retained startup delays of 35.059s and 7.381s. Captures occurred after 5.031s and 5.020s of ticking wall time; exits after 11.608s and 10.417s respectively. These support the bounded warm-capture lifecycle, not fast-startup or frame-rate claims. Animation phases were retained and are not identical, so exact pixel equivalence was neither required nor claimed.

September27 update: Package16 now uses these canonical models in normal gameplay under the later gameplay-first priority. See mech-model-gameplay-batch.md for actual co-op, packaged Pounce combat/recovery and Bastion static evidence. This supersedes the historical opt-in-only disposition for prototype gameplay use; it does not accept final art, ground-contact polish or performance.
