# Next playable mech art pass

2026-10-04. Planning only: current Pounce/city candidate remains frozen under final review. This note does not admit or publish it. Work stays in C:/Users/Taylor/Documents/GitHub/KittyMech-Web; the original Unreal repository remains read-only.

## Recommendation: Bastion, then Lynx, then Caracal

Begin Bastion only after the current release is approved. Its shield slabs, exposed spherical joints and plain reactor dominate both the actual portrait and rear camera. A recessed heavy shield/waist/shin construction offers the strongest contrast with the athletic Pounce derivative. Review one player at a time.

| Chassis | Original geometry/material direction | Retained motion identity |
|---|---|---|
| Pounce | Keep frozen swept brow, dorsal layers, exposed paw knuckles, faceted joints and segmented tail. Current muted green paint, warm trim and cyan eyes. Further refinement requires a concrete matched-view finding. | Athletic pelvis/guard lead and pounce/rake; upright source sweeps1.15/1.48m, duties.70/.57. |
| Bastion | Stepped paired shield rims, recessed paw-pad motif/backing, broad shin protection, protected brow, faceted hubs, resolved reactor fins and waist bearing. Keep chest shield mounts and rear stabilizers. Charcoal/petrol paint, ochre identifiers, bare edges and small cyan hardware. | Deliberate hip transfer/bulwark guard; sweeps1.00/1.18m, duties.78/.70, turn arc.28rad/duty.82. |
| Lynx | Narrow swept brow/collar, compact recessed guns, thin contour-following shin shells and open actuators. Keep long legs, fins, mast and antennae. Deep teal paint, sparse silver and restrained cyan. Do not thicken into Pounce. | Light counterbalance/fast running; sweeps1.40/1.60m, duties.68/.46, turn arc.44rad/duty.68. Retain authored brief double-hind release; fast cadence remains about5.3steps/s. |
| Caracal | Alert fitted cheeks/ear shells, stable shoulder/paw guards, distinct repair-cell cradles and protected caps. Keep six cells, tufts and drone dock visible. Ivory/orange, dark cradles and limited green emission. | Measured medic transfer/open repair gesture; sweeps1.15/1.38m, duties.74/.66, turn arc.34rad/duty.76. |

These source-meter motion values describe existing clips, not proposed speed changes. Art should expose load transfer and role gestures; it must not change animations, input or authority. A later cadence/turn revision needs a separate motion baseline and review.

## Movement and title-match gaps

The retained upright implementation already uses realized presented distance for long-walk/stride blending and actual signed angular travel for stepping turns; it does not advance a stopped network actor from elapsed time. The four new upright clips add pelvis/chest transfer, but the short mechanical hind legs still limit reachable sweep. Longer, more humanistic steps remain a direction rather than a completed quality claim: expose the hip bearing, separate waist/chest shells and guarded forelimb silhouette first. Evaluate deliberate low-speed weight acceptance and fast recovery independently. Lynx's roughly5.3steps/s fast gait is still quick; lowering playback rate alone would slide planted feet. Any later sweep/duty/turn change must preserve exact fixed segments and actual travel/contact timing, with its own all-chassis local/guest proof.

In quadruped form, the desired expressive feline line is a readable protected brow/ears, shoulder-to-hip taper, bent limb rhythm, distinct paws and articulated-looking tail sleeves. Current broad smooth shells and exposed spherical hubs weaken that line even when the animation is correctly sampled. Pounce now resolves some of those surfaces; Bastion needs a low heavy shielded cat silhouette, Lynx a narrow long-legged stalking outline, and Caracal an alert tufted medic with readable cell cradles. Armor should reveal the existing gait, crouch, leap and guard mechanics, rather than conceal joints or imitate human anatomy. More triangles or a title-style image cannot establish natural animation.

Title-match acceptance means retaining recognizable role, head/eye focus, layered armor, material separation and dorsal silhouette in the actual rear camera, completed upright side view and feline front view. Match camera distance, pose and lighting between baseline/candidate; require physical seams, shield depth and exposed knuckle forms to survive ordinary play distance, and role identifiers/cells/weapons to remain distinguishable across all four. Key-art lighting, paint wear and cinematic framing are references, not evidence of playable geometry. Keep this comparison separate from measured rig preservation, support and performance gates.

## Exact sources and constraints

Editable bases:
- Current Pounce derivative: assets/source/pounce-art-v1/Pounce_Quadruped.art-v1.blend; immutable approved source/GLB, packed maps and rejected iterations remain beside it.
- Remaining32-action scenes: assets/source/feline-web/Bastion_Quadruped.blend (33,683,927bytes), Lynx_Quadruped.blend (32,585,015), Caracal_Quadruped.blend (33,189,579). Do not use .blend1, older biped prototypes or regenerate a skeleton.
- Create new derivative directories. Stage privately before changing assets/runtime/models/<Chassis>_Quadruped.glb or public/assets/models/<Chassis>_Quadruped.glb.

Preserve all25 named joints, hierarchy/local transforms/inverse binds, all32 animation channel arrays/interpolation exactly, one skin and one-bone rigid influences. No cross-joint plates, finger joints or extra tail bones. Retain pilot/canopy and weapon/launcher pivots.

Preserve each decoded paw bone-local min/max and sole plane exactly. Runtime scales Pounce/Bastion/Lynx/Caracal are.8/.95/.76/.84; physical radii1.75/2.05/1.65/1.85m. Normal/climbing player height2.6m, upright3.8m. Preserve body/floor reference and model orientation. New armor is physical; inherited whiskers/tails/masts retain explicit cosmetic classification.

Keep rigid lengths/.98 reach, full rotated eight-corner checks, strict2mm*scale support residual,4mm clearance, actual fixed nonsensor support and five rays per applicable paw. Preserve all air/form/death/climb gates, replicated.7s form/.3s retraction and shared body/camera timeline.

Same-bone baseline component convex containment is useful but does not establish hull admission alone: Pounce exposed inherited cheek/nose excess and required recessing. Its final3150 source compositions measure quad core radius1.73635m/height2.19330m and upright1.46968m/3.23633m; final carrier/IK/obstacle qualification remains independent.

## Simultaneous budgets and existing atlas

| Shipping player | Triangles | Exported vertices | Bytes | Primitives |
|---|---:|---:|---:|---:|
| Frozen Pounce candidate |19,296|33,620|1,094,816|3|
| Bastion |17,008|27,848|998,936|7|
| Lynx |15,508|24,952|949,168|7|
| Caracal |16,332|26,174|967,500|7|

Targets: Bastion19-20ktri, Lynx17-18.5ktri, Caracal18-19.5ktri. Hard caps simultaneously:22ktri,36k exported vertices,1.3MB optimized model excluding shared maps, seven material primitives. Aim3-4, with only one small canopy blend primitive; count shadow passes separately. UV/normal splits can reach the vertex cap first. Replace occluding old shells rather than stack hidden details; no subdivision everywhere or simultaneous LOD introduction.

Reuse public/assets/textures/feline-{albedo,normal,orm}-v1.webp, external GLB ../textures/ URIs and required EXT_texture_webp. Three shared1024 maps total18,332bytes; normal/ORM lossless. Albedo sRGB; normal linear OpenGL+Y; ORM linear(R=AO,G=roughness,B=metalness), UV0 and flipY=false. FelinePBR_ materials use the existing dedicated preserved-map profile and cached-map ownership; untagged surfaces stay unchanged.

Use existing ivory/paint/metal tiles and separate paint tint material when needed, so tint does not recolor metal, rubber, pilot or glass. Do not overwrite frozen maps for one chassis. A v2 atlas/bake needs separate whole-roster review. Shared compressed ceiling900KB; three RGBA1K mipmapped maps cost about16MiB GPU memory. Existing atlas is original analytic height/material detail, not a high-poly bake. No four2K sets or new transparent layers.

## References and useful Higgsfield scope

Read existing admitted batch002 comparison and batch003 construction originals under assets/reference/Concepts/, retained critiques under assets/reference/legacy-docs/art/, public/assets/art/rainline-key-art.webp, actual three remaining portraits and .sites-runtime/city-art/pounce-candidate-first/pounce-quad-close.png. The ordinary rear view prioritizes dorsal/shoulder/waist shapes. Portraits use different lighting and are not matched performance evidence.

Legacy sheets depict a taller conventional biped with recorded view/mount inconsistencies. Use material, protected-pilot and role cues; do not import their joints,4.5m proportions or single forearm shield into the current feline rig.

Original edited geometry/UV/PBR on the retained rig is the next gameplay deliverable. Paid Higgsfield concepts, turntables or cinematics are optional separate deliverables and cannot qualify topology, contact or performance; no new generation is needed for Bastion.

Read-only callable metadata exposes native3D Jutsu scene queries, committed Blender/GLB retrieval, scripted scene editing and model discovery. Existing assets/source/higgsfield-coolant-candidate evidence demonstrates a251-part original static assembly/maps, including rejected color/normal attempts. It does not prove an animated32-action mech roundtrip; nativeBlender5.2 versus local4.5 compatibility was unverified. A cloud/catalog/generated mesh still needs exact bind/channel, rights/provenance and local-runtime gates. No provider call, billing, generation or mutation was made for this plan; future paid work needs concrete scope/quote and retained debit evidence, without zero-cost inference.

## Build and verification gates

1. After current approval, freeze actual Bastion source, decoded optimized data and full model roster. Capture matched rear/shoulder/feline-front and completed upright own-frame baselines under ordinary lighting. TRANSFORMING is not an upright qualification.
2. Author one contained derivative with editable component classification. Verify details are exposed: Pounce's first hidden collars/hub faces and33,360tri bevel draft were rejected. Retain all failures.
3. Require exact25bind/32channel preservation, rigid weights, unchanged sole bounds and unrelated model bytes; declare parallel additions separately. Verify actual UV/PBR/normal orientation and budgets. CPU textureless loading must retain BIN/accessors/rig/channels exactly; browser tests verify real images.
4. Measure standalone and independent gait/turn/additive mixtures with opposed head/tail aim, carrier and final post-IK corners/core. Replay actual moderate/coastal ground,5cm step, removed/missing floor, roof/wall/mantle, air/form/death/reset and late guests. Preserve/no-worsen known steep unsupported and adjacent-obstacle limits; no flat substitute or collider expansion.
5. Independently review local/coarse and rendered WSS/peer footage, shield/weapon/pilot visibility, both forms and all actions. Run matched warm/cold frame pacing, downloads, maximum roster calls/resources and repeated hangar/late-model cleanup. Reject appearance or functional regressions despite static caps.
6. Only after Bastion approval, proceed to distinct Lynx then Caracal derivatives. Investigate skeletal LOD later if actual roster cost warrants it.

This plan narrows a playable art gap. It does not establish cinematic parity, articulated fingers, arbitrary-obstacle contact or AAA readiness.
