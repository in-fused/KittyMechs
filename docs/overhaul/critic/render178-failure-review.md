# Rendering178 closure

Writer: CLOSED. Decision: DENY_SHIPPING178; preserve incomplete candidate and retain061 presentation unchanged.

Verified all23 CLOSED seal rows without byte-length/hash mismatches: `160d79cb495fdfed442eb3ebda366ff883dec8537cf5249a78b919f803ecd7f1`. Independently checked both restored presentation hashes against restoration178.json and confirmed `src/game/world/visibleInstances178.ts` is absent. The two restored files match the named frozen061 preimages. Candidate sources, initial fixture failure and sole fixture repair remain preserved.

The corrected16-check source fixture passes, but the remaining compiler failure is `visibleInstances178.ts(32,280): TS18048 group.count is possibly undefined`. No eligible compiled/browser candidate exists. The fixture exercises Three visibility/matrix/color arithmetic without WebGL; it cannot qualify actual extension selection, multi-draw submission, shadow pixels, context lifecycle or destruction rendering.

The measured target has49,032 triangles. Two unmatched static source cameras predict22,083–29,837 fewer selected triangles, only about2–3% of the saved1.146M frame budget. This is neither demonstrated whole-frame dominance nor measured GPU/FPS savings. The justified next finite direction is actual per-draw submitted primitive/instance attribution on retained production, to identify the dominant batch/material before choosing another representation. Do not blindly repair/retry this culling patch or infer affected-human lag resolution from source selection counts. No build/public gate or full-quality admission; no reviewer jobs or production edits.
