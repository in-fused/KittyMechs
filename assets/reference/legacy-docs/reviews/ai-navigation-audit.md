# AI navigation audit — source and geometry predictions

Date: 2026-09-26. Read-only inspection of `KMEnemy.cpp` and `KMWorldBuilder.cpp`.
**No Unreal navigation fixture or playtest was run for this audit.** The findings below are source/math predictions, not observed runtime failures. Production code was frozen during packaging.

## North-ramp movement and grounding

The north ramp runs from `(8500,11700,20)` to `(8500,9000,2050)` cm: rise/run = 2030/2700 = 0.752, about 36.94 degrees. The two western ramps run from `(-5500,±4500,20)` to `(1500,±4500,2050)`, slope 0.290.

`MoveOnGround` uses a horizontal 160cm sweep with capsule radius48/halfheight65, centred45cm above the enemy. Ground placement puts the enemy centre97cm above the downward trace impact, making probe centre142cm and bottom77cm above its starting floor. North-ramp height rises120cm along a straight uphill probe, and92cm at either40-degree alternative. Those sweeps intersect the walkable ramp itself. The first possible alternatives are near80degrees, with only17.4% of movement contributing uphill. This predicts zigzag or stalled ascent, while the western ramps avoid this particular steep-probe overlap.

The actual enemy collision capsule is radius52/halfheight95. Its centre must be at least `(95-52)+52*sqrt(1+slope²)` above the ramp directly below that centre to avoid penetrating an infinite inclined plane. This is approximately108cm on the north ramp, versus the requested97cm. The swept destination therefore overlaps the ramp by approximately11cm. The western requirement is97.14cm, close to collision tolerance. `SetActorLocation` is swept, but the steering loop breaks regardless of its blocking result.

### Runtime fixture

- Test each role ascending and descending the north ramp; use a controlled enemy near `(8500,10350)`, with measured floor height and current ground-placement logic, and a target near `(8500,8700,2125)`.
- Repeat on both western ramps as controls.
- Record enemy position over time, selected steering angle, obstacle actor/normal, downward ground normal, intended destination, blocking movement result, and distance progressed.
- Distinguish a probe falsely classifying the ramp as an obstacle from actual capsule penetration or an unrelated actor obstruction. Do not certify the predicted mechanism solely from a screenshot of a stationary robot.

## Cross-level pursuit lacks a route objective

The upper platform covers x1500…13500, y−9000…9000 and has top z2000. A lower enemy approaching `(1300,-1000)` toward a target `(3000,-1000,2125)` meets the platform wall. The western ramp feet are at x−5500,y±4500: reaching them requires moving away from the target and avoiding the elevated sides of the ramps. Current steering selects the first locally open angle toward the target, without path memory, elevation-aware goals, or stalled-progress recovery. Boundary/ramp-side pacing is a likely failure path; indefinite trapping has not been demonstrated.

### Runtime fixture

Use the above lower/upper pair, then reverse elevations. Hold the target still, then traverse a western ramp normally. Record whether the enemy reaches a ramp foot, maintains progress along an actual route, loses its target at the10000cm acquisition limit, or repeats a boundary pattern. Repeat around each workshop to distinguish convex obstacle avoidance from elevation routing.

## Bounded next implementation, only after runtime evidence

First correct slope-aware capsule grounding and sweep movement along projected walkable surfaces, and respond to blocked displacement. A route planner cannot repair invalid per-step collision geometry.

For the resident district and6–8 robots, an authored graph of ramp foot/midpoint/top nodes plus platform and workshop corners is a bounded next step. Compute routes server-side on target change or stalled progress, stagger replanning, and retain local avoidance between nodes. Validate graph edges with the real capsule and explicit elevation connections; avoid reintroducing a straight line through a platform wall when attaching the target to the graph.

A baked NavMesh is preferable once geometry is authored into the level. Current district collision is generated during BeginPlay; merely adding a static NavMesh bounds volume would not establish valid navigation over that runtime geometry. Runtime navigation generation needs separate startup/hitch evidence, not an assumed performance pass.
