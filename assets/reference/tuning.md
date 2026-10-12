# Mech tuning

`UKMMechDefinition` is a reflected `UPrimaryDataAsset` containing PvE resource, movement, weapon, cost, cooldown, and recovery numbers. Create these assets using the compiled class:

- `/Game/Data/DA_Pounce.DA_Pounce`
- `/Game/Data/DA_Bastion.DA_Bastion`

The character loads both definitions at startup, caches them, and selects the matching definition when chassis changes. No asset loading occurs during attacks. Missing assets use transient native defaults matching the table below. Chassis changes preserve health/energy fractions, clear temporary kit effects, and keep cooldown timestamps. Clients use the same packaged definitions for movement and presentation; health, energy, damage, and ability commitments remain server-authoritative. Use identical builds on both machines.

## Initial values

| C++ property | Unreal Python property | Pounce | Bastion |
| --- | --- | ---: | ---: |
| MaxHealth | max_health | 220 | 340 |
| MaxEnergy | max_energy | 100 | 100 |
| MoveSpeed | move_speed | 760 | 560 |
| JumpVelocity | jump_velocity | 720 | 650 |
| FireDamage | fire_damage | 22 | 64 |
| FireInterval | fire_interval | 0.16 | 0.56 |
| MobilityCost | mobility_cost | 25 | 25 |
| SignatureCost | signature_cost | 55 | 55 |
| MobilityCooldown | mobility_cooldown | 4 | 8 |
| SignatureCooldown | signature_cooldown | 35 | 35 |
| RecoveryDelay | recovery_delay | 7 | 7 |
| RecoveryRate | recovery_rate | 14 | 14 |
| EnergyRegenRate | energy_regen_rate | 13 | 13 |
| FiringEnergyRegenRate | firing_energy_regen_rate | 5 | 5 |
| ShieldDrainRate | shield_drain_rate | 17 | 17 |

Distances/velocities use Unreal centimetres; intervals and delays use seconds; recovery/regeneration/drain values are units per second. The data-asset class defaults to the Pounce column. Bastion overrides only health, movement/jump velocity, weapon damage/cadence, and mobility cooldown. Unreal editor metadata enforces nonnegative costs/rates, positive resource capacities/movement, and at least 0.05 seconds between shots.

For bootstrap, use `unreal.DataAssetFactory`, set its `data_asset_class` to `unreal.KMMechDefinition`, then call the Asset Tools `create_asset` method in `/Game/Data`. Apply values using `set_editor_property` with the Python names above and save. Include `/Game/Data` in cooked content because native loading uses explicit package paths. Preserve existing designer edits on subsequent bootstrap runs unless a reset is explicitly requested.

## Deliberately still code-authored

Ability behavior is fixed by chassis: Pounce leap/landing strike and free combo charges; Bastion shockwave, shield weapon lockout, and team shelter. Strike radii/damage/impulse, leap velocity, combo duration/count/gap, shelter duration/reduction, shield cone/damage absorption, revive/checkpoint protection, and camera/geometry parameters remain in `KMMechCharacter.cpp`. Enemy and pickup tuning remain in their own gameplay code. Pilot cosmetics do not change either definition.

Change a small set of related numbers, package, then compare both kits against the same encounters. Verify solo completion, usefulness of each ability, damage taken, recovery downtime, and alternative-route access. For definition plumbing, verify one edited weapon damage/cooldown and movement speed take effect, switch kits without gaining free health/energy, and temporarily omit the two assets to confirm identical native fallback behavior. Native compilation and these runtime checks still require the installed Unreal toolchain.
