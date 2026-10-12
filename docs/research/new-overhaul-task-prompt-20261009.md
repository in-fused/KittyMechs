# New KittyMech overhaul task prompt

Drafted October 9, 2026 after the owner cleared the previous goal. **This document has not been executed.** Submitting the prompt below authorizes a new finite development goal. It does not revive the old continuous goal or create a scheduled loop.

Copy the text between the rules, or submit: “Execute the complete prompt in `C:\Users\Taylor\Documents\GitHub\KittyMech-Web\docs\research\new-overhaul-task-prompt-20261009.md` as my new KittyMech overhaul task.”

---

Create a new finite goal: rebuild KittyMech into a cohesive, highly polished, browser-playable feline-mech combat prototype with four distinct mechs, three substantial populated maps, Co-Op mission progression, PvP/PvPvE, universal structural climbing and consequential destruction. Aim for the movement, art direction and impact expected of a premium action game. Do not claim an AAA rating or complete the goal merely because assertions pass or the account allowance is nearly exhausted.

Work only inside `C:\Users\Taylor\Documents\GitHub\KittyMech-Web`. The previous continuous goal was cleared. Do not restore its patch-by-patch workflow. The original Unreal project was deleted; it is not a dependency. Keep this browser-first and do not use Unreal. Preserve the current playable release, intentional working changes, source assets, retained Higgsfield outputs and editable Blender files before replacing systems. Never discard them during cleanup or a fresh checkout. Verify a recoverable local source snapshot, including large ignored assets, before destructive operations.

Read these existing documents once, then inspect the actual current implementation to resolve discrepancies:

- `docs/research/additional-references-20261009.md`
- `docs/research/overhaul-20261009.md`
- `docs/research/subscription-free-assets-20261009.md`
- `docs/progression-requirements.md`
- `docs/resume-after-usage-reset.md` for historical release evidence, not instructions to resume the old goal.

Use the linked TitanCraft, Tokyo, Teleoperator, Gigacity and kaiju examples as design references. Distinguish inspected behavior/source from creator claims. Study ideas, not unlicensed copies. “Custom engine” means permission to build an appropriate simulation, animation, streaming and game layer; it does not require writing every graphics primitive from scratch. Model names and one-prompt claims are not production evidence.

## Choose the architecture through a bounded comparison

Do not treat the current R3F architecture as mandatory. Compare its repair/replacement path with a lean imperative Three.js/TypeScript runtime, using the same small representative content. Evaluate WebGPU/TSL where it delivers a visible or measurable benefit; retain a genuinely playable compatible rendering path where needed. No prolonged engine bake-off: at most two candidates and one architecture decision, documented with ordinary play captures and frame-time evidence. Avoid rebuilding good networking or authoring infrastructure without a demonstrated reason.

Keep simulation authoritative and separate from presentation. Use fixed-step movement/contact/combat, interpolated rendering, an explicit input action map, one coherent animation owner, serializable world state, and stable asset manifests. Choose units, rig pivots, collision proxies, LOD and material conventions early. Use one compiled structural representation to derive visible building parts, collision, climbing surfaces, damage and support connectivity. Preload physical terrain/structures before the player can enter a region; cosmetic loading must never spawn an obstacle through a player.

Target Taylor's actual GTX 1070 Ti / roughly 16 GiB RAM and common desktop browsers. Measure the selected implementation on the available machine. Aim for smooth 60 FPS at an appropriate balanced preset; report measured limits instead of promising that target. Bound active physics, debris, lighting, draw calls and memory. Distant visual detail may be simplified; nearby interaction and structural state must stay correct.

## Build the player fantasy, not more disconnected effects

**Four individual mechs.** Pounce, Bastion, Lynx and Caracal need recognizably different silhouettes, proportions, armor, materials, heads, tails, rigs, weight, gaits, traversal timing, attacks and defenses. Suggested roles are agile hunter, heavy defender, mobile recon and support/rescue. Color changes and scalar speed differences are insufficient. Ordinary gameplay cameras must show detailed, coherent finished models comparable to the intended title art. Create editable Blender masters and optimized GLBs, not decorative reference pictures standing in for game assets.

**Convincing movement in both stances.** Quadrupeds need fluid acceleration, spine/shoulder/hip motion, stable contact, rear-leg launch, high agile leaps, landings and recoveries inspired by real cats and Stray. Upright mode needs weight transfer, longer purposeful strides, turning and independent upper-body action, rather than quadruped stepping scaled vertically. R must transform smoothly while retaining momentum, grounded contact and camera continuity. Different mech anatomies need different choreography. Responsiveness comes before elaborate transitions that lock out controls.

**Universal climbing.** Every building and reachable structural class on every map must accept claws at the actual supported contact position: any facade side, corner, roof edge, bridge, gantry or appropriate prop. No climb strips, preselected grip spots or invisible wall carriers. Support airborne pounces, lateral catches, corner/roof transitions and reattachment. A hard landing damages the contact area; moving claws chip local material. Intact supporting geometry retains grip and removed geometry loses it. No floating grips, stale roof destinations, clipping or per-tick damage from a stationary hold. Keep movement, collision, camera and animation coordinated.

**Paired feline combat.** Implement readable, satisfying pounces, tackles, dives, pins, claw combinations and escapes against enemies and other mechs. Coordinate attacker and victim states with swept contact, momentum, anticipation, impact, recoil, recovery, cancellation and counterplay. Do not substitute a projectile or particle burst for physical contact. Give each chassis distinct offensive and defensive mechanics. Enemies need meaningful roles, telegraphs, pursuit, evasion and reactions to terrain, teammates and damaged structures. Preserve cooperative friendly-fire rules and clear life/revive states.

**Dense worlds with consequential destruction.** Build coherent, varied, extensively populated Rainline, Ember and Frostline environments. Author district/street rules and structural kits, then use seeded variation, instancing, LOD, facade/interior illusions, vegetation, traffic and atmospheric depth where appropriate. Make rooftops clean and usable. Visual density must extend through ordinary routes rather than one screenshot viewpoint.

Make every building destructible through damage to actual components and load paths. Contact location, damage direction, material and remaining supports must affect fractures, falling pieces and collapse. Use prefractured clusters, structural graphs, hybrid voxels or another justified representation. Persistent openings and ruins must update collision, grip, navigation and mission space together. Dust, temporary cubes and disappearing facades alone do not qualify. Synchronize important destruction and ruin state; cap active fragments and settle them into stable representations without restoring intact walls. Quality presets cannot turn destruction into a different game.

**A cooperative game with progression.** Fix existing multiplayer lifecycle failures before expansion. Provide missions with multiple objectives and checkpoints, revive/rescue, shared progress, synchronized combat/destruction, late joining and a clear win/fail/retry loop. Include useful randomized pickups and powerups with authoritative spawning. Preserve and improve PvP/PvPvE as well as Co-Op. Add weather possibilities, area effects, audio and readable feedback that support movement and combat. Keep the existing prototype friend-link approach working where available; durable hosting/accounts are a later project, not a dependency or a completion claim.

## Produce assets without another paid service

Higgsfield has no credits remaining and will be cancelled. Do not buy credits, call paid asset-generation APIs, introduce paid subscriptions, or replace it with an unreliable hosted demo quota. Reuse retained images/videos as art and choreography references within their terms. They are not rigged animation clips; create actual skeletal animation and paired actions in Blender. Do not train or fine-tune replacement models on those outputs.

Use local Blender, existing authoring tools and verified free/open assets and CC0 materials. Admit each asset/library only after checking its actual license, attribution, compatibility and provenance. Reference-site code/assets are not automatically reusable. Optional local generators must pass a small hardware-appropriate test before becoming dependencies; avoid large-model installation detours. The game must launch and play without an asset-generation provider.

## Deliver in finite, playable stages with independent review

1. Preserve the current release and assets. Capture a brief baseline of the reported movement, climb, combat, roof and multiplayer defects. Set the architecture and asset contracts.
2. Replace the core experience in one connected, densely dressed playable district: a detailed Pounce with both stances, paired combat, climbing on every building, local wear and support-based collapse, plus a cooperative mission with a checkpoint/revive and two-client synchronization. This must be actual normal play, not a scripted showcase or an isolated test wall. Destruction and populated city art belong in this first integrated delivery.
3. After the critic accepts those systems, extend them to all four mechs, all three extensively populated maps and the full mission/mode set. Do not call the one-district stage the finished game or silently defer the difficult requirements.
4. Polish camera, movement, animations, collision, effects, audio, loading, performance and multiplayer. Deliver a playable release, controls, measured limitations and durable build/source documentation.

Use bounded parallel specialists when ownership is separable: at most two implementation specialists plus one independent critic, with the primary agent responsible for integration and browser testing. Choose reasoning effort according to difficulty instead of running all work at maximum effort. Give the critic authority to APPROVE or DENY each integrated milestone. The critic must review ordinary play captures, gameplay code where relevant, two-client evidence and performance, and can deny technically passing work for weak animation, clunky controls, unconvincing art, shallow combat or fake destruction. The critic is not a second implementer or a rubber stamp. Prompt/research approval is not release approval.

Use focused meaningful tests for simulation, contacts, support loss, synchronization and lifecycle, plus actual gameplay inspection. Avoid repetitive proof loops and tests that merely mirror implementation. If the same quality gate fails twice, reassess the underlying design instead of indefinitely adjusting constants. Be candid about anything not actually tested or rendered.

Proceed autonomously within these boundaries; do not stop at a plan or request routine permission already granted here. Keep recoverable playable checkpoints. If usage limits interrupt development, save the latest working build, exact critic verdicts, source assets, outstanding defects and a concrete next action for resumption. Leave the goal incomplete when required work remains. Do not create recurring automations or an endless improvement loop. Complete the new goal only when the specified prototype is playable and independently accepted across its full scope.

---

The eventual acceptance gate is a prototype gate, not proof of commercial release readiness, an external star rating, or the original references' claimed production costs.
