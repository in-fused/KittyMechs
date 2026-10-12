# KittyMech-Web: playable release and resume handoff

**Superseded goal instructions, later October 9:** The owner cleared the old continuous goal. Do not resume it from this historical handoff. Use the [new overhaul task prompt](research/new-overhaul-task-prompt-20261009.md) only when the owner submits it; no new development goal is active. Preserve the release evidence and assets described below.

Saved October 6, 2026, before pausing continuous development at the user's request to conserve the remaining weekly allowance. Resume when the user asks after the October 12 refresh or an earlier allowance reset. No scheduled automatic resumption was created.

**October 9 research update:** Before resuming, read [the overhaul blueprint](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/docs/research/overhaul-20261009.md) and [the subscription-free asset pipeline](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/docs/research/subscription-free-assets-20261009.md). The user reports deleting the original Unreal tree and will cancel Higgsfield with no further credits/subscription. Retained Web assets are the authoring source. Research proposes replacement systems; none are admitted or shipped by that document. The development goal remains paused.

## Playable now

**Public friend link:** https://triangle-arctic-genome-encouraged.trycloudflare.com/

Refresh an already-open game tab to load the updated client. This remains a PC-hosted prototype: its local game server, Cloudflare tunnel, and awake helper must stay running. Durable hosting is deferred. The release is independently approved for its bounded tested scope; commercial AAA quality and universal destruction are not achieved.

The published package includes the admitted input protocol/life/epoch/ack fixes, PeerJS state chunking, landing jump buffer, stance and camera improvements, smoother displayed movement/yaw, cold-start cancellation and loading ownership fixes, stronger paw-contact ownership, refined Bastion armor, and atmosphere/weather depth. Existing four chassis, three theaters, Co-Op/PvP/PvPvE, missions/checkpoints, supplies, feline combat and area effects remain in the package. Shape-aware cosmetic fracture exists; experimental physical rubble remains disabled. No private Rainline city expansion, new authored gait, or full building collapse was admitted.

## Release and recovery records

All paths below are relative to `C:\Users\Taylor\Documents\GitHub\KittyMech-Web`. Do not modify sealed evidence in place.

| Record | Location / identity |
| --- | --- |
| Live complete package | `.sites-runtime/city-fidelity-001/root/admitted-release-stage-001` (1,360 files, including copied runtime dependencies) |
| Package manifest | `release-tuple.json` within that directory; SHA-256 `94b5ea23201018e6dccd7802bc616a304cb82a4f0b7479e7fc2a2bb9eac7e586` |
| Reviewed source/build | `.sites-runtime/city-fidelity-001/root/atmosphere-final-candidate-004/source.json` (605 files) and `built.json` (83 files) |
| Independent source backup | `.sites-runtime/usage-pause-checkpoint-20261006/source` (all 605 reviewed files copied and rehashed) |
| Backup manifest | `.sites-runtime/usage-pause-checkpoint-20261006/checkpoint.json`; SHA-256 `37a4a6fb79d71533478c0dc446f0c5b76e93b16aa607712a3585f6635948be90` |
| Final critic decision | `.sites-runtime/critic/city-fidelity-001/public-playable-release-result-review-001/review.json`; SHA-256 `5743f0a1f90ec0de77e3ce43df114286d72cbd1277257bab34ea0fa2dba2e1dc` |
| Old complete rollback package | `.sites-runtime/city-fidelity-001/root/playable-rollback-v16-001` (1,332 files) |
| Live service identity | `.sites-runtime/playable-live-process.json`; `.sites-runtime/live-build.json` records the package pointer |

The final critic decision is `APPROVE_BOUNDED_PUBLIC_PLAYABLE_RELEASE60583_AFTER_PVP002_WITH_FAILED_COOP001_RETAINED`. The complete reviewed source backup is independent of the working tree. Existing modified/untracked product files are intentional accumulated work, not disposable leftovers. This handoff is documentation added after the frozen release checks; it does not change the shipped runtime.

The actual server at publication was PID 321848, port 8788. Tunnel PID 283084 and awake helper PID 289500 were preserved. **These identifiers can become stale:** inspect current identity, command line, listener ownership and health before any future process action. Stop a listening service only after confirming its exact ownership and successfully observing both rooms=0 and players=0. An unavailable health response is not evidence of emptiness. The approved switch producer is `root/switch-playable-release-002.mjs`; its denied predecessor 001 remains unrun.

## What was actually verified

The public asset/protocol probe passed: all 83 served product files matched the frozen build, obsolete protocol clients were rejected, and two secure WebSocket PvP clients observed authoritative movement, upright stance, and input acknowledgement. Records: `root/playable-public-probe-job-001` under the city-fidelity directory.

The fresh public **PvP browser smoke 002 passed**: ordinary invite/join, Caracal movement and processed jump, Bastion R transformation/upright movement, and both Return-to-hangar operations. Its three screenshots were viewed by both root and critic. Records: `root/playable-public-browser-job-002`. This is functional evidence, not a WAN latency or frame-rate benchmark. The screenshots still show sparse city presentation and prototype mech surfaces.

The preceding public **Co-Op browser smoke 001 failed** after the host and guest had become ready and the UI showed two pilots: its first host actor read did not satisfy the healthy-actor assertion. The failure did not capture whether the actor was missing or dead. Idle combat death is an unproved hypothesis. Zero movement cases passed in that run. Preserve `root/playable-public-browser-job-001`, its exception, numeric exit 1 and seal; the report's stale RUNNING label is not a passing result. Both contexts closed and the rooms retired.

Earlier exact-package local tests separately passed Co-Op checkpoint/fight/late-join behavior, four forms across three maps, cold cancellation, touch, WebSocket and Peer joins. These do not replace the failed public Co-Op result. Focused release tests passed 130/130. The older broad suite recorded 1,396 passes, one known experimental-rubble failure and eight skips; do not describe it as entirely green.

Post-validation source/build/live/rollback byte checks passed. Both local and public health reported zero rooms and zero players after the test rooms retired. Closure records are `root/playable-public-validation-service-after-001.json` and `root/playable-public-byte-closeout-001.json`.

## Resume priorities and frozen work

1. **Public Co-Op host lifecycle/loading.** Reproduce the failed normal UI path with a deliberately active host. Capture raw missing/healthy/downed/dead actor state, IDs, life/epoch, loading timings and acknowledgements before making a fix. Preserve smoke 001 as the failed baseline; do not infer its cause or weaken its assertions.
2. **Rainline traversal qualification and budgets.** The private candidate is `root/rainline-slice-candidate-001`, manifest `root/rainline-candidate-assembly-job-001/candidate-source.json`. It adds four authored parcels, but has 1,205 blocks against the 1,200 cap and a conservative full-precision structural reserve of 52,670 bytes against 49,152. That reserve is not a measured transmitted snapshot. Static qualification failed three checks; pure finite terrain checks passed only their stated sample scope. It is not ready to ship.
3. **Finish the prepared native probe.** `mechs/rainline-native-qualification-002/probe.mjs` and root wrapper `root/qualify-rainline-native-002.mjs` are approved but UNRUN. Probe 001 stopped at the 12-versus-8 support-cell assertion before creating a native world: no rays, routes, damage or render cases ran. Corner geometry has eight primary and four perpendicular cap owners per face. Probe 002 explicitly qualifies ownership, native rays, damage retirement and scripted approach/climb routes. Refresh its process/source gate before execution. Foundation/terrain coplanar ties remain an unmeasured risk, not grounds to waive the guard.
4. **Prepare a fresh budget-compliant city successor.** `enemy/collider-budget-preparation-001` found no safe equivalent five-box removal. A proposed 32/28/32/28 facade-cell partition could reduce total blocks to 1,197, but changes damage granularity, IDs and total HP; it is incomplete design only, with no successor files/tests. `enemy/structure-wire-preparation-001` proposes complete dense bank tuples, exact HP and a pinned descriptor catalogue; its generator, catalogue, integration and tests are UNRUN. New layout/wire identity and full admission checks are required. Neither proposal grants unlimited density.
5. **Visible city, movement and art quality.** Prioritize ordinary play footage, four truly distinct chassis, feline pounce/tackle/dive and fluent upright strides, all-building contact coverage, damage during claw/landing interactions and eventual support-based collapse. The full-map design iteration 008 remains denied for road/corridor conflicts; iteration 009 rerouting is unrun. Render and measure actual private city traversal before claiming density/performance gains.
6. **Lower-priority numerical gait diagnostic.** `.sites-runtime/upright-source-numerical-diagnostic-001/mechs` is static preparation only and lacks a fresh root execution wrapper/gate. Earlier private walk 003/004 tests did not admit GLB or clips; tiny numerical endpoint criteria are not visible movement-quality proof. Avoid spending the next allowance on repeated diagnostics without player-visible benefit.

For the detailed city state, read `root/city-design-iteration-008.json` and the corresponding critic result reviews. Do not overwrite failed records or reuse their job names for a rerun. Fresh bounded successor jobs must retain existing guards and receive independent critic review before product admission/publication.

## Assets, open source and constraints

`docs/open-source-upgrades.md` preserves official-source compatibility and license research. Three-piñata supplied an isolated baked cosmetic fracture foundation; physical rubble is still denied. Navcat/Recast/Yuka and Quarks trials remain uninstalled/unadmitted; ground navigation does not solve claw gripping. Installed Three r180 and Rapier 0.19.2 remain unchanged. The attempted Rapier 0.21 qualification had failures; do not upgrade reflexively.

The earlier Higgsfield production bank used **943.75 net paid credits**, retaining 55 images and 16 silent motion references; four runtime base colors were admitted. The last observed balance was zero. The paid reference bank/backups and provenance remain available, including `.sites-runtime/release-821d4f4b8b14a38d676a9be98548249ed7c048f3.json` and production backups. Those videos/images are not editable rigged meshes or gameplay animation clips. Use retained material for fitted art/animation; do not claim another 900 credits are available or purchase a top-up implicitly.

At the October 6 checkpoint the original `C:\Users\Taylor\Documents\GitHub\KittyMech` was read-only. The user subsequently reported deleting it; continued work must depend on retained Web assets, not the old tree. Work only in KittyMech-Web.

## First actions on resumption

Read this document and `docs/progression-requirements.md`; inspect git status and the goal state. Revalidate the current public/local service and live package identity. Preserve the independent source checkpoint, rollback and all candidate evidence. Refresh stale process/protector identities rather than copying historical PIDs. Use one root-owned runtime/native/browser lane and bounded static specialist tasks with an independent critic. Execute the highest-value unresolved issue above, then review the exact candidate and real play evidence before publishing. Do not replay every historical suite without a change or unresolved failure that warrants it.

The continuous goal is intentionally paused after saving this release and handoff. Pending work is preserved, not marked complete.
