# DEBUG025: Space delivery succeeded; actual takeoff remains unobserved

Read-only task began 2026-10-10 19:53:24 UTC. No compiler, native test, browser, replay, source authoring or production edit. Original024 failure remains immutable.

The capture reached actual upright stride with valid019 binding, then timed out the conjunct `!latestActor.grounded && presentedOwner.mode === 'air'`. No page errors, missing clips/bones or prototype fallback were recorded. The evidence does **not** establish that the jump was never issued.

## Exact input delivery

All times below are the captured host performance clock, not authority simulation time:

| Event | Time ms | Owner/life/request |
|---|---:|---|
| Space keydown, focused BODY |33470.799999952316|life1|
| Accepted press |33471.09999990463|id1, cancel0|
| Space keyup |33480.09999990463|keyup only removes held key|
| Request sampled |33483.59999990463|id1|
| First actual send |33483.799999952316|id1|
| Authority acknowledgement observed |33740.299999952316|id1|

Owner is `1:bb7ea66c-af37-43a9-84fe-3be86f4bd928` throughout. Press→send12.70ms; press→ack269.20ms. There is no drop/cancel/owner retirement event. Final `issued=processed=1`, `pending=cancel=0` and `Actor.jumpProcessed=1` are consistent with a consumed request. `jumpId=0` at failure is normal after acknowledgement; it does not prove a dropped Space edge. Request-carrying sent-input rows had aged out of the bounded rolling history by the late failure sample, while named delivery events survive.

`input.ts` latches Space on keydown independently of held-key sampling; keyup does not cancel that edge. `jumpOutbox.ts` clears pending when authority acknowledgement reaches issued ID. `Simulation.consumeJump` updates `jumpProcessed` before testing freshness and before subsequent movement/state guards. **ACK certifies consumption, not native launch.**

## What actual motion was captured

Last full sample before Space: tick1841/time30.68333333333287, stance upright, grounded, position(-4.9129354,.9402282,2.2764709); actual UprightStride selected. Stance changed at28.8, so transition was already complete at that sample. First full sample after the failed airborne wait: tick2264/time37.733333333332475, grounded, position(-2.7755438,.9400217,-31.8633202). Final tick2302/time38.36666666666577 is also grounded at(-2.5831096,.9400000,-34.9378086). Recent requested/accepted horizontal KCC movement is normal northward4.864m/s, and the captured contact is floor. Those are **late** contacts, not takeoff contacts.

There is no saved matching-clock authority state or positive-Y KCC request/contact at request1's consumption tick. Thus freshness, actual launch-ground bit, any transient KCC ceiling owner, takeoff height, airtime and landing tick remain UNKNOWN. The current code has no separate jump headroom predicate: a ceiling would constrain the actual upward native movement query. Do not borrow stance headroom semantics or late floor contacts to invent a jump denial.

## Observation limitation

At the prior stride sample, presented owner time29.83333333333292 lags latest native time30.68333333333287 by0.85s. The airborne predicate combines those different clocks. In unobstructed flat ballistic motion, initial5.76m/s and g22 give a nominal return-to-level duration around0.524s; that estimate is not evidence that this request actually launched. The measured0.85s presentation lag exceeds that estimate, so a real native flight could end before the corresponding presented Air state is selected. Sparse polling/frame scheduling could also miss the latest-native ungrounded interval. The capture proves the conjunct failed, **not** which of its individual terms occurred. No GPU cause, performance qualification, or actual jump success is inferred from host3–32FPS/guest10–54FPS or accumulated loading/frame counters.

## Smallest next useful observation

A separately authorized observation should retain a bounded event history at snapshot receipt (not only the slow render/poll loop): request1's first authority acknowledgement, native tick/time/grounded/position/Y velocity and actual movement requested/delta/contact owners, plus presented tick/time/mode. Correlate each domain at its own clock, then require causal delivery→actual native takeoff→actual landing and separately actual presented Air. Keep normal Space, exact inputs, jump rules, cover/headroom, clip selection and hulls unchanged. If request is consumed without launch, a bounded authoritative jump outcome receipt with actual freshness/ground/transition/collision reason is the concrete gameplay improvement; implementation requires a separate decision. No retry or successor capture is authorized by this diagnosis.

Frozen024 evidence and selected input/native/presentation sources are size/SHA256 recorded in `tools/overhaul-runtime-art-debug-025/closure.json`. Full gameplay/art/contact scope remains incomplete.
