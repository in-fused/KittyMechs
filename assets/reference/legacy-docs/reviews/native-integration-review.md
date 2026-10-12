# Independent native integration review

Evidence snapshot: 2026-09-26, updated after the 17:32 UTC MapSpawn result. Reviewer inspected artifacts and installed Unreal 5.8.3 source; this reviewer did not launch Unreal, UBT, content imports or runtime tests. Paths below are relative to the repository root. These results establish build/import and bounded automation progress, not playable-slice acceptance.

| Gate | Observed evidence | Disposition |
| --- | --- | --- |
| Native Game build | `Artifacts/Validation/game-build-03.log`, final `Result: Succeeded`, `Binaries/Win64/KittyMech.exe` output | Passed for that build snapshot. This preceded the latest explicit-scheme network fix and does not certify later source revisions. |
| Native Editor build | `Artifacts/Validation/editor-build-03.log` and `editor-build-05.log`, final `Result: Succeeded` | Passed after the explicit-scheme fix and runtime-test integration. Build 04 caught a private `FPaths::CustomUserDirArgument` call missed in source review; build 05 uses explicit argument parsing plus public actual user/save directory checks. |
| Bootstrap content | `Artifacts/Validation/content-report.json`, `content.log`, `content-launch-01.log` | Unreal `5.8.3-58210709+++UE5+Release-5.8` verified all 11 required map/material/data/audio entries. Content creation is not a rendering or gameplay test. |
| Mech import | `Artifacts/Validation/mech-import.json`, `model-import.log`, `models-launch-01.log` | Both skeletal meshes imported, each with Idle/Walk sequences, sharing `/Game/Mechs/Pounce/SK_Pounce_Skeleton.SK_Pounce_Skeleton`. Heights: Pounce 384.151 cm, Bastion 384.176 cm. Receipt FBX hashes independently recomputed and matched. Geometry remains M0 prototype quality. |
| Native bounded automation | `Artifacts/Validation/Automation/20260926-172205-329/index.json`, `test-launch-02.log` | Exactly three Success results, zero warnings/errors: `KittyMech.Mission.CheckpointValidation`, `KittyMech.Mission.RelayOrderAndIdempotence`, `KittyMech.Network.DirectAddressValidation`. These are focused logic/URL tests, not full mission or network-session tests. |
| Standalone world spawn | `Artifacts/Validation/Runtime/20260926-173127-040-51968ff1092842f1a41493127eeea120-MapSpawn/Automation/index.json`, `runtime.log`, `mapspawn-evidence.txt`, `launch.json`, `acceptance.json` within the same run directory | Independently accepted bounded MapSpawn pass: exact test Success, zero errors, one GameplayCue search-path warning, process exit 0. NullRHI; no rendering, networking or performance acceptance. |

The earlier `Artifacts/Validation/Automation/20260926-171800-990/index.json` is superseded for direct-address validation. Its failure exposed Unreal's legacy single-label hostname/protocol parsing. The fix constructs an explicit configured Unreal scheme and retains host/port/internal/nonlocal/options checks; installed `URL.cpp` and the subsequent native passing test support that correction.

Independent source review also caught that `ADirectionalLight::GetComponent()` is editor-only. The Game-compatible inherited `GetLightComponent()` replacement is in the successful Game build. Runtime test isolation was reviewed against installed `Paths.cpp` and `SaveGameSystem.h`: the dedicated launcher supplies a fresh `-UserDir`, and C++ verifies the resulting Saved path before loading a map or starting PIE. Ordinary mission/network automation must exclude runtime tests requiring that launcher.

## MapSpawn evidence and limits

The launch manifest, actual engine command line and world receipt agree on the unique isolated `User/Saved` directory. `User/Saved/SaveGames/KittyMech_Expedition_v1.sav` physically exists there (2,151 bytes; written 17:32:02 UTC). The native test loaded this disk checkpoint, checked compatibility and matching serial 1, then completed its teardown checks. The native assertions and receipt establish one builder, mech, shutter and possessed controller; four objective actors; two pickups; one initial enemy; grounded, nonpenetrating deployment at `(0, 0, 117.150)` cm. The launch manifest module SHA256 also matched the current Editor DLL when independently recomputed. The inspected world had advanced to 1.408 seconds; the automation test took approximately 4.58 seconds overall.

This proves initial standalone world assembly, floor/capsule checks and initial checkpoint persistence under the tested configuration. It does not prove mission completion, combat quality, long traversal, revive behavior, later save/reload cycles, two-player sessions, imported mech presentation or sustained stability. The single warning says no explicit GameplayCueNotifyPaths were configured and the ability system scanned `/Game`; it is a recorded warning, not a zero-warning pass. `launch.json` intentionally retains its initial launch status; `acceptance.json` records the completed bounded acceptance.

## Pending evidence

Subsequent evidence updates below supersede earlier pending items only within their stated scope. Packaged rendering and static art inspection are recorded separately in `packaged-render-first-review.md` and `unreal-art-first-render.md`.

- Rerun ordinary mission/network tests through their narrowed filter; report 02 above is the verified pass at this snapshot. Further world tests must retain strict save isolation.
- Complete packaging and exercise the actual packaged executable. A Game compilation is not a package/cook/launch result.
- Inspect both imported mechs in a rendered editor scene: facing, canopy transparency, material assignment, scale and actual animation deformation. An imported bounds report does not establish these properties. Engine LOD attachment, capsule fit and pawn mesh activation remain separate work.
- Validate solo mission traversal/checkpoints/combat and two-PC co-op lifecycle under latency and disconnects.
- Measure frame times, memory and sustained stability on the user's hardware. NullRHI automation cannot establish graphics quality or 60 fps.

## Inspection-script review

`Tools/Unreal/inspect_mechs.py` is a separate editor staging scene and does not enable gameplay meshes. Installed mesh/bone, viewport, text, light and exposure APIs were checked. Requested changes were implemented and independently rechecked: disk `.umap` detection through the level subsystem; preservation of partial/authored maps with an explicit incomplete status when required actors are missing/wrong; and measured actual actor transforms. The owner also added `EditorPythonScripting.set_keep_python_script_alive(True)`; installed `EditorPythonExecuter.cpp` confirms this prevents automatic editor shutdown after `ExecutePythonScript`. Camera actor FOV and viewport framing are distinct unless the camera is piloted. Source review accepts staging for execution, with no visual acceptance implied.

## Pounce connector traversal: actual bounded pass

Independently reviewed `Artifacts/Validation/Runtime/20260926-183551-256-53ea7752c38a44c880adb3ab90721c8b-UniversalRoutes.Pounce/`: native `Automation/index.json`, `routes-evidence.txt`, launch/acceptance receipts, and log completion. Exact test `KittyMech.Runtime.UniversalRoutes.Pounce` succeeded with zero errors and one recorded GameplayCueNotifyPaths warning. Engine automation exited with code 0.

All six authored connector directions passed: south up/down, west up/down, north up/down. Evidence records 3,364 actual world input ticks, six disclosed setup teleports, zero route teleports, zero jump/ability calls, and zero falling samples. The south/west routes took about 12 simulation seconds each; north routes about 5.9. Requested setup positions settled at the expected 2.15 cm engine floor clearance. These timings are traversal measurements, not rendering performance.

This NullRHI standalone PIE fixture removes enemies, including proximity guards (four recorded), and proves Pounce's walking passage along these six tested lines under the current geometry. It does not prove every map route, combat under pressure, Bastion, network traversal, player-control ergonomics, or graphical performance. Launcher records editor-module SHA-256 `FB5B78F076193A9038458FF4939B72876FCDE6AEA394693BBC05FCA71D93242D`; the completed acceptance status is `passed_world_checks_only`.

## Bastion connector traversal: actual bounded pass

Independently reviewed `Artifacts/Validation/Runtime/20260926-183803-358-7b0dd7aac23646569226214c63b789c2-UniversalRoutes.Bastion/`: exact native test `KittyMech.Runtime.UniversalRoutes.Bastion` succeeded, zero errors and one warning; the process log ends with exit code 0 and the wrapper records `passed_world_checks_only`.

All six connector directions passed at the actual Bastion speed cap of **560 cm/s**, with capsule radius 62 cm / half-height 125 cm, health 340 and energy 100. Receipt records 4,522 actual input ticks, six setup teleports, zero route teleports, zero jump/ability calls, and zero falling samples. South/west directions took 15.979–15.991 simulation seconds; north up/down took 7.743/7.696 seconds. Setup clearance was 2.15 cm on each route. Four enemy actors were removed by the declared fixture.

Together with the preceding Pounce result, this supports walking passage through all three tested connectors in both directions for both current chassis. It remains geometry-only NullRHI evidence, with enemies suppressed, fixed test lines, and no input-device, networking, graphical, or broader gameplay-quality claim.

## Mission A-then-B: actual state/timer/disk pass

Independently reviewed `Artifacts/Validation/Runtime/20260926-184146-934-77ac0f0fd30e44f6a9021ca810c39313-MissionFlow.AThenB/`: exact native `KittyMech.Runtime.MissionFlow.AThenB` test succeeded, zero errors / one warning, with matching completed wrapper and mission receipts. The isolated `User/Saved/SaveGames/KittyMech_Expedition_v1.sav` exists physically (2,382 bytes, modified 18:43:20 UTC within this run). Save-directory paths agree with the launch/mission evidence. The fixture's native load-and-compare assertions provide the save-content evidence; this reviewer did not separately decode the binary save file.

The receipt records eleven public objective interactions, eight explicitly disclosed setup relocations, nine native disk snapshots, a real 3.108-second solo wipe recovery, and a real 60.003-second final extraction. Snapshot serials are 1,2,3,4,4,5,5,6,7. Final snapshot records both relays and core, completed flag true, weather 2 and serial 7. Locked/range/duplicate rejection, outside-radius extraction pause, public checkpoint retry, recovery preservation and stable completion assertions passed.

Twelve enemy instances had AI/collision suppressed by this fixture, with two maximum simultaneously present. This proves bounded solo mission state, public interaction, real timer and disk persistence behavior for A-then-B in standalone PIE. The eight placements are not a traversed gameplay route. This is not a combat playthrough, player-input test, fresh-process checkpoint-load test, B-then-A result, rendering test, co-op test, or performance measurement.

## Mission B-then-A: actual state/timer/disk pass

Independently reviewed `Artifacts/Validation/Runtime/20260926-184351-150-486665b8f98a4e99ad07d887a8e73020-MissionFlow.BThenA/`. Exact test `KittyMech.Runtime.MissionFlow.BThenA` succeeded with zero errors / one warning; log exit code 0 and completed acceptance receipt agree. Its isolated save file exists physically at `User/Saved/SaveGames/KittyMech_Expedition_v1.sav` (2,382 bytes, modified 18:45:23 UTC within the run).

Eleven public interactions, eight fixture placements and nine native load-checked disk snapshots passed. First relay snapshot correctly records flags `010` and relay B's upper location; second records `110` and relay A's lower location. Serial sequence is again 1,2,3,4,4,5,5,6,7, ending with completed flag true and weather 2. Real wipe recovery took 3.084 seconds and final extraction 60.089 seconds. All rejection, pause, retry, recovery and stable-completion receipt flags passed. Thirteen enemy instances were suppressed, maximum two concurrently present.

Both relay orders now have bounded interaction/timer/save evidence. The same fixture limits apply: AI/collision suppression and explicit placements prevent any inference of a combat playthrough or end-to-end navigated mission, and this does not establish fresh-process load, networking, rendering or performance behavior.

## Actual enemy ascent: two bounded pursuit passes

Reviewed `Runtime/20260926-190616-187-3c771fa0204f4eb1abc3caa73f716140-EnemyPursuit.South` and `Runtime/20260926-190738-983-f6c6869b2fe94ab2a2c6f76e6b2141b9-EnemyPursuit.North` under `Artifacts/Validation/`. Each exact native test reports Success, zero errors and one warning, with completed launcher acceptance and matching pursuit/support receipts.

South took 20.886 simulation seconds, 1,253 world ticks and 207 logged samples. North took 10.705 seconds, 642 ticks and 106 samples. Each uses one disclosed player placement, one enemy spawn, one other enemy removed, and zero pursuit teleports. The controlled skirmisher retains production AI and collision, crosses fully onto the upper platform, and reaches actual range/LOS before target damage. Final floor height is 2,000 cm, signed clearance 2 cm and overlap false in both cases.

Each run contains one independently recorded capsule-support fallback at the convex ramp seam where the center ray strikes an unwalkable end face. South's fallback plane clearance is -0.0533 cm; North's is -11.1004 cm with no capsule overlap. The latter is an extrapolated infinite-face-plane measurement at an edge, not a claim of physical capsule penetration. The existing failure criterion requires both clearance below -1 cm and actual overlap; it was not relaxed. Do not claim 2 cm clearance throughout the whole path or a uniform 1 cm plane-clearance bound.

Accept these two ascending single-skirmisher pursuits. They do not establish general pathfinding, alternate obstacle routing, descent, multiple-enemy crowd behavior, complete combat encounters, networking or performance.

# Initial deployment-menu observation

Independently inspected `Artifacts/Validation/Runtime/20260926-201148-992-c07755bf56024a33a3d01e272ed51c35-DeployMenu.Safety`: native automation reports Success, zero errors and one warning; the launcher records `passed_world_checks_only`. Its receipt and 578 paired pawn/enemy samples span 0–60.007385 simulation seconds, 59.921255 wall seconds and 3,558 observed ticks. The initial baseline was world time 0.4 seconds. Health remains 220, damage serial zero, checkpoint serial one, menu open, no down/retry/restoration and no pawn movement. All fixture input, teleport, damage and enemy mutation counts are zero. The isolated `User/Saved/SaveGames/KittyMech_Expedition_v1.sav` exists at 2,151 bytes.

The same live `KMEnemy_1` moved from approximately (-4982,-4477,238) to (-3987,-3648,472), but all 578 samples show obstructed line of sight and no attack windup. Accept bounded initial-station survival with the original AI and seed 2671. This does not show immunity to an actual hit, reopened-menu safety elsewhere, generalized protection, human input, rendering, multiplayer or performance.
