# Enemy route planning — bounded review

Source disposition: no concrete blocker found. Editor52 compiled successfully (`Artifacts/Validation/editor-build-52.log`, 285.82 seconds). Runtime was pending at the source review; the subsequent bounded roof result is recorded below.

The authority builds navigation after generating the district. The registered, noncolliding bounds box supplies the runtime volume extent; it does not become an obstacle. Dynamic Recast uses the enemy's 52 cm radius and 190 cm height, disables client navigation, and limits tile jobs to two. The builder destroys its bounds on teardown. Moving enemy capsules do not carve navigation.

Enemy queries are authority-only, capped at one per enemy per second, with a two-second normal refresh and a 4,096-node search limit. Tight vertical projection and refusal of partial paths avoid knowingly selecting a different floor or pretending a disconnected route reaches the target. Navigation corners feed the existing full-capsule ground and travel sweeps; attacks, target acquisition, speed and damage rules remain intact. Failed searches hold position and retry. Local steering still handles immediate obstructions, so source review alone does not prove escape from every crowded corner. Synchronous query limits are bounded work, not frame-time acceptance.

The frozen `EnemyPursuit.Roof` fixture is meaningful: it requires real generated navigation before spawning, verifies initially obstructed sight, and leaves all subsequent movement to production AI. It requires at least 500 cm of measured travel away from the initial goal distance, actual roof-height support, clear capsule occupancy and current attack range/LOS before stopping. Per-tick displacement, progress and elapsed-time limits remain enforced. The player placement and removal of other enemies are explicit fixtures; the test stops before damage. South/North keep their original pursuit gates and now receive the same bounded navigation-startup wait. Launcher checks are in the loaded-receipt validation block.

Source review alone does not establish generated-nav connectivity, pursuit success, multi-enemy crowd behavior, moving-door replanning, remote networking, general pathfinding coverage or performance. Runtime work was initially deferred while the user's separate Unreal project copy consumed machine resources.

## Roof runtime result

Accepted for this authored, single-skirmisher route. Reviewed `Artifacts/Validation/Runtime/20260928-013402-645-c6b0387ddccc4d44b662a2513076c4a7-EnemyPursuit.Roof`: the native automation report records Success with zero errors, the receipt records PASS, and launcher acceptance is `passed_world_checks_only`.

Navigation setup took 13.805 wall seconds. Production AI then pursued for 11.584 simulation seconds across 695 observed ticks, increasing its distance from the target by up to 1,936.445 cm while taking the roof approach. The 116 recorded samples show zero blocking capsule overlaps. Final observation is on the flat 3,280 cm roof surface with 2 cm capsule clearance, 2,297.938 cm target distance and verified unobstructed sight. The fixture records one player setup placement, one controlled enemy spawn, one other enemy removed and zero pursuit teleports; it stops before enemy damage.

One convex-seam observation used the existing capsule-support fallback. Its tangent-plane clearance was negative while the full capsule overlap test remained clear; this is not evidence of universally exact contact. Native warnings concern GameplayCue search paths and a missing Recast instance during CrowdManager creation; the tested custom pursuit nevertheless completed. CrowdManager behavior is not covered.

No blocker found in this result. South/North regressions remain separate pending evidence. This pass does not establish crowd navigation, arbitrary routes or doors, remote multiplayer, rendered behavior, combat outcomes or performance.
