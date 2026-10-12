# Cooperative public pilot 075

Source-only, unexecuted. Original 056 script and failures remain unchanged. New
`tools/overhaul-coop-play-075/mission-capture.mjs` copies its full west relay,
east relay, core, return and extraction itinerary, west checkpoint assertion,
both-client alive/3D extraction assertions and exact committed-publication
parity selector. Two independent Edge processes keep one controller per page;
parallel controllers are joined before rescue or role changes.

Movement and F now remain held until a successful send **after the browser-clock
hold mark** contains the intended movement/fire and authoritative `lastInput`
acknowledges its sequence. Each wait stops at 1.5 seconds; failed delivery retains
the still-held receipt. Delivered holds retain the relevant maximum 20 successful
sends. Near-goal movement releases and waits for a fresh acknowledged neutral
packet, low velocity and two distinct native ticks. A stalled released pose is
reported with its prior delivered hold, without calling it wall-contact proof.
Normal E is also delivery-checked for rescue and objectives.

Aim follows 074's actual `camera.position` and input `look.cameraRay`, using live
enemy center/velocity and bounded pulse-speed lead, IJKL 70 ms plus 90 ms settle.
The obsolete pitchReach16 inverse is not used. A fresh authoritative gun-ray
alignment must pass before F; real projectiles and damage decide hits. Q remains
the ordinary latched missile control during aligned firing. Navigation observes
visible clear threats and new HP loss, releases movement and tracks a live target
on that same page before continuing. No invisible target shooting is permitted.

Rescue clears threats, settles, then checks fresh actual 3D reach <=4.5 m,
grounded state, game action exclusions, hurt cooldown, velocity, presented native
LOS at the same +0.4 m endpoints, and actual two-hull horizontal separation.
An eligible corpse gets E immediately. Otherwise a refreshed 4 m radial approach
is attempted, ending early if current settled eligibility is achieved; no 0.2 m
waypoint or 26 ms tap is required. The game still rejects any genuine restoration
shape overlap; this observer does not certify unqueried solid space. Organic
successful revives are counted separately from rescue attempts; no down means
`REVIVE_UNTESTED`, with no injected damage or forced rescue.

Both clients publicly select Low and prototype Pounce; host explicitly selects
Rainline 7734. Existing 20 s readiness, 420 s work, 30 s cleanup/450 s inclusive,
9000 frames/page, 18 MB keyframes and 30 MB combined JSON caps stay unchanged.
Delivery receipts have an additional explicit 1200-row cap. First genuine
failure releases both pages, records the unfinished phase, closes and stops.
There is no automatic capture retry or mission reset.

Risks remain: dynamic cover and actual native hulls may block the route/rescue;
70 ms keyboard aim can overshoot a moving target; navigation can overshoot while
waiting for an ACK under latency; combat can consume the finite mission budget;
readiness or declared evidence caps can stop the attempt. ACK demonstrates an
accepted packet sequence, not a successful shot, revive or completed objective.
Full required mission completion remains unqualified until the one actual run
and independent result review. No author browser/native/build/test jobs ran.

Root runs syntax check and the single public capture with the exact new build
receipt in `KITTYMECH_BUILD_RECEIPT`; commands, hashes and immutable dependencies
are in `tools/overhaul-coop-play-075/source-handoff.json`.
