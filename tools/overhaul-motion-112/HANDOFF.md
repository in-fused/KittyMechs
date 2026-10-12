# Motion112 — bounded whole-body author source, UNRUN

Writer CLOSED. No Blender, build, browser, export, parser/test job or extra agent ran. No runtime/public/schema/camera/closed106 files changed. New files are confined to assets/source/overhaul-pounce-motion-112 and tools/overhaul-motion-112. Native co-op capture is outside this writer's scope.

## Why a different choreography is required

106 Trot/Gallop offsets FL0 FR.5 HL.5 HR0 make total fore and hind support equal, and equal diagonal loading cancels the lateral sum. Its advertised support-driven pitch/roll therefore disappear. Gallop is the same diagonal pattern at a shorter clip duration, without a hind/fore sequence or gathered/extended torso. Upright front targets are a fixed hip-relative guard. Motion110 actual play accepted delivered variation and moving gait under R only; stiffness, sparse/mechanical motion, fluidR and final contact were rejected. This candidate changes choreography rather than contact tolerance or endpoint diagnostics.

## Source candidate and physical contracts

author.py is an isolated copy of106's author infrastructure, loading SAVED Pounce_Motion106.blend rather than rebuilding geometry. It overrides only choreograph/transition_arc with choreography112.py before execution. Original034 fingerprint,058 material preservation and027 detached pose/key/replay ownership remain. The same seven selected action names are replaced (five gait clips and TransitionBase106/Arc106); all other action ownership remains retained. No new diagnostic pipeline was introduced.

The source loader verifies57 rest bones,255 retained mesh parts and unchanged geometry/rest/weights/UV/material fingerprints. Strict004 solve_two and chain_bone remain unchanged and reject unreachable or changed-length targets; there is no reach clamp, source-bone scaling or threshold waiver. Source R/body motion does not change native carrier/COM/contact authority. All source contact intent remains UNQUALIFIED until actual output review.

- Walk retains the measured four-beat sequence and follows distinct loading through body/head/tail.
- Trot keeps diagonal organization with a .04-cycle hind lead. Axial shoulder/haunch countertorque uses the diagonal difference instead of cancelling averages; fore/hind pitch responds to the resulting sequential loading.
- Gallop has HL touchdown.06, HR.13, FL.48, FR.55 and duty.26. Hind support ends.39, fore begins.48; fore support ends.81, next hind begins1.06. Thus .39–.48 and .81–1.06 are actual unsupported intent windows. Pelvis/spine/chest flexion gathers the body near phase.93, extends after hind push and transfers load to the forequarters. Authored root compression/flight, head counterpitch and lagged tail motion use the same cycle. Hind hock recovery rotates its source ankle-to-hock vector at constant length; digit/claw recovery remains explicitly phased.
- Upright hind phases remain alternating. Forearms oppose the corresponding hind limbs with shoulder reach, elbow folding, paw orientation and distinct recovery; the torso/pelvis counterrotate and tail/head counterbalance. They no longer stay in a fixed guard.
- R retains neutral C2 endpoints and the travelling-gait/additive-arc architecture. Separate C2 haunch, spine, chest and neck pulses transfer load at successive parts of the transition, rather than bending all body segments with one shared envelope. Existing106 action names stay intact for future admission.

The native distances per cycle are EXACTLY retained: Walk.7777777777777777, Trot1.3548387096774195, Gallop2.4358974358974357, UprightWalk1.0625 and UprightStride2.1533333333333333. Each source sweep is nativeDistance * sourceDuty /.8. Gallop therefore changes authored stance duration/sweep together, preserving measured native carrier distance instead of inventing slip-free anchors. A true suspension cycle is impossible with the old .52 duty and two half-cycle support pairs, whose windows overlap; the new duty is choreography, not a relaxed support criterion.

Minimum24 cycle intervals retain the new staggered events. Gallop/UprightStride source durations consequently become.4s before export; the runtime's distance-phase clock, not source seconds, must still determine play speed. The existing author records retain actual source intervals and now include nativeDistance/sourceDuty/sourceOffsets. No final manifest/runtime contract has been changed.

## Required source/foot-owner coordination

footfall-metadata.json is the exact authored duty/offset/touchdown/unloaded table. Local phase is positiveModulo(measuredSignedPhase + sourceOffset); stance intent requires local<sourceDuty and the limb not being unloaded. Upright front limbs are unloaded even though their arm choreography has phases.

footfall-companion-proposal.ts is an isolated integration proposal, not a shipped owner. It requires each selected source gait's actual measured phase and real positive blend weight. During moving R, pass both active gait samples. Authored swing/unload takes precedence over a requested correction plant; stance is permitted only when every contributing loaded source gait declares that limb in stance. This conservatively prevents a rigid correction from overriding real suspension/lift. Existing lease/raycast/reach/fixed-chain/endpoint/release checks MUST still run unchanged; an authored stance is permission to attempt contact, never proof of it.

Root must separately admit the actual112 source table into the existing selected-clip metadata and foot-owner input before gameplay. Old hardcoded Walk/Trot/Gallop offsets or .52/.64 duty would destroy this design. No graft-then-false-foot-owner integration is admissible. There is no schema/public/runtime edit in this packet; companion proposal is not executable integration and has no test/pass claim.

## Rig limits and one future gate

Read retained019 rig profile: source convention Xright/Yfront/Zup, separate .8/pi mount, three pelvis/spine/chest segments, fore upper/lower/paw and hind upper/lower/hock/paw. That chain can express the proposed flexion and independent arm recovery without new bones; no proven structural impossibility was found from these records. It is a mechanical cat rig with retained rigid armor, not a deformable anatomical spine/scapula. Actual segment collisions, full paw/claw clearance, hock feasibility and convincing silhouette remain unknown. If the first strict solve or actual result exposes a structural reach/armor limitation, STOP and report the actual failing chain/pose; do not shorten native stride, lower guards or tune another weak curve. A genuine anatomical correction would require separately scoped hip/shoulder/rest/armor geometry work.

Next is ONE independently gated root author job against protected-inputs, stopping at first failure and preserving the saved master/temporary export/receipt. Then independent actual-output review decides whether the whole-body gathered/extended/limb staging is credible enough for ONE bounded future integration/public gait/R observation. No actual quality, contact, lag/performance, full district or Gate1 approval is claimed. This source packet does not authorize a proof loop or second curve candidate.

source-seal.json binds exact input/output files, including author/choreography/table/companion/handoff and unchanged source helpers/profile/master guards. Author112 future outputs are fresh-only and remain absent now. Writer112 CLOSED.
