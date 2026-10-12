# Root integration review

Reviewed 2026-09-26 by the combat/mission specialist, independently of the root-owned implementation. Scope: world builder, storm shutter, controller, deploy menu, HUD, build script, content bootstrap, and Config. This reviews the current feasibility slice, not missing future AAA content.

**Evidence:** source inspection and a successful PowerShell parser pass for `Tools/Build.ps1`. Unreal compilation, UHT, content bootstrap, cooking, automated tests, and gameplay were **not executed**; the Unreal installation is pending. Findings below are static integration findings, not reproduced engine failures.

## Findings

### P1 — Explicitly cook the assets loaded only by native package-name strings

Location: `Config/DefaultGame.ini:11-14`.

The cook includes RainlineReach and two Engine folders with `bCookAll=False`. The generated map contains a PlayerStart, while the material and sound assets are looked up at runtime using strings. There are no serialized map references or project-directory cook rules ensuring `/Game/Materials` and `/Game/Audio` are included. A cooked build can therefore fall back to white engine materials and omit all feedback audio despite working in the editor. The new mech definitions likewise require `/Game/Data`; imported mech assets need `/Game/Mechs` when enabled.

Add explicit project directory cook rules or a serialized primary-asset manifest covering these resources. Verify the staged asset registry/package contents, then launch the packaged executable. Epic documents `DirectoriesToAlwaysCook` for assets that have no other project references: [packaging settings](https://dev.epicgames.com/documentation/unreal-engine/API/Developer/DeveloperToolSettings/UProjectPackagingSettings).

### P1 — Require a fresh, nonempty successful automation report before declaring Test complete

Location: `Tools/Build.ps1:39-44`.

The Test branch runs the editor and reports success solely from its process exit code. It neither checks that a fresh report was produced nor that the requested KittyMech tests actually ran and succeeded. A graceful early exit, missing test registration, or stale report directory is not sufficient evidence of a test pass.

Use a unique report directory per run or validate timestamps; require the expected suite/test names, a nonzero completed count, no failed/not-run tests, and a completed report. Treat a missing/malformed report as failure. This also detects any real premature-exit issue once the installed engine is exercised.

**Important non-finding:** the `;Quit` suffix itself is not established as a bug. Epic's automation issue notes explicitly recommend a semicolon-queued Quit form, so removing it based only on appearance would be unjustified. [Epic UE-170942](https://issues.unrealengine.com/issue/UE-170942). Confirm actual 5.8 behavior with the report rather than claiming it exits prematurely without execution.

### P2 — Share one actionable-target policy between interaction prompts and server selection

Locations: `KMPlayerController.cpp:54-68` and `:126-134`; counterpart `KMPickup.cpp` enforces a 500 cm use range.

Pickups inherit the controller's generic 850 cm range even though their server implementation accepts only 500 cm. The HUD consequently prompts at distances where pressing Interact has no effect. Selection also includes completed objectives, unavailable pickups, and other non-actionable interactables. A completed relay nearer than a downed partner can absorb the input even while the HUD says to hold Interact to revive. Prompts do not apply the server's obstruction check either.

Use the same eligibility/range/visibility helper for both paths, including a 500 cm pickup range, available-objective/pickup checks, and matching revive priority. Reproduce with a downed partner next to a completed relay and with a pickup 600 cm away.

### P2 — Keep the extraction destination visible while extraction is active

Location: `KMHUD.cpp:56`.

Objective markers are filtered through `CanActivateObjective`. That method deliberately returns false for an extraction that has already started. Consequently the extraction marker disappears exactly when its countdown starts. If players retreat outside the pad radius, the mission asks them to return while withholding the destination marker.

Display the extraction marker when `Phase == Extraction && bExtractionActive`, independently of whether it can be interacted with. Verify the marker remains visible after the countdown pauses from leaving the area.

### P2 — Recheck pawn clearance during shutter descent

Locations: `KMStormShutter.cpp:26` and `:38`.

Closing performs one occupancy query when Interact is pressed, then moves the blocking panel downward without a sweep for roughly 2.7 seconds. A player can enter its footprint after the initial query and before it closes. This permits the panel to move into a pawn even though the comment promises that closing waits for occupancy.

During each descending step, check the intended swept volume or use an appropriate collision-aware movement strategy and pause/reopen on obstruction. Check the behavior with a client entering the path while the host closes it; the replicated boolean alone also warrants latency testing of moving collision.

### P2 — Route direct-address joins through the network operation/session lifecycle

Location: `KMPlayerController.cpp:99`.

Direct Join calls `ClientTravel` without consulting or updating the network subsystem. Unlike session discovery joins, it can run while another operation is busy or while this process still owns an advertised host session. The old named session can survive the map travel, leaving session occupancy/status and later Host/Join operations inconsistent with the actual connection.

Add a network-subsystem direct-connect operation that blocks overlap, cleans up an existing named session, marks the connecting phase, and uses the same failure/timeout path as discovered joins. Preserve the raw-address option, but share its lifecycle management.

### P2 — Validate all required bootstrap outputs, including audio

Locations: `Tools/Unreal/bootstrap_content.py:65-79` and `:89-99`.

An empty audio source folder or failed individual audio imports can still yield `content_created_not_runtime_validated`: the success report checks only the map and surface material. The sky material and six required cue packages are not verified. Missing audio is then skipped by the runtime feedback cache, producing a silent build with a successful content step.

Require and report the six expected imported SoundWave assets, the sky material, and the new data assets when bootstrap creates them. Inspect import task results and fail for a missing/wrong-type required output. Continue preserving existing authored assets; validation should not overwrite them.

## Cross-checks and limitations

- HUD pickup calls match the implemented API: `GetHeld`, `IsChanneling`, and `GetChannelRemaining`; enum names match. Audio controls use the same public `MasterVolume` and `EffectsVolume` fields read by the feedback library. The controller preloads audio before showing the deploy menu.
- The current plateau begins at X=1500, so the origin deployment is no longer inside it. Western ramps reach the plateau boundary, and the relocated lower enemy bay now lies inside the initial encounter search radius. These are source-geometry checks, not collision playtests.
- Shutter checkpoint reset is bound to the mission's restoration delegate. The root world builder is spawned by GameMode and constructs matching deterministic collision on each peer.
- No definite UHT error was established from this review. Compile without unity once the engine is installed; explicitly include `Engine/StaticMesh.h` where `LoadObject<UStaticMesh>`/`FObjectFinder<UStaticMesh>` are instantiated rather than relying on transitive includes. Similarly verify complete `UWorld` includes in gameplay translation units.
- I did not establish that `LevelEditorSubsystem.new_level` is forbidden in the Python commandlet. Epic explicitly documents use of the level editor subsystem from that commandlet, so this remains an execution check rather than a reported API error. [Epic Python scripting documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python).
- Follow-up execution: compile/UHT; bootstrap; validate required asset classes; cook and inspect packaged assets; require the fresh automation report; run offline and two-client traversal, interaction, extraction-return, shutter-obstruction, and direct-join lifecycle tests.

## Resolution review — 2026-09-26

The findings above retain their original reviewed snapshot. The following source fixes were independently inspected afterward; **resolved in source** is not a runtime pass.

| Original finding | Current disposition |
|---|---|
| Explicit cook coverage | Resolved in source: Materials, Audio, Data and Mechs are explicitly included. Packaged content inspection pending. |
| Fresh, nonempty automation result | Resolved in source: unique report directory, both exact mission/checkpoint test paths required, all returned KittyMech states must pass. Six extracted validation cases passed outside Unreal. Native automation still not run. |
| Interaction prompt/selection disagreement | Resolved in source: shared eligibility/range/visibility/priority helper used by both paths. Gameplay validation pending. |
| Extraction destination disappears | Resolved in source: active extraction has independent marker eligibility; shared directional edge placement now covers objectives and allies. HUD validation pending. |
| Shutter checks only at closure start | Resolved in source: remaining descent volume checked each closing tick; server reopens, clients locally pause descent. Network collision validation pending. |
| Direct-address lifecycle bypass | Resolved in source: controller delegates to network subsystem, with busy guards, named-session cleanup, travel state and shared failure/watchdog handling. Static follow-up found no definite new blocker; real network tests pending. |
| Bootstrap omits required output validation | Resolved in source for existence/type: all 11 expected assets checked, with a fresh report required by Build.ps1. Persistence failure handling below remains open. |

### Additional source finding: P2 — reject package-save failures before writing a success receipt

At this review snapshot, `bootstrap_content.py:33,48,62,98` and `import_mechs.py:82` ignore save return values. An asset can be valid in the editor process's memory while saving its package fails; the scripts can then write a fresh success report that Build.ps1 accepts. Existing import provenance metadata can likewise fail to persist even though the report lists its hash.

Check the material/data/map save results and fail explicitly on failure. Before success, verify persistence of all required/imported packages, including audio, skeleton and animation assets, rather than relying only on `AssetImportTask.save=True`. Epic documents a boolean success result for [save_loaded_asset](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/EditorAssetLibrary?application_version=5.5). No save failure was reproduced in Unreal; this is a source failure-handling gap.

### Lightweight validation actually executed

- PowerShell parser passed for the latest `Build.ps1`.
- Executed its extracted automation-report validation block against six synthetic reports: both required tests successful, a missing required test, empty report, unrelated successful tests, failure, and NotRun. All decisions matched expectations. This did not launch an editor or test the real report schema.
- Parsed both `Tools/Unreal` scripts with Python AST.
- Executed bootstrap `main()` with generated-asset functions replaced by no-ops and fake asset classes in an isolated temporary directory: accepted all 11 valid types and rejected missing audio and a wrong definition type. These three cases test Python validation logic, not Unreal APIs or content creation.
- Executed the existing-import branch of `import_mechs.py` with synthetic source files/fake assets: accepted matching metadata and rejected stale hash, different mesh skeleton, missing Walk, different animation skeleton and wrong height. Six cases passed; no FBX importer ran.
- Reran four frame-analysis regression tests successfully. Their synthetic inputs are not game performance evidence.
- Confirmed `get_imported_bounds()` is a documented [Unreal SkeletalMesh Python method](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/SkeletalMesh); actual import dimensions/facing remain untested.
- At this check, both `Engine/Build/Build.version` and `Engine/Binaries/Win64/UnrealEditor-Cmd.exe` were still absent from the intended installation directory.

### Documentation accuracy

README, implementation status and testing procedure consistently distinguish source implementation, Blender/file checks, synthetic analysis tests and pending Unreal execution. They do not claim a playable build, passed delivery gate, measured frame rate or verified co-op. The model import description is appropriately limited to named clips/shared skeleton/provenance/height checks; it explicitly leaves facing, canopy, animation, LOD attachment and capsule fitting for engine inspection. Performance thresholds are labeled required targets, not results. No further factual correction is required from this source/evidence review; any eventual engine successes must be recorded separately.

### Persistence follow-up — resolved in source

Independently inspected the subsequent persistence fix. Bootstrap now checks individual material/data-asset saves, checks new-map save success and `.umap` presence, and requires successful saving of all ten non-map required packages before writing its report. The model importer requires its imported package batch to save successfully before adding a verified model to the report. The previously open package-save finding is **resolved in source**, pending actual editor execution.

Level validation now correctly uses `LevelEditorSubsystem`: an existing `.umap` must load, and a new map must save and exist on disk. The map no longer goes through `EditorAssetLibrary.load_asset` or the non-map bulk-save batch. The report still covers eleven required outputs, with the map's subsystem verification recorded separately. Build.ps1 now additionally requires the exact `KittyMech.Network.DirectAddressValidation` result.

Relevant follow-up checks only:

- Eight synthetic bootstrap/save/map cases passed: successful bulk persistence, failed bulk persistence, failed individual save, existing-map load success/failure, new-map save success/failure and missing `.umap` after reported save success. Failed bulk persistence produced no fresh success receipt.
- Two existing-model synthetic cases passed: successful persistence writes the report; failed persistence rejects it before report creation. The saved Pounce batch includes its shared skeleton.
- Latest PowerShell syntax check passed; two updated extracted automation-gate cases passed, accepting all three required tests and rejecting a report missing the address-validation test.

These checks used fake Python asset/subsystem objects and isolated synthetic files. They did not launch Unreal, import an FBX, save a real package, test actual map loading or run native automation. No production files were edited during this review, and no further definite source defect was identified in this bounded follow-up. All engine/runtime acceptance gates remain pending.
