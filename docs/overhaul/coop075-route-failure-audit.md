# 075 east-route failure audit

Read-only audit of the one sealed capture; no game/harness edits, jobs or retry.
Derived compact receipts are `tools/overhaul-coop-play-075/route-audit.json`, with
hashes of original evidence, native keyframes, capture source and source seal.

The run captured the normal west checkpoint and real combat. It stopped at the
first east point: guest leader target (0,-35), host follower target
(-4.1412331,-30.6583196). Host `go` exhausted **85 loop iterations**, not the
420-second overall limit or eight-stall gate. The east host issued 75 acknowledged
movement holds and attempted 10 targeted arrival/settle checks: exactly 85
iterations. All 422 delivery receipts succeeded; no delivery/movement-failure
receipt fired. All 4262 exact publication comparisons matched. Both pilots were
alive at 220 HP; east/core/extraction and public revival remain unqualified.

This is not the prior missed-tap symptom. The first east host packet seq10623
contains forward -1/strafe +1, movement yaw 0.4852600011; native ACK tick16203,
time270.05, lastInput10630. Final host packets alternate opposite movement signs:
seq13109/13123 forward+1/strafe-1, followed by13146/13163 forward-1/strafe+1,
all acknowledged through lastInput13167. Movement yaw stays0.4852600011 while
weapon aimYaw varies; `simulation.ts:568–569` moves from **input.yaw**, so these
weapon-angle changes do not establish a camera-ray or movement-yaw defect.

Native keyframes show repeated passage through the arrival circle at high speed:
time291.5 distance0.6458/speed7.5928; time320.65 distance0.7187/speed7.2903;
time327.4 distance0.4806/speed7.4383; time329.4833 distance0.8663/speed7.5462.
All 10 targeted settled distances were **1.3105–3.2717 m**, outside the unchanged
1.1 m arrival requirement. Late resting positions alternate across the target,
including (-5.3047,-32.0340), (-3.5418,-28.6907), (-5.0679,-31.5850),
(-7.0050,-30.5871). This supports a delivered high-speed overshoot/late-braking
loop, rather than a stationary pose despite held movement. The source keeps keys
held during delivery/ACK observation, extra far-distance wait, the next browser
read, and serial key release; its near-braking decision uses distance sampled
before that hold. Crossing the arrival circle between reads does not terminate
the hold. Failed braking/settling resets the stall counter, so oscillation can
consume every iteration without triggering the eight-stall gate.

There are genuine native collision reactions in the sampled interval; it is not
an entirely clear route. At270.5167/286.9833/303.4333/315.0667, raw non-upward
contact normals accompany requested/accepted horizontal differences. The last
has RoundCylinder contacts and a0.12272 m difference. One additional282.8167
sample differs0.05781 m with only an upward raw contact. Exact support identity,
pose, shape type and raw witness/normal are retained in the derivative. These
samples can constrain movement; they do not prove a named wall defect, a collider
exclusion requirement, or uninterrupted rejection. After315.0667 the retained
keyframes show horizontal movement closely matching the request, including the
within-circle327.4 and329.4833 samples. Samples are sparse, not every native tick;
raw contact frame audit status is UNKNOWN, with no force/contact certification.

Combat did not consume or reset this east loop. All five tracking records exited
`target-defeated`; the last finished224.314 seconds wall, before east roles began
310.120 seconds. Last player fireAt values185.7667/43.2833 and unchanged health
support no observed east combat interruption. Earlier combat and source reads
did consume west-route time, but cannot explain the east oscillation as firing.

Concrete next scope is a **public pilot motion-controller correction**, not game
physics or a longer timer: separate successful-send observation from ACK waiting
so a distance/speed-derived public hold can be released promptly after its send,
then await that exact sequence and fresh neutral ACK while braking. Predict the
remaining stopping travel from measured speed, current packet/ACK delay and
read/release duration; remeasure only after neutral/low velocity. Keep the same
arrival, native hulls, LOS, mission scope and overall caps. A small bounded public
waypoint observation should establish convergence before another full mission.
That differs from 075's deliberate ACK-before-release rule and requires an
explicit new harness scope; this audit changes neither frozen source nor policy.
No production gameplay defect is proven by this result.
