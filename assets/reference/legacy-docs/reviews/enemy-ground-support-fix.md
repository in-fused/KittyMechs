# Enemy ramp support correction

Actual September 26, 2026 pursuit fixtures reproduced two different failures. The south skirmisher reached the ramp toe and stopped with approximately 0.01 cm signed capsule support clearance. The north skirmisher's horizontal obstacle probe struck the walkable ramp before it entered it. Original logs and failed receipts remain under `Artifacts/Validation/Runtime` (the `185322` South and `185440` North runs).

`KMEnemy.cpp` now measures the full scaled capsule against the floor with a downward sweep. The hit location supplies the supported capsule centre, followed by a 2 cm normal gap. Both the proposed travel path and actual movement retain swept collision. The former undersized horizontal probe is removed; blocked directions continue through the existing steering alternatives. Speeds, frame-delta cap, walkable-normal requirement and vertical step bounds are unchanged. Initial grounding and knockback use the same physical support calculation. This is local steering, not a route planner.

The first corrected runs climbed the ramps but exposed an observation defect at their upper seams: a centre ray hit the steep ramp end face while the full capsule could rest across neighbouring top surfaces. An independently reviewed diagnostic fallback now measures the real stationary capsule downward only when the original ray finds no walkable support. It records both observations, never moves the enemy, and preserves overlap, clearance, progress, range and full-platform arrival criteria. No assumed platform height replaces a failed observation.

Build 14 and both final real-world fixtures passed:

- South: `Runtime/20260926-190616-187-3c771fa0204f4eb1abc3caa73f716140-EnemyPursuit.South`, 20.886 simulation seconds and 207 samples.
- North: `Runtime/20260926-190738-983-f6c6869b2fe94ab2a2c6f76e6b2141b9-EnemyPursuit.North`, 10.705 simulation seconds and 106 samples.

Each run used one recorded seam fallback. Each ended with the entire capsule past the upper seam, on the flat z2000 platform with 2 cm clearance, no blocking overlap, and attack-range line of sight. No pursuit teleport or target damage occurred. The independent critic verified both native reports and receipts.

The north corner fallback's signed clearance against the extrapolated hit plane is -11.10 cm while the actual capsule overlap query is false. Consequently, this evidence does not establish uniform 2 cm plane clearance throughout; finite corner support and an infinite-plane approximation differ. The overlap conjunction in the original penetration guard remains unchanged.

These two skirmisher ascents do not certify descents, other enemy roles, navigation around arbitrary buildings, cross-level route selection, combat, networking, or performance. Those remain separate checks.
