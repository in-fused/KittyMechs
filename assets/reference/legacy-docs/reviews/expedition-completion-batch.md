# Expedition completion and replay review

Disposition: no blocking issue found in the production source or the completed standalone mission fixture. Rendered and guest-runtime results remain unverified.

`RetryCheckpoint` now returns on Complete before clearing enemies, restoring checkpoint state or resetting players. `StartNewExpedition` deliberately changes phase first, so its existing reset remains valid. This prevents a completed expedition being rewound by F5 while preserving explicit replay.

The local controller observes completion and mission seed changes. First completion opens results; dismissing the menu does not change that observation, so subsequent ticks do not reopen it. Leaving Complete or observing a new active plan reopens deployment. The menu refreshes actual plan, relay/core flags and shared salvage, gives the host the replay action, and gives guests waiting/return controls. Replay still uses the existing local-authority-only public action; no session travel, pawn replacement or preference reset was introduced.

This is source review, not confirmation of guest replication timing, rendered layout, physical menu navigation or an actual completed replay cycle. The existing mission fixture extension will provide the next bounded evidence.

The frozen AThenB fixture extension also has no blocking source finding. It selects Bastion/Mochi through public station calls, preserves the existing extraction/save/recovery stages, then checks automatic menu opening, 1.2 seconds of persistent dismissal, and public retry preserving completion for another 0.5 seconds. Public New Expedition must retain the same pawn and selected kit/pilot, reset mission/salvage/weather/extraction, rotate to seed2672 and reopen the menu; success waits for the actual tenth disk snapshot. BThenA retains its original nine-snapshot completion endpoint. Launcher assertions run after loading the native receipt. These checks are explicitly standalone PIE with existing relocation/AI-suppression fixtures, not co-op guest or rendered navigation acceptance.

## Actual mission result

Editor47 compiled successfully. Reviewed `Artifacts/Validation/Runtime/20260927-055340-826-b50dd3af9d0d49a69461e345078e456b-MissionFlow.AThenB`: `Automation/index.json` records Success, zero errors and two warnings; `mission-evidence.txt` reports PASS at `new_expedition`; `acceptance.json` confirms `passed_world_checks_only`. The warnings concern audio raw-mode initialization and unspecified GameplayCue search paths, not a failed replay assertion.

The 72.837-second fixture retained a real 60.091-second extraction and recorded ten disk observations. Completed snapshot8 has serial7, flags111, complete1 and seed2671. Replay snapshot9 has serial1, flags000, complete0, weather0 and seed2672. The actual save exists under this run's isolated `User/Saved/SaveGames`. The fixture's native disk-loading assertions, rather than an independent binary decoder, establish those saved fields.

Receipt milestones confirm automatic results opening, dismissal staying closed, completed public retry leaving completion intact, and new-expedition menu reopening with the same Bastion/Mochi pawn. Existing post-completion fall recovery also remained successful. Setup explicitly includes12 relocations,17 interactions and suppression of4 enemies; this is mission/menu-state/timer/disk evidence, not a natural combat playthrough. It does not establish rendered results layout, physical menu interaction, a guest's replicated replay transition or packaged behavior. No extra test was run for this review.

Root packaging follow-up: Package15 built successfully (377.61s,49files,1,005,149,977bytes; recorded input hashes unchanged). Its normal packaged D3D11 launch passes at RenderSmoke/20260927-060321-921-1803560bbaae4db9bb60567371c8e9ac. Root inspected the actual1920x1080 district/HUD PNG. This is packaged launch evidence, not a rendered completion-panel or guest-replay acceptance.
