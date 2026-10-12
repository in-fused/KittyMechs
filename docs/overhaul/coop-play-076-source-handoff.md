# Public waypoint braking controller 076

Source-only, unrun. Owned files are new `tools/overhaul-coop-play-076/controller.mjs`,
`capture.mjs`, this document and their handoff/seal. Frozen075, game source and
its full mission harness stay unchanged. Root owns syntax checks and ONE actual
capture after independent source review; no author jobs or delegation ran.

The controller sends only normal public keyboard actions. Every browser evaluate
reads existing diagnostics. A movement pulse ends immediately after a successful
post-mark intended send is observed, **before** any authority ACK polling or extra
travel sleep. Only its active movement keys are released together; there is no
old serial release of13 unrelated keys. The exact sent packet, browser send time,
completed public key release time/duration and available browser keyup events are
recorded. A separate phase waits for native cumulative `lastInput >= sent.seq`,
a fresh post-release neutral successful packet/ACK, grounded low speed <=0.12 m/s
and two distinct native ticks. Cumulative ACK is identified with that exact sent
sequence; equality need not appear in sparse snapshots and execution is not
inferred from ACK alone. Actual rested positions decide arrival.

Stopping prediction records current measured speed, observed read/release time,
neutral ACK/rest delay, speed/14 motor-decay estimate from the existing native
neutral damping and recent **actual** pulse-to-rest travel. The nominal initial
speed comes from shared Pounce config, then measured peak speed updates it.
Distance and measured continuation/minimum-pulse travel guard against knowingly
sending a pulse past the opposite edge of the unchanged arrival circle. Unknown
latency that cannot fit ends the observation; it does not increase tolerance.
These conservative estimates are controller planning, not a native stopping or
collision certificate. Pulse delivery is limited to1.5 s and ACK/rest to4 s;
each waypoint allows at most35 iterations within the same overall work limit.

The one capture publicly selects Low, prototype Pounce, PvP and Rainline7734 on
unchanged live045 at8799. Far goal is(-8,12) from ordinary spawn. After actual
far rest, the near goal is1.8 m farther along the same road from that observed
position. These are navigation targets, never actor writes. Both use **1.1 m**
arrival and actual neutral/low-speed rest. Any observed missing/downed/damaged
pilot stops the attempt; no combat injection, protection override or retry.

Work60 s, cleanup20 s, inclusive80 s, existing ordinary readiness20 s. Own video
1440x900 viewport/960x600 recording and initial/far/near/failure PNGs are prepared.
JSON is capped at2 MB with maximum20 sent rows/8 control events per read. Initial
and final/failure observations retain the actual native pose, body readback and
tick; each pulse records send/release/ACK/neutral/rest positions and travel.
First failure preserves its current phase and last real native observation,
releases controls, closes and stops. There is no automatic retry.

Risks: asynchronous reads and public event delivery can still outlast a small
pulse; the guard may honestly reject such latency. Dynamic/native obstacles,
startup readiness or damage can stop the observation. Sparse native snapshots
do not prove continuous obstacle-free motion. Successful convergence qualifies
only this pilot control on these two ordinary waypoints: no mission, rescue,
camera, IAB performance or full gameplay approval follows.

Exact root commands, live045 receipt requirement, protected075 hashes and frozen
source rows are in `tools/overhaul-coop-play-076/source-handoff.json`.
