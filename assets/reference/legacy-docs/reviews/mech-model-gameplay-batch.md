# Prototype mech models in gameplay

Disposition: accepted for bounded prototype gameplay integration, including localhost component/animation checks, packaged Pounce smoke and normal Bastion capture below. This is not final/M2 art approval. Existing contact, gait and shadow polish limitations do not block using the original models in gameplay.

Normal Game/PIE clients select canonical Pounce/Bastion meshes and compatible shared-skeleton Idle/Walk clips. Validation includes the expected root, imported bounds and pilot material slot before hiding primitive body parts. Failed content or animation initialization restores the complete primitive presentation; `KMPrimitiveArt` also preserves that fallback. The independent pilot color uses a component-local dynamic material rather than modifying canonical assets.

The skeletal mesh has no collision or overlaps; the existing capsule remains the movement/collision body. Combat origins, camera and numerical gameplay tuning are unchanged. The installed `CacheInitialMeshOffset` API explicitly supports the runtime mesh offset used by native character network smoothing. The native animation proxy reads actor/component state on the game thread, blends Idle/Walk, and changes the evaluated root pose for downed presentation without rewriting the mesh component transform. Installed UE5.8 headers confirm the Evaluate override signature. Root motion remains ignored.

The existing co-op test now checks both canonical meshes, matching initialized clips and preserved capsule ownership, then requires advancing animation time/update counts alongside real guest velocity and nonzero walk blend on both peers. Render tooling selects the normal chassis through the station API and requires actual normal-model receipts with unchanged capsule/camera values. These are meaningful planned functional checks; source review does not prove visual motion, network correctness or performance.

Prototype limitations remain explicit: experimental250cm fit, small vertical offset, rate1 gait that slides at gameplay speed, no authored directional/aerial/combat clips or foot IK, and a simple downed pose. No additional modeling or shadow refinement is required by this review.

## First runtime failure and narrow correction

Editor49 compiled, but `Artifacts/Validation/CoopSmoke/20260927-062655-422-e1006f35d2f44303b269c6724dbd677f` failed its readiness deadline. Both logs show Pounce activating and Bastion falling back; this is not a co-op model pass. The implementation incorrectly required the Pounce fur-slot name for both assets. The previously retained actual Unreal report `Artifacts/Validation/MechMotion/20260926T191114746909Z/motion.json` records Bastion's slot as `M_Cat_Fur_001`.

Reviewed the correction: slot lookup now requires exactly `M_Cat_Fur` for Pounce and `M_Cat_Fur_001` for Bastion. Other content/animation/collision checks and fallback behavior are unchanged. This is an evidence-backed identifier correction, not a permissive match or art-quality exception. The source is ready for rerun after compilation; success is not inferred from this fix.

## Completed localhost rerun

Editor50 compiled successfully. Reviewed `Artifacts/Validation/CoopSmoke/20260927-063015-001-984d992295994a0e801a0d5c28808498`: launcher and both native receipts report PASS. Host observes local canonical Pounce and remote canonical Bastion; guest observes the reverse, with compatible initialized clips and capsule-owned movement/collision checks. Receipts contain44 host and43 guest model-pair samples.

Each peer records9 moving-animation samples during the guest's ordinary southward input. Walk time advances with update counts and a nonzero blend; measured speed reaches Bastion's560cm/s. The guest stops at Y=-416.958 while the host observes Y=-416.959, both with the stable Concrete base. Guest returns offline through normal LeaveSession and host continues ticking. This establishes actual normal-model initialization and locomotion-state updates during replicated movement, not merely a diagnostic-preview flag.

The run uses two local Editor-game processes with NullRHI. It does not demonstrate rendered limb motion, downed appearance, remote Internet conditions, combat with these meshes, frame pacing or packaged asset availability. Package16 and actual normal-gameplay captures remain separate pending evidence; prototype visual limitations remain deferred polish.

## Package16 functional evidence

`Artifacts/Validation/GameplaySmoke/20260927-063754-977-082525ae9c9f45eb9d208a3006f2086a` completed the existing `lower-pounce-v2` scripted workload with full-package provenance and exit0. The validator accepted10,674 frames totaling180.225 seconds. Independently viewed `04_first_kill.png`, `06_downed.png` and `08_signature.png`: the original Pounce model, segmented tail and materials appear during combat/recovery/signature states, with usable crosshair, mission and ability HUD. The signature pulse and free-leap/three-charge feedback coexist with the model. Downed text, zero integrity and disabled abilities are clear; that screenshot is captured too early to establish the fully blended collapse pose.

`Artifacts/Validation/RenderSmoke/20260927-064125-419-ca5304c247cd4d35b23c09fb587b0102` provides a normal packaged Bastion capture. Its PASS receipt records `art_preview_active=false`, `mech_model_active=true`, `prototype_gameplay`, the canonical Bastion mesh,301 animation updates, one available LOD and automatic selection (`forced_lod=0`). Capsule62/125, cameraFOV85 and boom720 remain unchanged. The independently viewed PNG shows the assembled Bastion with its paw shield, distinct kit labels and clear gameplay HUD; no functional prototype-fit blocker is visible.

This accepts packaged prototype presentation plus the scripted Pounce combat/recovery sample and stationary Bastion view. It does not establish a full expedition with these meshes, moving Bastion combat, finished downed animation, human play or final art. Performance is not accepted: the Pounce sample retains12 frames over50ms, worst238.1975ms. No additional pose, material or shadow iteration is required for this batch.
