# Root diagnostics after the first locomotion rejection

These are measured diagnostic results, not independent critic approval. Specialist agents stopped with account usage errors. Canonical models and default pawn art remain unchanged.

## Source geometry mapping

`Locomotion-v005-pounce-contact-001` rejected before clip generation. The retained sole objects had identity `matrix_world` despite nonzero local locations because their source collection was hidden from viewport evaluation. Read-only `LocomotionMapping-v005-002` temporarily enabled that collection and updated Blender's dependency graph. All 96 vertices of each sole then matched LOD0 exactly with the expected rigid foot assignment; no distance tolerance was expanded. The canonical source digest remained unchanged.

The generation script now temporarily refreshes the collection before exact matching and restores its hidden state in `finally`. The pre-correction script remains in `Tools/ArtPreview/Locomotion/prepare_locomotion_v005.pre-refresh.py.txt`. This narrow follow-up still needs independent review.

## Actual corrected experiment

`Art/Validation/Locomotion/v005-pounce-contact-002/Pounce/report.json` records successful exact matching, followed by rejection at frame 1 of the proposed idle: `Forbidden evaluated armor surface intersection: pelvis / thigh_R`. No clips were exported. Skeleton, topology and all canonical model hashes remained unchanged. Logs and invocation identity are under `Artifacts/Validation/Locomotion-v005-pounce-contact-002`.

The root then ran a separate read-only comparison in `Artifacts/Validation/LocomotionCollision-v005-001`. Both the unchanged canonical rest pose and proposed idle frame 1 fail that same guard. Their measured minimum sole clearance differs only by tiny floating-point residuals: approximately -0.0000015 cm at rest and -0.0000135 cm in the proposed idle. These are single-pose measurements, not full-cycle contact acceptance.

Root inspected `canonical_rest.png` and `proposed_idle.png`, which show the same hip/socket assembly from an identical close camera. The mechanical sockets visibly meet the pelvis in both. The images do not by themselves establish intersection depth or acceptable motion clearance.

The current guard requires every vertex of both overlapping triangles to lie inside a 30 cm source-space sphere around the joint. A triangle may extend beyond that sphere while its actual intersection is local to the joint. This is a hypothesis for the existing-rest rejection, not a proven false positive. The next diagnostic should record the offending triangle identities and actual intersection geometry in canonical rest and proposed poses. Do not increase the sphere radius, ignore all pelvis/thigh pairs, or silently waive the guard. Any revised contact rule and any accepted clips require independent review, full-cycle measurements and articulated visual inspection.

The forward-run action has not passed validation. There is no new Unreal import, production animation or default-art activation.

## Measured hip contact geometry

The subsequent read-only `Artifacts/Validation/JointContacts-v005-001/contacts.json` resolves actual noncoplanar triangle intersection points for the rejected pelvis/thigh_R pairs. In canonical rest, all 63 rejected pairs have resolved contacts and none extends outside the existing 30 cm joint sphere; the farthest measured point is 23.8743 cm from the joint. Proposed idle frame 1 has 61 rejected pairs, all resolved and inside the sphere, with a maximum of 23.8763 cm. Source bytes remain unchanged.

This supports a specific overly conservative guard: it measures entire triangle extents instead of where those triangles intersect. The actual intersection segment of two noncoplanar triangles can be inside the joint even when a distant triangle vertex is outside. No guard change has been made yet. A narrowly revised guard should retain the original radius and whole-triangle fast path, resolve both triangles' edge/plane intersections, require the resolved segment endpoints inside the sphere, and conservatively reject unresolved, degenerate or coplanar cases. Regression cases must include long triangles whose contact is local, contact outside the sphere, nonintersecting triangles and unresolved/coplanar geometry. Such a change needs independent review; it must not become a blanket pelvis/thigh exemption. Other joints and all run frames remain unverified.
