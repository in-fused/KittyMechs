# Independent critic gates — October 9, 2026

Authority: the finite overhaul prompt in `docs/research/new-overhaul-task-prompt-20261009.md`. Critic owns review records only; the primary agent integrates and plays. Each integrated milestone receives **APPROVE** or **DENY**. Tests and research approval cannot substitute for ordinary play. Missing evidence means the gate is not approved, with the missing evidence explicitly distinguished from observed defects.

## Evidence packet for each review

- Identify build/commit or recoverable source snapshot, runtime URL, asset manifest/version, browser, machine, graphics preset, capture time, and controls used. Name known limitations and untested paths.
- Supply uncut ordinary-play clips or a reproducible browser session, with timestamps for the behaviors below. Screenshots/contact sheets can establish visual detail but cannot establish movement, contact, lifecycle or synchronization.
- Show ordinary camera framing, not only close asset renders. Include starts, stops, turns, awkward approaches, failed attempts, recovery and continued play. A scripted showcase alone fails the evidence requirement.
- Supply simultaneous two-client captures, host/client identities and action timestamps. Show observed remote outcomes and late-join world state, not just network assertions.
- Report measured frame-time/FPS distribution, stalls, active fragments/draw calls/memory where available, capture conditions and hardware. Include representative dense routes and destructive/combat load on the available GTX 1070 Ti-class machine; distinguish measurements from targets.
- Link focused test results and the exact gameplay/source files needed to check authoritative movement/contact, support loss, persistent state and lifecycle. Static code can explain evidence; it cannot replace play inspection.

## Gate 0 — Preservation, baseline and architecture contracts

Require a verified recoverable source snapshot including ignored large assets, retained generation outputs and editable Blender files, plus the preserved playable release. Capture current movement, transformation, climbing/corners/roof, combat and multiplayer lifecycle defects. Architecture comparison is bounded to two candidates with representative shared content, ordinary-play captures and frame-time evidence. Document one choice and contracts for units, pivots, collision proxies, rigs/animation owner, materials/LOD, authoritative fixed-step simulation, serializable state and structural compilation. Approval here authorizes the chosen delivery path, never release completion.

## Gate 1 — First integrated district (all systems required together)

| Area | Required ordinary-play evidence | Denial examples |
| --- | --- | --- |
| Pounce art | Detailed editable Blender master and optimized in-game rig; coherent feline anatomy, armor, materials, head and tail from normal camera angles in a densely dressed connected district. | Placeholder silhouette, decorative reference image replacing a model, or detail visible only in a posed render. |
| Both stances and R | Acceleration/braking/turning, independent quad and upright gaits, grounded launch/landing/recovery, repeated R while moving and near structures. Camera and momentum remain coherent; controls stay responsive. | Sliding feet, vertically scaled quad gait, unstable contact, camera snap, transform lockout that breaks responsive play. |
| Universal climbing | Representative facade sides, corners, roof edges, bridge/gantry and appropriate reachable props; airborne/lateral catches, roof transition, detachment and reattachment on actual surfaces. Show damaged and removed supports. | Grip strips, invisible carriers, stale roof target, clipping, floating hold, stationary per-tick damage. |
| Physical combat | Pursuit/telegraphs/reactions; pounce, tackle/dive, pin/claw/escape against a reacting enemy and another mech; misses, cancellation, recovery and counterplay. | Projectile/particles replacing contact, attacker/victim mismatch, spam without consequence, immobile dummy as sole evidence. |
| Destruction | Normal combat/traversal damage at multiple locations and directions; local claw wear/hard landing damage, support loss and consequential falling/collapse; return to persistent openings/settled ruins. Demonstrate collision, grip and navigation/mission-space updates. | Temporary cubes/dust, facade disappearance, intact-wall restoration, generic health-to-collapse unrelated to supports, climbable removed parts. |
| District density | A continuous ordinary route across streets, facades and usable rooftops with coherent varied population, depth and props. | One dressed photo angle, empty connecting routes, clutter that blocks traversal or unsafe physical loading. |
| Cooperative mission | Two clients progress through multiple objectives, checkpoint, down/revive/rescue, win/fail/retry and reconnect/session teardown; authoritative pickups; friendly-fire/life states readable. Late join shows correct objective, damage, ruins and combat/life state. | Passing local-only tests, divergence, stuck reset/retry, accidental self-host lifecycle, late join rebuilding intact world. |
| Performance | Measured dense-route and combat/collapse play at an appropriate balanced preset with stalls and limits documented; bounded fragments settle without erasing ruins. | Unmeasured 60 FPS claim, quiet-scene-only result, preset removes consequential destruction. |

Gate 1 requires this connected district to contain **all** listed systems before content expansion is accepted. It is an intermediate delivery, never the final scope.

## Gate 2 — Full required prototype

Require Gate 1 behaviors across Pounce, Bastion, Lynx and Caracal and extensively populated Rainline, Ember and Frostline. Show each chassis in normal quad/upright traversal and paired combat: different silhouettes, proportions, armor/materials, heads/tails/rigs, weight/gaits/timing and distinct offense/defense or support/rescue mechanics. Recolors and speed scalars fail. Exercise universal climbing and component/support-based destruction across each map's structural classes, not only one reused sample building. Review full cooperative mission progression and useful randomized authoritative pickups; two-client PvP and PvPvE with readable rules, enemy/teammate/terrain interactions, synchronization and late join. Weather, area effects, sound and feedback must support readable play. Preserve the friend-link flow where available. No generation service may be required to launch/play; admitted assets need license/provenance records.

## Gate 3 — Release acceptance

Require independently accepted full scope, a recoverable playable release and source/assets, clear controls and build/run documentation, measured performance/limitations, and ordinary-play polish review of camera, animation, collision, audio/effects and loading. Demonstrate fresh launch, gameplay, join/leave, retry and return to checkpoint using the delivered build. Report every unverified feature candidly. Prototype approval does not claim commercial readiness or an AAA rating.

## Verdict and finite failure policy

Each review records scope/build, evidence inspected, **APPROVE/DENY**, observed strengths, numbered blocking defects with capture timestamps, missing/unverified evidence, and the smallest concrete next review packet. Maintain denial counts per quality gate. After the same gate is denied twice, require a documented underlying design reassessment and revised evidence plan before a third review; repeating constant tweaks/proof loops is insufficient. Keep exact verdicts and outstanding defects in the resumable checkpoint. Required unfinished work leaves the overall goal incomplete.
