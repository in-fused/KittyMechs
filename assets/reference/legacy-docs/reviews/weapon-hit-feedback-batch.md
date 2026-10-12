# Weapon obstruction and confirmed-hit review

Disposition: no blocking source finding; the focused native fixture passed. Rendered marker and network-delivery evidence remain pending.

`FireShot` now shares one impact helper between the chest-to-muzzle obstruction and normal muzzle ray. The close obstruction branch applies that impact then returns, so a hostile blocking the muzzle receives damage without allowing a second hit through it. Friendly mechs still receive no damage and still stop the ray; cover still stops it. The existing cadence and Bastion-shield firing guards remain in place.

Confirmation requires a target classified as `AKMEnemy` before damage and a finite positive value returned by authoritative `ApplyPointDamage`. This avoids confirming nominal generic-actor damage and safely handles lethal target destruction. The reliable client RPC goes to the owning player; the HUD reads a 0.18-second local timer to draw four diagonal strokes. Downed state masks/clears feedback, and checkpoint reset clears it through the same ordered owner RPC channel. No aim or numerical damage tuning changed.

Source inspection alone does not establish real input collision cases, remote RPC delivery, rendered visibility or performance. The targeted fixture must establish close/far enemy hits and wall/friendly/shield negatives for the stated scope.

Frozen `Weapons.Shooting` fixture source reviewed without a blocking finding:11 cases use actual mapped Fire/Shield input, assert requested close-enemy and wall trace identities, compare damage and confirmation against current tuning, check three-hit cadence and no firing after release, and wait for real Bastion shielding before its negative case. The two kits share far/friendly coverage. Fresh-save isolation precedes map opening; stage/overall and teardown waits are bounded. AI suppression, stationary health1000 enemies, friendly fixture actors and Pawn-collision overrides are explicit setup, with no shooter teleport. Launcher checks the exact native test and required case counts after loading its receipt. The standalone fixture does not prove remote owner-only delivery or visual feedback.

## Actual focused result

Editor48 compiled successfully. Independently reviewed `Artifacts/Validation/Runtime/20260927-061459-707-326c3f12a8e94e6a97c0a322bd9e2e5c-Weapons.Shooting`: native report Success with zero errors and one warning, receipt PASS, launcher `passed_world_checks_only`.

All11 cases completed with24 input events and10 confirmed hits. Pounce close/far hits each dealt22 damage; its three-hit hold dealt66. Bastion close/far hits each dealt64; its hold dealt192. Wall/friendly cases for both kits and Bastion's shield case recorded zero hits/damage; native assertions also checked unchanged confirmation state, cadence and no firing after release.

The fixture suppressed one original AI, spawned9 stationary health1000 enemies,2 friendlies and2 walls, and used explicit target Pawn-collision overrides. Shooter teleports remained zero. This accepts the tested standalone input/collision/confirmation behavior, not live combat, remote owner-only RPC delivery, a visible hitmarker or performance. The change is not yet in the current Package15; it is queued for a later combined package.
