# Playable acceptance and evidence

Run these procedures on the packaged Win64 build after compilation and automation pass. Record build/source revision, engine version, hardware/driver, graphics settings, resolution, host/client role and test date with each result. A source review or concept render cannot substitute for these results.

## M0 smoke test

1. Launch cold at 1920x1080 on the target PC. Confirm the menu, visible world, pawn, HUD, input and audio appear without missing assets. Verify menu focus with mouse and controller, then deploy.
2. Use Pounce movement, jump, aimed leap, weapon and deflector. Check collisions and camera near buildings, slopes and cover. Confirm ability costs/cooldowns and recovery are readable.
3. Fight the initial skirmisher, complete a relay, take damage and retry. Confirm persistent objective flags, safe checkpoint placement and consistent enemy/pickup/shutter reset. Reopen the application to check the disk checkpoint.
4. Perform a 3–5 minute loop with traversal, first-time effects and combat. Record a repeatable frame capture. Do not call M0 accepted before a critic reviews the packaged behavior and evidence.

## Mission and co-op matrix

Run both relay orders with each chassis solo, then run as host and guest on the two real PCs. At each objective, test simultaneous interactions and repeated inputs; mission rewards/transitions must occur once. Check full and empty inventories, damaged and full health, repair interruption and pickup respawn. Confirm all required routes and shutters remain traversable without a particular ability.

Test revive completion, moving away, taking damage, releasing interaction, retrieval, team wipe and retry. Reconnect a guest after mission progress. Guest departure must permit solo play; host departure must explain the disconnection and return the guest offline without replacing its save. Check unknown/unreachable addresses, empty/full/stale discovery results, repeated host/join/leave actions and operation timeouts.

Repeat key interactions with 50/100/150 ms latency and 1/2/3% packet loss using an engine-supported network-emulation configuration verified for the installed engine. Record whether the specified delay is round-trip or one-way. Watch for duplicate damage, stale shields, double objectives, interrupted revive disagreement and incorrect guest checkpoints. Real separate-network EOS testing remains mandatory for the internet co-op gate.

Walk under a closing shutter, including as a delayed client; it must stop/reopen rather than trap the pawn. During extraction, leave and return to the area and rotate away from the marker. Rotate away from a downed teammate at each HUD scale: the direction and distance must remain useful.

## Focused mission and recovery checks

`./Tools/Test-Runtime.ps1 -Test Input.GamepadRemap` exercises remapping through production APIs and simulated Enhanced Input buttons in isolated PIE. It requires actual firing, shield/map activation and release after rebuild, movement release, independent device swaps, reserved/axis rejection, the swapped signature and jump, config disk reload, new-pawn inheritance and restored-default jumping. AI is explicitly frozen and a stationary high-health weapon target is created; this is an input-system check, not natural combat or a physical-controller/menu-navigation test. Keep real controller navigation and reconnect behavior in the human usability checks.

After an editor build, `./Tools/Test-Coop.ps1 -Recovery` extends the two-process localhost check with damage-interrupted revive, completed revive, shared wipe, timed retrieval and rejoin. It explicitly creates fixture damage/positions and removes enemies; it is a recovery-system check, not natural multiplayer combat or Internet evidence.

`./Tools/Test-Expedition.ps1 -Chassis Pounce` (or `Bastion`) uses normal simulated inputs and live enemies to attempt both relays, core and the full extraction timer. It preserves isolated receipts, events and movement samples under `Artifacts/Validation/ExpeditionSmoke`. It uses EditorGame with NullRHI: no rendering, performance or human-pacing claims. Both mechs now have passing runs. Earlier failures remain preserved: Bastion needed ordinary lateral movement around cover and return to its approach after combat displacement; production collision and mission limits were unchanged.

`./Tools/Test-Expedition.ps1 -Coop` runs the entire Relay Watch mission with a Pounce listen host and Bastion guest on127.0.0.1. Both navigate, fight live enemies and reach every objective; the host operates relay A/core and guest operates relay B/extraction. The launcher requires matching final mission flags/checkpoints, the full extraction duration and positive damage attributed to each player by the host's actual accepted-damage events. Saves and receipts are separate per peer; the host waits for the guest's successful completion receipt before exiting. This run uses no teleport/heal/AI-suppression fixtures. It remains an editor NullRHI localhost test, not a packaged, rendered, human or remote-network acceptance test.

`./Tools/Test-Runtime.ps1 -Test MissionFlow.AThenB` includes optional salvage eligibility, duplicate rejection, all three cache interactions, checkpoint persistence and restoration of unsaved caches. These use explicit fixture placements and authority interactions with suppressed AI; they do not establish guest collection or navigated discovery. Salvage is shared mission progress with no combat-stat bonus and is saved at the next objective checkpoint.

`./Tools/Test-Coop.ps1 -Salvage` adds guest collection through the production interaction RPC, shared availability/count, repeated requests, and synchronized unbanked-cache restoration after host retry. It uses explicit checked placements with enemies cleared. Repeated public requests may be filtered or throttled; the direct mission fixture separately verifies collection idempotency. Run this separately from `-Recovery`.

`./Tools/Test-Runtime.ps1 -Test Pickups.MobilityRefill` checks both kits through the inventory RPC and GAS activation. The capacitor readies the primary cooldown and supplies its energy deficit, preserves signature timing/combo charges, and stays in the slot when unnecessary. Resource setup/item grants are explicit fixtures; this is not network pickup acquisition or a rendered playthrough.

`./Tools/Test-Coop.ps1 -Shutter` runs separately from the other optional co-op scenarios. The host opens the actual shutter before launching the guest. The guest's first replicated-open observation must already show the fully open panel; waiting for its animation to catch up cannot pass. It then checks empty close/open, refusal to close over a stationary pawn, and automatic reopening when ordinary guest movement enters during descent. Placements and enemy removal are explicit fixtures. This is a localhost system check, not delayed-network or general collision-safety acceptance.

`./Tools/Test-Coop.ps1 -Abilities` uses mapped signature/primary inputs with Pounce hosting and Bastion joining. Both processes must observe three combo leaps, an actual leap consuming one charge, the nine-second window expiring, and Bastion's eight-second shelter reaching and expiring on both pilots. Low-energy and downed fixtures check that an otherwise ready ability is unavailable on both peers. Enemy removal, two proximity placements, a resource edit, damage and revival are explicit setup/recovery fixtures. This validates the tested localhost state replication; rendered HUD readability and adverse latency remain separate checks.

Encounter replay checks: `./Tools/Test-Runtime.ps1 -Test Encounters.Arrivals` observes actual scheduled warnings and enemy spawns in isolated PIE. It checks distinct live role/site signatures, seed rotation, retry cancellation, minimum server warning time, active-plus-pending budgets, and blocked-bay cancellation. Teleport/reset placements, direct objective interactions, suppressed enemy ticks and a collision blocker are explicit fixtures. It does not verify rendered warnings or network delivery.

Use `./Tools/Test-Expedition.ps1 -Chassis Pounce -Plan 1` or `-Chassis Bastion -Plan 2` for input-driven missions under the alternate plans. Plan0 is Relay Watch, Plan1 Bulwark Patrol, Plan2 Artillery Sweep. The driver selects the plan using the public New Expedition action before deployment; it does not edit seed or enemy health. Completion still requires actual live combat, all objectives and the extraction timer.

## Performance procedure

Use the Development package, not editor frame rate. Keep 1080p and the same graphics settings across comparisons. Record cold launch/first traversal/first ability effects separately from warm runs. Menu/loading periods may be separate captures but must never be silently removed to improve results. Record every repeatable gameplay hitch over 50 ms.

Epic documents `csvprofile start` / `csvprofile stop` for a bounded runtime capture and `csvprofile frames=N` for a fixed frame count in the [CSV Profiler guide](https://dev.epicgames.com/documentation/unreal-engine/csv-profiler?application_version=4.27). Verify the command and actual CSV format in the installed 5.8.3 build before automating collection. Keep the original capture and use Unreal Insights to investigate CPU/GPU stalls when needed.

`Tools/Analyze-FrameTimes.py` expects a simple CSV with one positive, finite duration per gameplay frame and a named header. If the native profiler includes metadata/trailer rows, export the desired per-frame timing series explicitly and retain the original alongside it. The script intentionally rejects malformed or missing samples rather than dropping them.

```powershell
python Tools/Analyze-FrameTimes.py Artifacts/Validation/gameplay-frames.csv --column FrameTime --unit ms --output Artifacts/Validation/frame-summary.json
```

Required targets: p95 ≤16.7 ms; p99 ≤25 ms; no repeatable gameplay hitch >50 ms; working set ≤8 GiB; dedicated VRAM ≤6 GiB. Percentile success alone does not pass the hitch requirement. Collect memory/VRAM separately with timestamps and preserve readings. Run a 30-minute worst-case traversal/combat/weather loop and two-hour stability session while hosting the real remote client. Log crashes, disconnects, leaks and stutter. If targets fail, reduce effects/shadows/AI cost before resolution; explicitly identify any 900p fallback.

## Visual and usability review

Compare mech and enemy silhouettes against bright/dark backgrounds and during rain. Test reduced flashes, muted audio, UI scale and lower graphics settings. Verify essential warnings retain shape/text cues. Inspect both animation loops, weapon alignment, feet on slopes, shield pose and cockpit visibility in motion.

Observe first-time players without coaching: route discovery, combat ability use, objective order, ally location, failure/recovery understanding and willingness to replay with the other chassis. Record observations rather than substituting developer intuition or one aggregate balance statistic. Every available kit must complete the mission independently.

Keep raw captures, build logs and pass/fail/revision notes in `Artifacts/Validation`. Mark each check **not run**, **pass** or **fail**; a blocked or skipped check never becomes a pass. Have an independent critic review the evidence at each gate.
