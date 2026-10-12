# Encounter replay batch: bounded acceptance

Source review found no blocking issue in three authored deployment patterns, seed/checkpoint persistence, active-plus-pending reservation accounting, exact-site arrival revalidation or retry/completion cleanup. Tactical briefings match the role assignments. Warnings have at least three seconds of server scheduling lead; this is not a guarantee of three seconds after delayed client receipt.

Editor38 failed on a local `Role` name shadowing an inherited member and a fixture timestamp narrowing conversion. Naming/type corrections did not alter encounter rules. Editor39 built successfully. The launcher receipt-selection bug and overly strict fixture placement comparison identified during review were corrected before accepted execution.

## Arrival fixture

`Artifacts/Validation/Runtime/20260927-035255-422-208300ddbedb458f85b257ac81b09cca-Encounters.Arrivals` reports native Success and launcher acceptance, zero errors and two warnings (audio initialization and GameplayCue search paths). Its three actual upper-relay role/site signatures differ across seeds 2671/2672/2673. The fixture verifies server warning deadlines, no early/duplicate/unknown/wrong-role spawn, seed-preserving retry with destruction of old warnings, and cancellation of a collision-blocked bay without relocation. Three arrivals were verified across clear and blocked passes.

Peak observed active-plus-pending budget was only two. The passing cap assertions do not exercise the six-enemy solo boundary, eight-enemy duo boundary or specialist saturation. This isolated standalone PIE fixture explicitly places the player, activates the relay and suppresses AI; it establishes neither live-combat balance nor replicated/rendered warning quality.

## Full input-driven expeditions

Reviewed receipts, results, objective events, final world samples and engine completion entries:

- Bastion / Artillery Sweep (plan 2, seed 2673): `Artifacts/Validation/ExpeditionSmoke/20260927-035554-472-Bastion-fcf600c1e6774760a3a854019a6ebf65`, PASS on Editor39. Both relays, core and extraction activated in order; production extraction completed after approximately 60 seconds. The pawn remained alive at the pad. The run recorded 15 resolved targets and actual enemy-health reductions.
- Pounce / Bulwark Patrol (plan 1, seed 2672): first run `Artifacts/Validation/ExpeditionSmoke/20260927-035355-758-Pounce-545adecfbb0c40c48fa7fa2ab730b39f` remains FAIL. A Beacon-obstructed shot and stalled right strafe left the upper-relay target unresolved at its 25-second deadline. This was an automation obstruction-recovery limit; no production collision/damage rule was relaxed.
- The narrow driver correction reverses ordinary lateral input after insufficient displacement, releases both lateral keys on exit paths and retains target/phase deadlines. Editor40 built successfully. Corrected Pounce run `Artifacts/Validation/ExpeditionSmoke/20260927-040058-931-Pounce-477f92430a60449e9745833c5e129ab2` passes. Events show the reversal, target resolution, return to the approach, upper-relay/core activation and approximately 60-second extraction completion. The pawn remained alive; 16 resolved targets and real health reductions were observed.

Accept these two specific solo Editor-game/NullRHI expeditions with live AI and ordinary simulated input. Resolved-target counts are not independently attributed kill totals. No Error/Fatal match was found in the inspected passing engine logs. This is not an exhaustive six chassis/plan combination test, a balance verdict, a human playtest, a performance result, multiplayer completion, rendered warning acceptance or packaged mission acceptance. Package12 and the separate pure-test run are outside this review until their results are available.
