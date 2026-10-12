# Pounce overhaul v1 candidate contract

This is a locally authored candidate with editable Blender source and a separate GLB. The retained Pounce master and shipping model are preserved byte for byte. Camera snapshots verify visible authoring and posed anatomy; they do not establish runtime acceptance or replace real match captures.

Source: `assets/source/overhaul-pounce-v1/Pounce_Overhaul_v1.blend`. Authoring script: `tools/overhaul-author-pounce.py`. Shipping candidate: `public/assets/overhaul/pounce-v1/Pounce_Overhaul_v1.glb`. Exact measured dimensions, pivots, clip events, sampled geometry bounds, original hashes and export validation are in `asset-receipt.json`, `pounce-contract.json`, and `export-validation.json`.

## Geometry, axes and rig

The model replaces the old box exterior with longitudinal curved armor lofts, separated flank and dorsal plates, shoulder/hip seams, exposed concentric joint collars, launch turbine vanes, anatomical palms with four jointed-looking armored digits and hooked claws plus dewclaws. The toes and claws are rigidly bound to the paw bone; individual finger animation is outside this candidate. A tiny amber feline pilot and canopy retain the established design cue.

The original 25-joint layout is retained. Root origin is `(0,0,0)` at the floor; no root rotation or translation is authored. Blender uses metres, +Z up and -Y forward. Export uses +Y up and +Z forward. Reuse the established GLTF loader orientation rather than adding a new correction. Recommended whole-actor scale is `0.8`, matching Pounce. Rest source bounds are approximately 2.20 m wide × 5.90 m long including the tail × 2.46 m tall; the JSON is authoritative. The rest mesh starts 0.034 m above the floor. At scale .8 this gives roughly 1.76 m width, 4.72 m full length and 1.97 m height. The upright head/ear envelope is taller; use evaluated clip bounds for clearance.

Retained pivots (source metres): pelvis `(0,.78,1.55)`, spine `(0,.104,1.60)`, chest `(0,-.624,1.70)`, head `(0,-1.144,1.80)`. Shoulder pivots are `(±.73,-.9152,1.70)`; rear hip pivots `(±.73,.936,1.60)`. FL/FR paws start `(±.73,-1.04,.18)`, HL/HR `(±.73,1.0192,.18)`. Leg bones use `FL`, `FR`, `HL`, `HR` prefixes with `_upper`, `_lower`, `_paw`. Tail has five `tail_0`…`tail_4` links. Weapon joints remain `weapon_L`, `weapon_R`, `launcher`.

Armor is rigidly weighted to single joints. Named `part:*` vertex groups in the editable blend identify separate armor components. These helper groups do not add skin joints. One exported mesh uses eight PBR materials, no external texture fetches, and meshopt compression. The loader must register `MeshoptDecoder`. Rendering requires ordinary dynamic lighting; no baked room lighting is embedded.

## Authored motion and pair integration

| Clip | Duration | Runtime use |
|---|---:|---|
| `PounceTransformUp` | 1.0 s | Continuous quad-to-upright articulation; forepaws fold into guard, pelvis stays supported |
| `PounceTransformDown` | 1.0 s | Continuous reverse articulation |
| `FelineRearLaunch` | .90 s | Rear load .216 s, extension .270 s, takeoff .360 s, airborne .522 s |
| `FelineLandingRecovery` | .60 s | Contact at 0, max compression .30 s, locomotion ready .60 s |
| `FelinePairImpactAttacker` / `Victim` | 17/60 s (~.2833) | Opposed quad roots; shared contact at 7/60 s (~.1167) |
| `FelinePairPinAttacker` / `Victim` | .80 s looping | Forepaw clamp and low victim posture; shared breathing cadence |
| `FelinePairReleaseAttacker` / `Victim` | .35 s | Release at 0; restored quad posture at .35 s |
| `PounceTackleAttacker` / `Victim` | 1.50 s | Optional complete demonstration; shared contact .72 s, release 1.17 s |
| `PounceClawAttacker` / `Victim` | 1.10 s | Experimental source-only upright strike; excluded from shipping GLB because victim paw support dips below floor |

The phase pair is authored at 60 fps. Its nominal .28-second request rounds to 17 frames; use the actual GLTF clip duration or normalize its playback into the authority's .28-second impact phase. The authority can use its .12-second impact notification with this minor frame rounding. Pin and release durations are exact.

Authority owns phase, roles, contact notification, root anchoring, escape/interrupt/life/support cancellation and damage. Both actions sample the same authoritative elapsed phase time. Suppress procedural paw contact overlays during paired motion, clear old action weights, and use a short ~.06-second crossfade into release. Pin loops seamlessly; play impact/release once and clamp the final frame. If pair entry happens upright, complete transformation before applying quad pin actions. The experimental upright strike stays editable in source and is excluded from the shipping candidate after its victim floor failure; it must not be selected by runtime.

For the quad pair, place victim root `3.2` source metres forward from attacker, yawed π toward attacker. This becomes `2.56` world metres at scale `.8`; in GLTF local coordinates the offset is `(0,0,+2.56)`. Keep authority roots fixed during pin. The skeletal clamp supplies forepaw placement. Root translation for launch flight, ballistic arc, collision sweeps, and target approach belongs to authority; clips author anticipation and limb articulation only. Do not trigger damage from visual bone overlap. Derive collision hulls from torso/pelvis, excluding tail, whiskers, claws and weapon barrels.

Retained source clips include quad idle/walk/trot/gallop/turns/air/cling/climb/mantle, upright idle/long walk/stride/turns/air and combat base/pulse/missile/hit/death actions. Their exact names and durations are in the JSON. This candidate does not certify inherited locomotion under terrain, network correction or every mixture; those require the root-owned match review.

## Provenance and bounded review

All new geometry, material values and new skeletal actions are generated locally by the checked-in Python script. The retained rig and selected motions come from the existing KittyMech Pounce editable master, whose hash is recorded. No purchased assets, external API generation, Unreal import, training runs, downloaded textures, or third-party content are used. No new license dependency is introduced.

Six ordinary perspective camera PNGs show quad, upright, transform midpoint, rear load, airborne release and synchronized paired contact at 640×480. The first authoring pass revealed compounded parent translation in launch; the one correction pass captures core matrices before applying each translation and also tightens the feline ear silhouette. Candidate status remains pending browser integration and real gameplay review. Regenerate with the installed Blender binary, then run `node assets/source/overhaul-pounce-v1/optimize.mjs` from the repository root.
