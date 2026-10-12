# Gait064 — moving R discards locomotion ownership

One concrete defect: ordinary moving R replaces all gait channels with a time-only transform and stops advancing travel phase for the entire .7s transition. Native translation continues. This is separate from the corrected058 stance sign and061 first-key clock range. No game/asset edits or author/export/build/browser/native jobs ran. Writer CLOSED; full goal remains INCOMPLETE.

Current runtime005: line49 advances gait phase only inside gait(); lines60–61 derive R from elapsed time; line72 clears every action weight; line77 selects only TransformUp/Down at weight1 before reaching gait selection. Both actual058E transforms retain171 channels, duration .7166666388511658, and no measured travel cycle. Their joint pose depends on u, not displacement or entry support phase. Ending R selects an arbitrary retained locomotion phase at full weight, without pose matching or blending. Advancing the stored phase alone would not make the visible transform compensate travel.

Saved063 local-owner/native samples establish that this branch occurs during motion. Times below are capture wall milliseconds, **not exact switch frames**; each switch lies between the listed observations.

| Recorded switch | Wall-time bracket | Owner clip times / phases |
|---|---:|---|
| Forward Trot → Gallop | 13271–13497 | .109274 / .222257 → .165077 / .890465 |
| Walk → TransformUp | 30149–30399 | .942671 / .926004 → .075052 / .022530 |
| TransformUp → UprightStride | 30846–31051 | .550775 / .022530 → .070941 / .191555 |
| UprightWalkLong → TransformDown | 32678–32899 | .161081 / .240691 → .146189 / .250192 |
| TransformDown → Gallop | 33352–33562 | .601570 / .250192 → .113800 / .582798 |

Up-transform samples30399/30634/30846 have exactly unchanged gait phase .022530402863843113 while clip time advances .075052→.337045→.550775. Native ticks1627→1655 move from(x−18.095845,z32.032181) to(−18.385763,29.898619), approximately2.15m. Owner speed2.160→5.002→5.091m/s; native speed4.226→4.830→4.860m/s. R began at native time26.95; sampled owner render times27.023307→27.487967.

Down-transform samples32899/33131/33352 have exactly unchanged phase .2501921233869986 while clip time advances .146189→.365676→.601570. Native ticks1780→1807 move from(−19.444903,24.268186) to(−19.333111,27.628127), approximately3.36m. Owner speed5.854→7.192→7.704m/s. R began at native time29.416667; sampled owner render times29.559456→30.004247. Every listed action has weight1 and firstFailure null.

These observations prove time-only transform ownership during substantial native travel and frozen locomotion phase. They do **not** prove stationary paws, pad slip, exact pose discontinuity magnitude or native contact:063 contains sparse asynchronous native/owner samples and no world-space pad traces. Trot/Gallop replacement is also observed, but this packet does not diagnose threshold chatter or claim a measured joint jump.

Root next bounded experiment, only under a fresh authorization: ONE ≤10s CPU data check of the existing058E loaded curves, no new asset/build/browser. Evaluate root-relative ankle transforms at the six recorded R action times above and at recorded adjacent gait times; report relative forward/vertical displacement and entry/exit pose differences. Preserve all clocks/binds/curves. Native positions must remain labelled asynchronous observations; do not combine them into an exact world-contact trace. This decides whether existing transform paths provide any travel compensation and exposes endpoint disagreement before selecting an implementation.

Acceptance for that experiment: reproduce exact owner times/weights and output actual numerical transforms, including first failure, without applying corrective warps or claiming pads/support. A subsequent separately authorized candidate must keep one joint owner, account for native distance through R and match transition entry/exit poses. An isolated phase catch-up, time reversal or generic full-rig crossfade is insufficient. Standing R and moving R in both directions then require independent actual-play quality review; analytical success cannot approve planted contact.

Evidence/source: `.sites-runtime/overhaul-20261010/observer063-play/evidence.json`, independent `docs/overhaul/critic/observer-063-result-review.md`, `src/game/entities/identity57Runtime005.ts`, current058E manifest. One focused `tools/overhaul-gait-runtime-064/analyze.py` parsed100 saved samples and wrote `recorded-analysis.json` in .1563s. No general contact instrumentation or further058 iteration.
