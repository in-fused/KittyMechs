# Salvage and expedition batch review

Editor31 compiled successfully (`Artifacts/Validation/editor-build-31.log`). Independent review found no blocking source issue in authority collection, the replicated shared mask, additive save compatibility, checkpoint restoration or new-expedition reset.

## Actual salvage mission result

Reviewed `Artifacts/Validation/Runtime/20260927-022319-373-cfa4c2ddb6084ad397414110a18f5b6e-MissionFlow.AThenB`: launcher acceptance, native Automation index, runtime log, mission receipt and the current disk-check assertions. Native result is Success with zero errors and one warning; the isolated save file exists under that run's `User/Saved/SaveGames`.

Accept the bounded salvage/state result. The run records 17 interface interactions, 12 fixture relocations and nine successful disk observations. It rejects distant collection and invalid masks, keeps duplicate collection idempotent, restores uncheckpointed salvage after retry, collects all three authored caches, and restores only the previously saved cache after retry. `DiskMatches` loads the actual save and requires the expected salvage mask: zero initially, then one through the remaining checkpoints and completion. The compact disk log does not print that mask; this conclusion comes from the executed assertion plus the passing result, not an independent binary-save decode.

Existing mission/recovery assertions also passed: both relays, core, extraction pause/retry, real 60-second extraction, completed checkpoint serial 7 and post-completion recovery without rewinding Complete.

This is standalone PIE/NullRHI with explicit placements and suppressed AI. It verifies interaction/state/timer/save behavior at the three sites; it does not prove navigated discovery, guest RPC collection, rendered prompt readability, historical save migration from an actual old file, or packaged behavior. No new blocker was found within this scope.

## Corrected Bastion expedition

Reviewed `Artifacts/Validation/ExpeditionSmoke/20260927-022539-899-Bastion-562b760b065f484db336cfd63e94a7c7` receipt, result, events and final world samples. Retain FAIL: the core phase exceeded its 150-second deadline. The lateral-input correction did clear the Beacon obstruction; the shot path reopened and enemy 11 resolved. The run records 11 resolved targets and actual enemy-health reductions, but neither core activation nor extraction occurred.

After combat moved the pawn away from the consumed final waypoint, it remained near (9009,-1559,2127), outside core interaction range, until the phase deadline. This exposes the driver's missing return-to-approach behavior; it does not establish a production mission or chassis failure. The earlier blocked-shot failure remains preserved in `gameplay-recovery-batch.md`.

Reviewed the next narrow driver correction: when a target resolves after the route is exhausted and the pawn is more than 150 cm from its final waypoint, resume the last two existing approach waypoints using ordinary input. It releases combat input, refreshes only route progress, and retains phase/target deadlines. No concrete source blocker found.

## Bastion third attempt: accepted within scope

Independently reviewed the result, receipt, milestone events, final world samples and engine completion entry for `Artifacts/Validation/ExpeditionSmoke/20260927-023141-779-Bastion-185f4d0b999c4f9c956a6c4af4258679`. Accept its full solo expedition PASS. Both relays, core and extraction activated in order with checkpoint serials 2/3/4/5. The same Beacon obstruction occurred, the shot path cleared, and the new return-to-approach event was followed by core activation. Production extraction completed after approximately 60 seconds; the player remained alive at the extraction pad. The inspected log contains no Error/Fatal match.

The driver records 20 resolved targets, 28 firing presses and 1574.4 observed enemy-health reduction. These establish live-combat activity, not an independently attributed kill total. The run took 232.421 seconds within the driver (244.554 seconds for the launcher/process interval).

The two earlier failures remain evidence of the automation limitations corrected above. This passing result is one scripted Bastion route in Editor-game/NullRHI with live AI and ordinary simulated input. It does not establish rendered quality, performance, human enjoyment, multiplayer completion, packaged full-expedition behavior or salvage discovery during navigation. Package09 acceptance is separate.
