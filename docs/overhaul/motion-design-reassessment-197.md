# Motion design reassessment197 - CLOSED READ ONLY

The arm problem has two independently demonstrated causes: the authored elbow pole already folds across the sternum, and197's final covariant transition loft uses the opposite lateral convention. Torso rigidity combines a weakly changing axial centerline with rigid chest/haunch armor. The composer does not erase the pure-gait axial keys. Larger angle coefficients alone would not address these ownership/topology issues.

Scope: existing recipe/code, raw197 GLB accessor bytes/hierarchy and already saved primary-GLTFLoader pose operands. No Blender, render, decoder, fixture or production jobs; no edits to CLOSED197/assets/runtime. Existing merge197.py read() parsed raw17,071,876-byte GLB SHA2619075cc779cef764bcecd6b8fbd701b849bbdcd3e7a4603b50273eef0c41c5. Numbers below are source/runtime art coordinates under declared.8 and Ry(pi), not native support evidence.

## A: Authored axial task, not missing playback

choreography197.py:72-87 sets absolute pelvis/spine/chest orientation at their inherited pivot positions. Gallop uses averaged hind-recovery gather and fore/hind support sin-squared envelopes. The separately declared event-key gallop_tasks() at52 is NEVER called. Thus its explicit gather/propulsion/extension/landing sequence does not control exported gallop. Walk/trot pelvis/chest depend mostly on hind-minus-fore load; trot's nearly diagonal offsets make those load envelopes similar. Upright's main posture is constant absolute pitches(-.27,-.62,-1.10rad) with modest phase modulation, not a separate upper-body action/load task.

Actual raw CUBICSPLINE axial channels exist: gallop33 keys; upright stride27 keys; trot30 keys. For example gallop spine local quaternion X ranges -.210827 to+.029190, chest X -.167123 to-.005623. These are nonzero rotations, not an absent bone mapping. Quaternion components alone are NOT Euler angle amplitudes.

Saved actual composed centerline operands (pelvis/spine/chest pivot positions):

| Gait/phase | Pelvis-to-chest distance | Angle between pelvis-to-spine and spine-to-chest |
|---|---:|---:|
| Gallop .142857 | .868920m | 3.323deg |
| Gallop .571429 | .851663m | 23.724deg |
| Trot .142857 | .865102m | 11.521deg |
| Trot .428571 | .863416m | 13.658deg |
| UP stride .142857 | .844510m | 28.157deg |
| UP stride .571429 | .842782m | 29.130deg |

Across the seven distinct preview phases, gallop centerline contraction is only17.26mm; trot1.76mm; upright3.83mm. These are finite samples, NOT dense extrema or skin silhouette certification. The path is one pelvis->spine->chest chain with fixed source spans .420476m and .666108m (.336381m/.532886m after scale), so rotations can flex the centerline, but authored upright mostly holds one flexed posture.

## B: Skin/armor and shoulder ownership obscure flexion

Raw skin weights summed over original POSITION vertices, not surface area/mass: pelvis2198.170, spine740.497, chest2274.999 effective vertices. Spine is only14.2% of those three sums. Mixed AnatomicalChassis528vertices carries pelvis188.211/chest212.316/spine78.456/head49.017. Waist ribs DO carry blended spine weights; articulation is not universally frozen skinning.

Important silhouette shells are completely rigid to a single joint: DorsalKeel172vertices all chest, chest flank guards202 each all chest, front OverlappingMantle plates222+176 per side all chest, rear mantle176 per side all pelvis. DorsalKeel source longitudinal Z extent .380000..1.050000 =.670000m (.536000m rendered); one plate cannot show vertebral curvature internally. The broad chest/haunch shells can conceal the narrow flexible waist instead of exposing a gathered arch. No area-weighted visibility attribution is claimed.

FL/FR upper parent is chest, directly: source shoulder local X -/+ .47m, no independent scapular/shoulder carrier joint. Hind uppers directly parent pelvis. Preserving all57 ancestry/rest and original shell weights therefore prevents independent scapular glide/reorientation or reorganizing armor around additional axial pivots. It does NOT prove existing anatomy mathematically incapable of any improved motion; it does block those specific anatomical degrees of freedom. The frozen-rest/geometry rule was a candidate preservation choice, not the full player brief's prohibition on better anatomy.

## Forearms: actual source pole and composer sign errors

choreography197.py:108 selects an OUTBOARD paw target: FL source side=-1 at negative-X shoulder; FR side=+1. At114 the elbow pole is transported from the quadruped REST lower-bone head by chest delta. An outward endpoint alone does not constrain elbow side.

Raw UPStride FIRST exported key, and final pure-UP composed phi0, agree to displayed micrometers:

| Limb | Shoulder X | Elbow X | Paw X | Interpretation |
|---|---:|---:|---:|---|
| FL | +.374007m | -.061256m | +.614582m | elbow crosses center despite outward paw |
| FR | -.377988m | +.040970m | -.618564m | same mirrored medial bend |

This crossing is authored before the composer. The source solver chooses its quadruped-derived bend plane after upright chest rotation; fixing a wrist/endpoint sign alone would leave it. SourceTask197 transports/averages those actual source elbow points, retaining the medial branch.

There is ALSO a distinct source-task transition sign defect. Current flat source frameX=(-1,0,0) because body Ry(pi). idleFore uses FLside=-1/FR+1, correctly outboard. Transition loft at sourceTask197.ts:59 uses FLside=+1/FR-1 with the SAME frameX, so it is inward. Before final frame-protocol correction this addition used world X directly; its signs were outboard in that one flat basis. Covariance alone does not test anatomical left/right semantics.

Exact saved Trot .5 + UPStride .5, phi .1/stance .5:

| Limb | Hip X | Earlier flat target/paw X | Final covariant target/paw X |
|---|---:|---:|---:|
| FL | +.371382m | +.633658m | +.366352m |
| FR | -.380201m | -.641512m | -.374206m |

The final shift is .267306m inward relative to the earlier path, twice the .133653m half-R loft. Reach max is1.336528m; no reach-limit explanation is needed. This is a material wrong-side task convention despite passing source-plane/covariance checks. CLOSED197 remains unchanged and unadmitted; the review must retain this defect.

## C: Composer preserves pure axial motion, but changes R ownership

SourceTask197.ts:46 sets axial local TRS from actual source samples; subsequent solves only rotate limb chains/paws. No later pelvis/spine/chest overwrite. Pure-gait quaternion averaging has ONE contributor, hence preserves its axial rotation. Pure UP raw and composed shoulder/elbow/paw examples above confirm it. During speed/R blends, weighted local quaternion means soften differences; source endpoints/poles are blended before solving, and the neutral Arc is intentionally not played. That is an intentional ownership redesign, not missing loaded clips. The new inward loft is a concrete composer fault; it cannot explain the already crossed pure-UP source elbows or the rigid pure gallop shell.

## Two bounded next design alternatives

1. Existing-rig source-task correction: define ONE named anatomical lateral basis/limb sign in source coordinates for authored tasks, Idle and R; pair paw tasks with an explicit ipsilateral elbow-plane task transported from shoulder/sternum (not the quadruped rest elbow). Choreograph a complete contralateral reach->retract arm loop with elbow outside the sternum and below shoulder, with source load events controlling hand/shoulder timing. This can address arm crossing without altered reach, but leaves the chest shell/scapular limitation. It must be a distinct admitted candidate, not another197 repair.
2. Coordinated anatomical source/master redesign (recommended for the torso goal): expose articulated axial mechanics by splitting/reweighting broad dorsal/mantle shells around actual load-bearing lumbar/thoracic pivots, and provide an independent scapular carrier for each forelimb. Author a gather->hind propulsion->fore reach->landing sequence that changes axial shape and shoulder travel together; upright carries a distinct ribcage/arm gesture over alternating hind load, rather than reusing a folded quadruped pole. New source rest/binds/hierarchy and all action compatibility must be revalidated/retargeted; retained masters stay immutable. Preserve detailed armor/material language and fixed limb segments/native stride; do not scale bones or add a root/drop/contact waiver. Body envelope/native-clearance compatibility needs its own future gate.

The next decision is explicit anatomy ownership, not more samples, larger amplitudes or tighter/looser thresholds. Numeric source floors and full-pose replay cannot certify feline visual load transfer. Writer CLOSED.
