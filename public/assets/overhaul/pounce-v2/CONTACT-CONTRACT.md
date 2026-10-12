# Native contact contract — Pounce v2 candidate

This motion successor preserves the v1 master and the 25-joint Pounce bind. The authored roots remain stationary. Native collision spacing, actual model scales and actual enemy geometry determine contact targets. Rendered camera evidence and sampled tip-to-surface measurements support review; gameplay acceptance remains the root integration lane's responsibility.

## Runtime mapping

Use `animation-contact-manifest.json` → `capabilityMatrix` as the exact role/style lookup. Require a matching entry with `supported:true`; do not fall back to generic clips for a missing combination.

| Attacker | Victim | Root spacing | Attacker/Victim clip naming |
|---|---|---:|---|
| Pounce quadruped, scale .8 | Pounce quadruped, scale .8 | 3.5 m | `FelinePair{Impact,Pin,Release}{Attacker,Victim}` |
| Pounce upright, scale .8 | Pounce upright, scale .8 | 3.5 m | `FelineUprightPair{Impact,Pin,Release}{Attacker,Victim}` |
| Pounce quadruped | Scout quadruped, scale .65 | 3.2 m | `FelinePair{Impact,Pin,Release}{Attacker,Victim}Scout` |
| Pounce quadruped | Mortar quadruped, scale .8 | 3.5 m | `FelinePair{Impact,Pin,Release}{Attacker,Victim}Mortar` |
| Pounce quadruped | Anchor quadruped, scale 1.05 | 3.95 m | `FelinePair{Impact,Pin,Release}{Attacker,Victim}Anchor` |
| Pounce upright | Scout/Mortar/Anchor quadruped | 3.2/3.5/3.95 m | `FelineUprightAgainstQuadPair{Impact,Pin,Release}{Attacker,Victim}{Scout,Mortar,Anchor}` |

The NPC-specific Victim actions are quadruped even when the attacker is upright. Bots are not transformed. These NPC clips use the exact matching source bind; scale is applied by the renderer's carrier. Different bones, proportions, models, other player chassis, NPC attackers, mixed player/player stances, and arbitrary accepted separations are outside this candidate's capability matrix.

Impact is exported at .28 s, pin at .8 s looping, and release at .35 s. `actualExportClipDurations` provides the decoded GLB times. Blender's fractional-frame impact endpoint is normalized in packaging to authority time. Sample both roles using the same authoritative elapsed phase time. Contact is around .12 s; damage remains an admitted authority event, never visual bone-overlap inference. Release starts from the held pose and returns to each participant's original stance. The optional 1.05 s `FelinePairFallVictim` / `FelineUprightPairFallVictim` provide a supported collapse for root-authorized interruption/death; do not introduce an automatic fall outcome merely because the clip exists.

The source keeps `PounceTransformUp` / `PounceTransformDown`; packaging names these `FelineTransformUp` / `FelineTransformDown` to match the existing runtime action lookup. Both last 1.0 s. Root may normalize them to its configured stance transition duration.

## Contact and hull facts

At scale .8, rest Pounce's measured physical envelope excluding tail and whiskers is 1.776 m radius/front reach, 1.760 m width, 1.205 m rear reach and 1.996 m height. The native radius is 1.75 m. Preserve scale/hulls for this revision: shrinking root spacing to v1's 2.56 m would overlap the heads. A Pounce/Pounce diagnostic at 3.2 m is a shorter-than-native spacing test, not an accepted Pounce/Pounce contact arrangement.

Source axes are +Z up/-Y forward; GLTF axes are +Y up/+Z forward. Actors' existing carrier yaw π makes gameplay forward -Z. The audit places the attacker root at source origin facing -Y and the victim at `(0,-spacing,0)` facing +Y. Do not teleport either root to a baked pair offset. `createPair.offset` stores accepted actual separation; clip selection must respect the manifested spacing/model combination.

Quad forepaws clamp the actual victim muzzle/skull. Upright/Pounce claws meet the opponent's bracing forelimb at 3.5 m. Upright-against-quad NPC actions use a crouching torso advance and lowered claws matched to the NPC head; rear feet stay planted. Selected inner claw tips are aligned to evaluated opponent mesh surfaces. The manifest records each chosen surface point, source paw target, actual NPC scale, gaps, floor bounds and leg reach ratios. A tiny minimum gap does not certify every finger or eliminate all possible material overlap; inspect the supplied front/side and actual-enemy renders.

During committed paired phases, suppress procedural paw contact, head aim tracking, terrain pitch/roll, and carrier lean that would alter the measured head/torso contact pose. Preserve accepted roots, opposed facing yaw and identical participant phase times. Authority still owns support validity, escape, interruption, life epochs, release and damage. Non-flat support, large yaw misalignment or a separation outside the tested cell should cancel or decline the choreography instead of forcing a visual teleport.

## Editable source and bounded validation

Source is `assets/source/overhaul-pounce-v2/Pounce_Overhaul_v2.blend`, authored by the adjacent `author.py`. Raw GLB and kinematic/contact manifest are adjacent; `optimize.mjs` packages the meshopt candidate and publishes decoded clip durations/validation. Load with `MeshoptDecoder`.

V1 is untouched. Geometry topology and dimensions are retained; disconnected armor pieces receive consistent outward normals. All new actions are original local Blender authoring. No paid API, downloaded content, training, Unreal or license dependency is introduced. The editable source is git-ignored, so repository admission requires a targeted force-add if desired.

The bounded revision used two correction passes: preserve the upright tail's world-aligned quaternion and solve fall support after chest roll; then derive opponent-specific claw targets from actual Scout/Mortar/Anchor source meshes. No further correction is planned. Failed capability cells remain explicitly unsupported for root gating. Generic reuse was measured as inadequate: before targeting, Scout upright had roughly .32 m tip gap and Anchor roughly .27 m, despite shared rest binds.
