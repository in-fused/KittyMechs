# Render timeline144 causal finding

Writer CLOSED. Candidate public UNRUN; independent critic remains required.

Confirmed source defect: a500ms *visual callback gap* can be mistaken for a>.35s authority packet gap because `sampleRenderActor` lazily copies only the newest previous/current snapshots into its render queue. A fresh50ms packet pair then moves the displayed body but resets distance and therefore the distance-driven gait phase. Controlled confirmed-packet regression fails before the correction. This establishes a code defect in remote presentation; no affected human renderer samples establish that it caused the reported extreme lag/sliding.

`renderTimeline.ts:13` retains the original exact lifecycle/HP/position discontinuity predicate. At102, stale remote queue catchup requires a fresh positive packet interval satisfying that same original.35s bound and continuous living grounded nonpair/nonclimb/nonstrike states. It discards stale interpolation samples and starts the clock at the fresh pair's confirmed start while retaining the old displayed carrier position. All interpolation stays inside the fresh confirmed segment. At110 the existing delay/dt/age/rate behavior remains. Returned distance is actual horizontal displayed-frame displacement and resets only when original discontinuity rules or excluded powered/paired cases require it.

Eight focused files152 tests and tsc --noEmit passed. No unconfirmed extrapolation, timing threshold change, physics/animation/assets/camera/contact change, browser/build/server job or human lag fix claim. Full native locomotion/gait/performance qualification remains incomplete. Details and exact source seal: `tools/overhaul-render-timeline-144/HANDOFF.md` and source-seal.json.
