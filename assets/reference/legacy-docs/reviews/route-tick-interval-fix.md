# Route observation interval correction

The actual `20260926-182336-867-b7d6ab022a7544cabf4933d9c497d739-UniversalRoutes.Pounce` run passed south up/down, then rejected a position displacement during west ascent. Its old receipt did not record either delta time, so it does not establish that a hitch was the exact trigger.

Installed UE 5.8.3 `Engine/Source/Runtime/Engine/Private/LevelTick.cpp:1675` broadcasts `OnWorldPreActorTick` with the new world `DeltaSeconds`. Actor tick setup passes that same interval to `StartFrame` around line 1742, followed by `TG_PrePhysics` at line 1750. A position observed in this callback therefore contains movement from the preceding actor-tick interval; the new callback argument describes movement still to occur.

The route harness now stores `PreviousWorldDt` alongside `PreviousPosition`. It initializes the pair when entering Walk, evaluates measured displacement against the stored interval, and then updates both observations together. The bound remains exactly `Speed * Max(interval, 0.001) * 2 + 100` cm. Setup teleports, actual traversal, speed, progress/time limits and route tolerances are unchanged. Failure evidence now includes measured distance, allowed distance, prior delta and current delta.

A synthetic arithmetic check demonstrates the mismatch: at 760 cm/s, movement from a 0.250 s interval is 190 cm. Comparing it to a subsequent 0.016 s interval gives the old 124.32 cm bound; the correct prior interval gives 480 cm. A 600 cm discontinuity still fails the unchanged rule. This arithmetic is not an executed Unreal movement result.

Independent critic source review accepted the observation-pair lifecycle and unchanged numeric criterion before build 11. Native compilation and a fresh real route run remain necessary; earlier failed evidence is retained.
