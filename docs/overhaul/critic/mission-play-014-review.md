# Ordinary mission014 working review — October 10, 2026

**APPROVE the recorded required-objective route, extraction outcome and bounded client-state agreement. DENY acceptance of finished mission art/motion or complete cooperative lifecycle.** This is a working review, not Gate 1 acceptance. Gate 1 remains **INCOMPLETE** and formal verdicts/counts are unchanged.

## Evidence bounds

Read mission014 `evidence.json`, viewed `ordinary-route-review.png` and `extraction-video-frame.png`, and read `docs/overhaul/mission-play-013.md`. Capture paths are under `.sites-runtime/overhaul-20261009/mission-014/`. The evidence names build-010 and a 1440×900 viewport; the host video is recorded at 640×400. No guest video exists. The supplied route montage contains host frames labeled video 15, 70, 105, 165 and 210 seconds. No continuous playback, fresh extraction, browser/native job, test, implementation or independent build rehash was performed during this review.

The packet describes two actual UI clients driven by an adaptive keyboard/UI pilot reading diagnostics without changing game state. This establishes a successful diagnostic-assisted route, not unaided discovery, hands-on input feel or a simultaneous audiovisual inspection of both clients.

## Outcome and synchronization

Both snapshots agree at each required-objective checkpoint:

| Recorded event | Host/guest tick | Completed required objectives | Checkpoint |
| --- | ---: | --- | --- |
| West relay | 3746 | WEST RELAY | relay-west |
| East relay | 5856 | WEST + EAST | relay-east |
| Core | 9426 | WEST + EAST + STORM CORE | core |
| Extraction | 12916 | WEST + EAST + CORE + EXTRACTION | core |

At extraction, both have native time **215.266667**, `phase: extracted`, required progress values 1, and identical player records. MissionHost finishes at **220 HP / 4 kills / 540 salvage**; MissionGuest at **220 HP / 2 kills / 70 salvage**, both alive and not downed in that snapshot. The host result image says extraction confirmed / “Home in one piece” and shows **4** defeats and **540** salvage, matching its state. Both transports are connected with `phase: results`, zero schema/local-ACK/decode failures, no close/error, and admitted tick 12916. Page errors are empty.

All 23 recorded event pairs have identical objective records. Intermediate travel/encounter reads often have different ticks and consequently different instantaneous player positions; that is not evidence of divergence. Exact player/checkpoint equality at the named matched-tick endpoints is useful agreement, but cannot certify every transient or the guest's rendered result screen.

The prior return-route formation obstruction no longer prevents completion. That is a useful ordinary pilot correction, with original collider behavior retained according to the packet. The final full-health values do not mean no threat: intermediate records include host HP 183.7 and guest HP 111.1 during encounters. Six total credited defeats are established by the final player records; tracking labels alone do not prove the exact last hit of every encounter.

## Visible presentation and remaining limits

1. **The observed route still lacks a finished district identity/density.** The 15/70/105-second views have usable street edges, lamps, parked vehicles, overhead structure, signs and recognizable squad silhouettes. These help navigation. However, repeated cream two-storey rectangular buildings, teal window grids/doors and flat roofs dominate multiple angles; broad bare road/paving remains conspicuous. The 165-second view opens directly onto a sparse flat perimeter with thin trees. Distinct signs add landmarks, but these views do not earn approval of a densely populated, coherent district. This is an observed presentation concern, not a claim about every unseen route.
2. **Mission success does not qualify gait/contact or combat feel.** The stills show different mech limb/body poses and readable teammates, and the extraction card clearly communicates success. At 640×400, fine paw contacts and distant enemies are difficult to inspect. These widely separated frames cannot establish planted feet, weight transfer, smooth turning, stance transformation, animation timing, impact or skating-free motion. No motion defect is invented from a single airborne-looking pose; full art/movement/combat acceptance remains withheld.
3. **The CPU stall remains a concrete reliability limitation.** Recorded tick **5049** takes **1729.6105 ms**, with **1723.737 ms bot input**, **1687 ms CPU**, world step **0.5413 ms** and locomotion **2.9285 ms**. The underlying bot/path cause is still unidentified. Between staging and extraction, native time advances **203.4167 s** over **206.211 s** wall time, while cumulative clipped time rises **2.6385 s**. Completion is real, but this does not establish dependable frame pacing or performance. Final host/guest FPS 55/56 are isolated samples, not distribution or 60-FPS qualification. Mission013's earlier bot-stage stall is relevant unresolved history, not a new failure count.

Real revive, all-down failure, retry/checkpoint restoration, late join, disconnect/reconnect and teardown remain **UNPROVED**. Optional SKY UPLINK/CITY GRID are not completed in the final records. Authoritative pickup ownership, full art/movement/climbing, paired physical combat, consequential persistent destruction and their integration remain incomplete; this packet contains no qualifying demonstration of them. Preserve the successful mission route as a bounded gain without substituting it for those required gates.
