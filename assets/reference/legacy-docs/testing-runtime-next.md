# Next runtime automation: bounded proposal

Prepared against the installed Unreal **5.8.3** headers and engine automation implementation on 2026-09-26. **MapSpawn is now implemented and passed in standalone PIE; the remaining families are proposed or staged, not passed.** This adds actual PIE world evidence, rather than more tests of isolated mission rules or mocked Python objects.

The canonical integrated harness is `Source/KittyMech/Private/Tests/KMRuntimeTests.cpp`, with launcher `Tools/Test-Runtime.ps1`. MapSpawn evidence is retained in `Artifacts/Validation/Runtime/20260926-173127-040-51968ff1092842f1a41493127eeea120-MapSpawn`: one builder/mech/shutter, four objectives, two pickups, one enemy, grounded pawn at Z=117.150 cm and checkpoint serial 1 in the isolated sandbox. This is a NullRHI world check, not a rendered, networking, packaged or performance acceptance. `Tools/RuntimeTests/KMRuntimeTests.cpp` was the original staging copy; use the integrated source for subsequent work.

## Harness and save isolation

Use a small editor-only automation module, or an editor-conditional test translation unit with `UnrealEd` added only when `Target.bBuildEditor`. Guard it with `WITH_EDITOR && WITH_DEV_AUTOMATION_TESTS`; use `EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter`. Do not add UnrealEd to the shipping/game target. Keep these under `KittyMech.Runtime.*`, separate from the existing pure mission/checkpoint/address tests.

Run **one test variant per fresh editor process**, serially. Launch with a new absolute `-UserDir=<project>/Artifacts/Validation/Runtime/<run-id>/<test-id>/User` before any PIE session. A unique directory avoids loading a previous test checkpoint; a new process also clears the process-wide `LatestCheckpointSnapshot` and async writer in `KMGameMode.cpp`. Changing a slot during an existing PIE session would not clear that cache.

The installed implementation establishes the isolation chain:

- `Runtime/Core/Private/Misc/Paths.cpp:1940`: the private internal `CustomUserDirArgument()` reads and normalizes `UserDir=`. It is implementation evidence, **not a callable public test API**.
- `Paths.cpp:451`: `ProjectUserDir()` returns that argument when present; `:112` derives its `Saved/` directory.
- `Runtime/Engine/Public/SaveGameSystem.h:169`: the generic save system stores a slot at `FPaths::ProjectSavedDir()/SaveGames/<slot>.sav`.

Before requesting PIE, parse the explicit `UserDir=` command-line argument using `FParse::Value`, canonicalize it, and require public `FPaths::ProjectUserDir()` and `FPaths::ProjectSavedDir()` to match the expected User and User/Saved paths beneath that exact newly allocated test directory. Refuse to run otherwise. Require the test slot to be absent initially and reject junction/symlink ancestors. Never delete, rename, back up/restore, or write the real `KittyMech_Expedition_v1` slot in the normal user/project save directory. Retain the sandbox after a failure. A failed isolation preflight ends the test before GameMode/BeginPlay can write anything. The first actual MapSpawn run confirmed the installed Windows save provider produced and loaded the initial checkpoint inside this sandbox. The direct call to private `CustomUserDirArgument()` in the original staged draft was caught by compilation and corrected before the successful run.

PIE lifecycle APIs verified locally:

1. Load `/Game/Maps/RainlineReach` using `FAutomationEditorCommonUtils::LoadMap`, then request normal PlayInEditor, not SimulateInEditor. Use a transient `ULevelEditorPlaySettings` object with `SetPlayNetMode(PIE_Standalone)`, `SetPlayNumberOfClients(1)` and `SetRunUnderOneProcess(true)`. Do not save these settings to the user's config.
2. Set `FRequestPlaySessionParams.SessionDestination=EPlaySessionDestinationType::InProcess`, `WorldType=EPlaySessionWorldType::PlayInEditor`, `EditorPlaySettings` to those transient settings, `GlobalMapOverride` to RainlineReach, and `bAllowOnlineSubsystem=false`. Preserve real GameMode/pawn defaults and PlayerStart; do not override them in the bootstrap test.
3. Queue `FStartPIEForAutomationCommand(Params)`. Unlike the older `FStartPIECommand`, this installed helper waits for initialized actors and a started GameState and bounds its startup failures. Its destructor removes the play-settings root; follow the engine helper's ownership convention by rooting the transient settings for this command. Header: `Editor/UnrealEd/Public/Tests/AutomationEditorCommon.h:296`; implementation: `Private/Tests/AutomationEditorCommon.cpp:1176`.
4. Select exactly one `EWorldType::PIE` standalone world through `GEngine->GetWorldContexts()`, rather than assuming the first global world is ours. Require `World->AreActorsInitialized()`, the expected map and a possessed `AKMMechCharacter`. Close the automatically opened deploy menu through `AKMPlayerController::CloseDeployMenu()` before movement/ability actions.
5. Use bounded `IAutomationLatentCommand::Update()` stages. Let the editor tick physics, character movement, GAS and timers normally; do not call `World->Tick`, `Landed`, `MissionTick`, or private callbacks manually. Each stage records simulation elapsed time and has a wall-clock timeout. Abort dependent stages after failure but still queue teardown. End with `FEndPlayMapCommand`, then wait until the relevant PIE context is gone. Do not remove a sandbox while an async save may still be running.

`AutomationOpenMap(MapName,true)` is a documented alternative in `Runtime/Engine/Public/Tests/AutomationCommon.h:213`, but the explicit PIE settings above make the initial one-player scope reproducible. `UWorld::CreateWorld`, `InitializeNewWorld`, `BeginPlay` and `DestroyWorld` exist, but a hand-built transient world would require duplicating GameInstance, controller, physics and lifecycle setup. It should not be the first map acceptance harness.

Initial runs may use `-NullRHI` for physics/gameplay checks, subject to an actual startup smoke test. Such a pass makes **no rendering, HUD, audio-output or performance claim**. Keep a separate ordinary-rendered packaged smoke test. Do not run UBT concurrently with this editor process.

## Five test families

### 1. `KittyMech.Runtime.MapSpawn`

**Purpose:** catch map/GameMode configuration errors, missing runtime actors, content fallback, and deployment inside collision.

After PIE readiness, use `TActorIterator` and `GetAuthGameMode<AKMGameMode>()`/`GetGameState<AKMGameState>()` to require one world builder, the real game mode/state, one possessed mech, four unique objective kinds, two configured pickups and one shutter. Require at least one initial enemy and no more than `GetEncounterCap()`, with at most one shield and one mortar. A count of six is not required; the authored initial encounter is smaller.

Load the expected two materials, six SoundWaves and two mech definitions by their production paths and verify their classes, so an engine fallback material cannot disguise missing content. Record actual pawn/capsule position. `UWorld::LineTraceSingleByChannel` must find walkable ground below deployment; `OverlapBlockingTestByChannel` with the pawn's actual scaled capsule, ignoring itself, must be clear. After settling, `UCharacterMovementComponent::IsMovingOnGround()` must be true and the pawn must remain above the lower floor. Allow startup/physics settling up to 10 seconds after PIE readiness.

### 2. `KittyMech.Runtime.UniversalRoutes.<Pounce|Bastion>`

**Purpose:** exercise CharacterMovement against real instanced ramp collision, including the transitions that arithmetic geometry checks cannot establish.

Use each chassis in a separate fresh process. Clear enemies for this geometry-only fixture, including any guards spawned by proximity triggers, and report the count; enemy combat and collision are excluded deliberately. Setup may reposition the pawn safely at a route entrance with `ResetForCheckpoint`; traversal itself uses `APawn::AddMovementInput` on successive world pre-actor ticks. Do not teleport along a ramp, launch, jump, or spend ability energy. Steering may follow fixed authored centerline waypoints; it is not a navigation-AI test.

Traverse both western connectors upward and downward, plus the northern connector in both directions. Current source endpoints describe the walking surface: `(-5500,±4500,-10)` to `(1500,±4500,2000)`, and `(8500,11700,-10)` to `(8500,9000,2000)`. Establish entry/exit waypoints beyond each seam from actual floor traces, not the nominal endpoint Z. Require measured forward progress, arrival within 150 cm of the destination, ground contact after settling, no downed/retrieval event and unchanged ability cooldowns. Bound each traversal to 30 seconds and fail a three-second no-progress interval. Record the precise failing position, capsule dimensions, velocity and floor hit. This verifies connectors; it does not certify every square meter of the map or route-finding usability.

### 3. `KittyMech.Runtime.KitResourcesAndDamage.<Pounce|Bastion>`

**Purpose:** test live GAS costs, cooldown rejection, damage and each kit's distinct physical ability effect.

Use the actual possessed pawn and `GetAbilitySystemComponent()`. Activate `UKMMobilityAbility` and `UKMSignatureAbility` through `UAbilitySystemComponent::TryActivateAbilityByClass`, not `ExecuteMechAbility`, which would bypass cost/cooldown checks. Assert the immediate energy change matches the loaded definition, cooldown becomes positive, and a second same-tick activation fails without a second debit. Use `SetNumericAttributeBase(UKMCombatAttributes::GetEnergyAttribute(),...)` only to establish the insufficient-energy fixture, then verify the ability rejects it without movement/damage/cooldown side effects.

For Pounce, a successful mobility activation must produce upward/forward movement and return to walkable ground through an actual physics landing within five seconds. This first test does not claim landing-strike damage coverage. For Bastion, spawn one stationary skirmisher in unobstructed shockwave range and another beyond it; disable only those fixture enemies' AI ticks. Verify the inner target loses the current 85 damage once and is displaced by the real knockback path, while the outer target remains unchanged. Clear the fixture actors afterward.

For both chassis, wait out the two-second checkpoint protection before applying a fixed hostile `UGameplayStatics::ApplyDamage` with a non-player damage causer. Require the returned damage, health delta and damage serial to agree; keep sampling before the seven-second health-regeneration delay. Check friendly-player-instigated damage is rejected. For Bastion's signature, verify its actual protection changes hostile damage to 35% while active. Restore fixture attributes between cases rather than weakening production timers. Record loaded tuning values so deliberate balance changes are distinguishable from regressions. Bound each kit variant to 25 seconds. This covers authoritative local behavior, not client prediction, remapped input, weapon aiming, balance or remote authority.

### 4. `KittyMech.Runtime.MissionAndDiskCheckpoint.<AThenB|BThenA>`

**Purpose:** exercise actual objective actors, overlap/LOS validation, timers, weather transition, serialized checkpoints and retry.

Run each order in a fresh isolated process. Disable incidental enemy AI for this mission fixture. Use safe setup positioning near the real objective and call `IKMInteractable::Execute_Interact(Objective,Pawn)`, so the actual actor and GameMode distance/LOS/prerequisite checks run. First attempt core before both relays and an out-of-range interaction; flags/serial must remain unchanged. Complete the two relays in the chosen order, assert core phase and storm phase, and repeat an already completed interaction to ensure no extra checkpoint serial or wave appears. Secure the core, start extraction and require one active countdown.

Leave the 1800 cm extraction radius for two seconds: remaining time must pause within one mission-tick tolerance. Return and let the **real 60-second timer** finish without changing time dilation or editing `ExtractionRemaining`. Require Complete, no active enemies, and no repeated completion on further ticks. Record both expected extraction wave thresholds and enforce the cap even though fixture AI is disabled.

Perform the disk/retry stage before the final uninterrupted 60-second extraction attempt. Poll `DoesSaveGameExist` and `LoadGameFromSlot` only inside the verified sandbox until a compatible `UKMSaveGame` contains the exact latest checkpoint serial/flags. Allow up to 10 seconds for async disk completion; a file's mere existence is insufficient. Call `RetryCheckpoint()` and verify retained objective flags, reset extraction timer, live/healthy pawn on clear ground, and bounded replacement enemies. Retry clears active extraction, so interact with the pad again before measuring the final real countdown. Keep disk verification separate from retry because retry can use the in-memory snapshot. A subsequent fresh-process reload of the retained sandbox is the follow-up proof of load-on-start, with isolation still enforced and the initial-empty-slot rule explicitly waived only for that named reload step. Allow 100 seconds per order, excluding PIE startup.

### 5. `KittyMech.Runtime.WorldRecoverySafety`

**Purpose:** verify the recent shutter safety fix and recovery side effects against real collision/timers.

At the actual shutter, use its interaction interface to open, wait until raised, then initiate closing with the footprint clear. Move the capsule into the remaining travel volume after closure has begun. On subsequent world ticks require authoritative `bOpen` to become true and the panel to raise without a blocking overlap trapping the pawn. Perform the entry with a swept actor setup move, verify that entry succeeded, and record panel/pawn bounds; do not assert success if setup could not enter. Also verify closure can finish with the footprint clear. This is a standalone collision regression; the delayed-client version remains a two-process network test.

Acquire a real pickup through its interface, then apply lethal hostile damage after protection expires. Let the real three-second squad-wipe recovery run. Require the same possessed pawn to recover, inventory reset, pickup availability restored, objective checkpoint flags retained, enemy count bounded, and no capsule penetration at the recovery location. Verify shutter reset uses its safety behavior rather than trapping a pawn that remained nearby. Bound the test to 25 seconds. Revive/retrieval with an actual second client is explicitly outside this first standalone batch.

## Evidence and implementation gate

Each run should produce its automation report and a small JSON receipt containing source revision, engine version, exact test name/variant, sandbox paths, loaded tuning, map name, actor counts, assertions, checkpoint serials, positions and elapsed times. Missing, skipped, timed-out or zero-test reports fail acceptance. Log all fixture changes, especially disabled AI, setup teleports and direct attribute initialization.

These are real-world integration tests **only once executed inside PIE**. The existing mission-rule tests, Python mock checks and synthetic frame-analysis fixtures remain useful but cannot pass any test above. Even five passing families do not establish rendered quality, packaged cooking, controller usability, two-PC networking, replayability or target performance.

Initial implementation gate completed: MapSpawn compiled and passed with sandbox redirection and teardown. The next staged addition is `Tools/RuntimeTests/route-addition.cpp.txt`, with deferred launcher edits described in `route-runner-integration.md`. Independent review, integration, compilation and actual execution are still required before calling either route variant passed. No production source, save slot or active launcher was changed while drafting the route addition.
