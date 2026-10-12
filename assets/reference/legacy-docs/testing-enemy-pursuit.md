# Enemy pursuit diagnostic

Integrated in `Source/KittyMech/Private/Tests/KMRuntimeEnemyTests.cpp` for the next native build after the package freeze ended. The original draft remains in `Tools/RuntimeTests/KMRuntimeEnemyTests.cpp.txt`; use the integrated source for subsequent edits. Variants are `KittyMech.Runtime.EnemyPursuit.South` and `.North`, each in its own fresh isolated standalone PIE process. The active launcher accepts both variants and validates their fresh evidence. Integration does not establish compilation or an executed test pass.

The fixture preserves the real skirmisher's production BeginPlay grounding, capsule, target acquisition, steering, movement sweeps, ground traces and attack windup. It never calls private movement functions or sets movement destinations. Other enemies are destroyed and recorded separately, including enemies spawned by mission proximity triggers; no objective is activated.

| Variant | Enemy authored spawn (cm) | Stationary player floor reference (cm) |
| --- | --- | --- |
| South | (-5700,-4500,200) | (3900,-4500,2000) |
| North | (8500,12000,200) | (7800,6000,2000) |

The real BeginPlay adjusts the enemy center above the lower floor. Setup requires clear flat lower ground and capsule placement before pursuit timing starts. The possessed player receives one recorded setup relocation to an independently floor-traced, clear capsule position, then settles normally. There are no pursuit teleports. The north goal avoids the aqueduct pillar; both goals keep the initial target within the production 10000 cm acquisition limit and place the 2300 cm shooting threshold beyond the upper ramp seam.

Each pre-actor world tick observes the actual prior movement result. Failure checks include non-finite position, missing/unwalkable ground, signed capsule support clearance below the actual plane by more than 1 cm with a blocking overlap, floating more than 150 cm, target movement/damage, checkpoint recovery, three seconds without 20 cm closer progress, and a 45-second simulation bound. Overall wall time is bounded to 80 seconds. A three-second local-progress bound is a diagnostic for these unobstructed approaches, not proof that valid detours elsewhere must always reduce straight-line distance.

Success requires actual enemy LOS and attack eligibility, the whole capsule crossing the upper seam, a flat 2000 cm floor beneath it, and unchanged target damage/health. Only after observing those conditions is the actor tick disabled to stop the fixture before combat resolves. Enemy windup is also observed so a premature shot becomes an explicit failure rather than combat contaminating the movement test.

The evidence receipt names the exact variant, setup operations, removed enemies, positions, elapsed times and final diagnostic. `pursuit-samples.csv` records poses, target distance, floor normal/elevation, capsule support clearance, overlap and windup at 0.1-second simulation intervals. `pursuit-removed-enemies.txt` records unrelated actors removed by setup. A final forward collision probe records its hit actor/normal; it is an observation at that pose, not an assertion that the private AI selected a particular steering angle.

The same strict UserDir/expected-root/save-provider checks run before opening the map, with a fresh absent checkpoint slot and no other PIE world. Delegates are removed on finish/destruction and PIE teardown is bounded. These two skirmisher ascents do not certify other roles, descents, arbitrary cross-level pathfinding, combat, networking, rendering, performance or a complete AI solution. The earlier AI audit remains a source prediction until actual runtime evidence establishes or refutes its failure mechanisms.

Independent source review found no definite API/dataflow/false-pass blocker. Its tick-counter correction was applied so the initial setup snapshot is not counted as an actual world delegate callback. The integrated launcher's PowerShell parser passed, and five synthetic evidence checks passed (valid, missing setup, non-finite time, sample-count mismatch, outside acquisition radius). These launcher-only records are retained under `Artifacts/Validation/PursuitRunnerSynthetic-*`; they are not enemy runtime evidence.
