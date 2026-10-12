# Pounce pose integration boundary — source gate pending

Recorded 2026-10-10 during pose-owner001. This is a narrow integration decision, not approval of the source candidate or Gate1. Build015 remains the playable authority. No runtime or public asset is changed by this document.

## Existing owner conflict

`src/game/entities/Actors.tsx` derives locomotion phases and support weights from `felineMotion.ts`, advances the animation mixer, applies strike motion, adds body terrain/lean adjustments, performs ground/wall paw leases and IK, then adds tracking rotations. Ground contact admission excludes stance transitions and rubble. The runtime quadruped stride/duty tables describe the old authored clips. Consequently, replacing the GLB URL or adjusting those tables alone cannot admit a controller that owns world contacts through moving transformations.

## Required replacement boundary

After independent source acceptance, one Pounce locomotion/R controller must own the local skeletal pose and its contact planning. The authoritative actor transform remains applied once by the existing presentation root; the controller receives the same interpolated actor position, yaw, clock, actual displacement and lifecycle as that root. It must not apply a second carrier transform through individual bones.

Actual terrain/structure queries must provide supported contact positions, normals and stable owner identities. A prescribed source floor is not a runtime contact provider. Support retirement and moving structures must invalidate or transport those contacts coherently. Existing ground lease/IK and mixer locomotion writes must not operate concurrently on the controller's owned bones. Any additive lean, strike or look action needs an explicit compatible composition boundary rather than another implicit final write.

Climbing, paired combat, air/reaction actions and their cancellations remain mandatory integration states. Their retained clips are unqualified on the new skin; missing paired clips cannot silently fall back to unrelated motion. Admission must preserve or deliberately replace their ownership transitions and camera envelopes before calling the detailed Pounce a connected playable delivery.

## Evidence sequence

1. Review the sealed pose-owner source packet, raw requested/achieved contacts, genuine head/armor clearance and fully framed motion. A passing source floor circuit is diagnostic evidence only.
2. If accepted, implement the single-owner runtime adapter and validate actual supported movement, transformation cancellation, contact loss and full-body occupancy with the native representation. Preserve build015 until the replacement passes these checks.
3. Capture ordinary play from two clients, inspect movement/R and camera continuity, then exercise climbing and coordinated combat in the populated district. `tools/overhaul-body-play-001.mjs` covers only a movement observation subset; its completion cannot approve the integrated district.
4. Independent critic decides admission from gameplay and presentation, including failures and frame-time evidence. Full four-mech/three-map acceptance remains outstanding.

A source pass alone cannot approve runtime integration, and no automatic additional geometry or timing candidate follows a failed bounded attempt.
