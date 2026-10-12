# Isolated PIE mission flow

Implemented in `Source/KittyMech/Private/Tests/KMRuntimeMissionTests.cpp`, with variants `KittyMech.Runtime.MissionFlow.AThenB` and `KittyMech.Runtime.MissionFlow.BThenA`. Both are staged for native compilation and actual execution; neither is accepted merely because this source exists.

Run each variant through `Tools/Test-Runtime.ps1 -Test MissionFlow.AThenB` or `-Test MissionFlow.BThenA`. The launcher supplies a fresh UserDir and independent expected-root argument. The test verifies the actual engine user/save paths, physical directory ancestry, empty checkpoint slot and absence of another PIE session before opening RainlineReach. It reuses the existing runtime harness's path/world helpers and never edits a real player save. Each run uses a fresh editor process so the production in-memory checkpoint cache cannot supply prior progress.

The fixture uses real objective actors through `IKMInteractable::Execute_Interact`. Its eight recorded relocations establish clear, walkable, unobstructed interaction positions; they are deliberate setup operations, not navigation evidence. Eleven interactions cover locked core/extraction, a distant relay, the chosen relay order, duplicate relay, core, extraction, duplicate extraction, extraction restart and duplicate completion. Enemy ticks and collision are suppressed explicitly while actors remain present for active-cap observations. Production mission timers, physics, checkpoint code and objective prerequisites remain active.

The stages verify:

1. Fresh state and its first asynchronous disk checkpoint.
2. Locked/distant interactions leave mission flags, serial, countdown and immediate enemy count unchanged.
3. Both relay orders produce the expected flags, core phase and weather change; core advances to extraction.
4. After the actual two-second protection interval, hostile `ApplyDamage` causes zero health/downed state and increments the damage serial. The real solo wipe marks retry pending and recovers after its three-second delay, preserving progress and restoring health/energy at clear ground near the checkpoint.
5. Extraction starts at 60 seconds and decreases while the mech occupies the pad. A duplicate interaction cannot restart it. Moving beyond the 1800 cm radius pauses it for two seconds.
6. The public controller retry API restores the checkpoint with a fresh 60-second inactive countdown. World/controller/pawn/objectives are re-resolved afterward; the same possessed mech must remain valid.
7. A restarted extraction runs for 59.5–65 seconds of actual eligible world time, with a monotonic countdown matching elapsed time within one second. Completion clears enemies, changes weather and persists the completed checkpoint. A later duplicate cannot award another checkpoint.

Nine disk observations call `LoadGameFromSlot`, checking schema, exact flags, completion bit, location, weather, seed and serial against expected transitions. Expected serials are `1,2,3,4,4,5,5,6,7`; these include observations after automatic wipe and explicit retry, rather than treating the in-memory restore as disk evidence. Each observation is recorded in `mission-evidence.txt`. Fresh-process loading of an already saved checkpoint remains a separate future test.

Stage waits are bounded to 15 wall seconds except final extraction (100); the whole fixture is bounded to 180. The default launcher timeout is 240 seconds including editor startup/teardown. Every latent-stage failure writes a FAIL receipt with its stage and reason; a failed preflight deliberately opens no world and need not write inside an unverified root. Delegate cleanup occurs on finish and destruction, and PIE teardown is separately bounded.

The launcher requires a fresh exact-name one-test automation success, PASS receipt, all milestone lines, nine disk observations, serial 7, eight relocations, eleven interactions and valid bounded extraction/wipe durations. PowerShell parsing and six synthetic receipt cases passed: valid data, missing wipe, missing disk, duplicate disk, short extraction and non-finite extraction. The record is `Artifacts/Validation/mission-runner-synthetic.json`. These are launcher-validation results, not Unreal mission results.

This standalone NullRHI fixture makes no rendered, performance, combat, navigation, physical-input, multiplayer or balance acceptance claim. Actual native compilation, critic disposition and both real PIE runs are still required.
