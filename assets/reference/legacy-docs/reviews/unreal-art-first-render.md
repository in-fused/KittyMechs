# First Unreal mech render: independent review

Reviewed 2026-09-26. Evidence: `Artifacts/Validation/MechCaptures/20260926T175621575883Z/mechs.png` and its adjacent `capture.json`. The reviewer opened the actual PNG, read the receipt and recomputed its SHA256: `f0a8cf8d8fef55fda60c1f1d7dfc55d1cbe3f9fb252f96dd3f133b637085e4db`.

**Disposition: accept as an M0 static import/render milestone; keep gameplay meshes disabled.** This is a rendered Unreal scene, not the Blender preview or a generated concept. It is not final art, animation acceptance, collision acceptance or a performance result.

## Measured evidence

The receipt records a normal Editor `-RenderOffscreen -dx11` run, SceneCapture2D FinalColorLDR, 1280×720 RGBA8 sRGB target, gamma 2.2, manual exposure with physical camera exposure disabled and bias 0. The camera uses 50° FOV. The native asset/shader/texture barrier completed; 149 Slate callback ticks and 146 scene capture submissions preceded export. These counts are not GPU frame counts or a frame-rate benchmark. Capture elapsed time was 21.75 seconds.

| Property | Pounce | Bastion |
| --- | --- | --- |
| Imported bounds, cm (X/Y/Z) | 305.25 / 183.10 / 384.15 | 355.00 / 119.00 / 384.18 |
| Inspection actor scale | 1 / 1 / 1 | 1 / 1 / 1 |
| Inspection actor rotation | 0 / 0 / 0 | 0 / 0 / 0 |
| Material slots | 12 | 12 |
| Component overrides/differences from mesh materials | 0 | 0 |
| Bone-derived forward inference | +Y | +Y |

Bounds include appendages and are not torso-width measurements. The image therefore must not be used to infer that Bastion's torso is 16% wider from the overall X bounds. Bone-derived facing is an inference from pelvis/tail positions; the visible cockpit fronts corroborate the inspection camera's side of the models. Gameplay expects a separate mesh-to-character orientation decision.

## Visual conclusions

Both pilots read as small cats through the central cockpit opening: ears, eyes, muzzle and pale chest are recognizable. Short feline sensors, paw feet, cream enamel armor and recessed dark mechanisms preserve the intended identity. The models import as coherent, intact geometry with visible cast shadows. Pounce's segmented tail/orange trim and Bastion's paw shield/teal trim distinguish the kits in this static view. The visible shield appears on the character's left, with the gun on its right.

The principal weakness is silhouette contrast. Both retain similarly tall, narrow legs, shoulder caps, forearm structure and central torso. Bastion's shield carries most of its difference; its body does not yet convey the broad, low, heavy silhouette in the accepted concept. Pounce's digitigrade suggestion is modest in this angle. The large exposed waist and hip gap visually separates torso from legs, making the proportions feel fragile. These are deliberate prototype limitations, not evidence of missing imported body parts.

The ivory surfaces are readable but mostly blank, with limited construction detail and material variation. Forearm weapons and wrists remain simple. The cockpit perimeter is dark and visually heavy; the pilot is visible, but this single view does not establish physically convincing canopy transparency, side/back visibility or interior lighting. The background is black while the floor and mechs are lit; this is an inspection-scene presentation limit and does not diagnose Rainline Reach's packaged lighting. The PNG also has visible fine grain/noise, so it is not a polished presentation render.

## Required before gameplay activation

1. Inspect actual Idle and Walk playback in Unreal, including feet/contact, tail/shield motion, cockpit clearance and mesh deformation. This capture is reference pose only; imported animation assets are not playback evidence.
2. Confirm forward orientation on the possessed pawn while moving, turning and aiming. The imported +Y inference differs from Unreal actor +X forward; determine and test the component rotation explicitly.
3. Measure the mesh relative to the gameplay capsule, feet, weapon origin, camera and hit traces. A roughly 384 cm art height does not prove fit to the current roughly 250 cm gameplay capsule. Do not silently stretch the model or enlarge collision to hide this discrepancy.
4. Verify material/canopy appearance from front, side and back under gameplay lighting and at low settings; inspect usable LOD transitions after engine LOD attachment.

Keep frozen prototype geometry until these integration checks expose concrete corrections. Later art refinement should first broaden Bastion's torso/stance armor and strengthen Pounce's agile outline while preserving shared joint transforms, then resolve waist coverage and functional surface detail. No additional image-generation spending is needed for the findings above.
