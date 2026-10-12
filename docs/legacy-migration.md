# Legacy audit and migration map

Reference: `C:/Users/Taylor/Documents/GitHub/KittyMech`, inspected read-only on 2026-10-03. No Unreal process is needed or launched. The browser repository is a new implementation, not a port of Unreal runtime code.

| Priority / legacy system | Purpose / evidence | Reusable material | Web equivalent | Status |
|---|---|---|---|---|
| P0 Pounce / Bastion | `docs/tuning.md`, `Art/Models/README.md` | Original meter GLBs, 25-bone rig, three LODs, tuning and source | New authored quadruped GLBs replace original bodies; chassis stats retained | Complete for slice |
| P0 feline locomotion | `docs/pounce-feline-locomotion.md` | Selected feline-003 Blender source and clips | Retained reference exports; new four-limb rig, contact trajectories, idle/walk/trot/gallop/air blends and terrain stance correction | Four playable rigs and three Sentinels; rejected v005 excluded |
| P0 Rainline Reach | `Art/Environment/Rainline_v1/manifest.json`, `KMWorldBuilder.cpp` | Ten original assemblies, Blender/FBX, district identity | Optimized GLB kit, deterministic chunks, proxies, new scanned nature and three theater variants | Complete for slice |
| P0 material surfaces | `Art/Environment/PolyHaven/provenance.json` | CC0 concrete_moss / rock_tile_floor maps | Local WebP, DX Y inversion, new scanned soil/rock/GL normals/HDR | Complete |
| P0 combat | `KMMechCharacter.cpp`, `docs/tuning.md` | Pounce rapid-fire cadence, Bastion heavy kit, resource recovery and leap ideas | Shared TypeScript projectiles, cooldowns, damage, energy, pounce | Reimplemented |
| P0 multiplayer | `docs/networking.md`, `KMNetworkSubsystem.cpp` | Authority boundary and expedition concept | Browser-hosted PeerJS invites and independent Node WebSocket authority with Rapier | Co-op/PvP/PvPvE tested locally; Internet NAT qualification remains |
| P0 enemies | `KMEnemy.cpp`, `Art/Enemies/v001` | Source parts retained as reference; Scout/Mortar/Anchor role designs reused | Newly authored quad bodies/clips, vision/hearing memory, bounded grid paths, flanks, retreat, guards and telegraphed mortar fire | Functional and independently tested; complex encounter/navigation qualification remains |
| P1 mission / salvage | `KMGameState.cpp`, `KMObjective.cpp`, `KMSalvage.cpp` | Relays → core → extraction, shared salvage | Shared mission progress, proximity interactions and extraction | Reimplemented as bounded slice |
| P1 sound | `Art/Audio/S_*.wav` | Six original cues | Local WebAudio samples and weapon/explosion synthesis | Complete |
| P1 art references | `Art/Concepts`, `docs/art` | Concepts and provenance | Retained references, new feline models, eleven integrated Higgsfield media assets including three pickup faceplates | Complete for slice |
| P2 controls / saves | `README.md`, `KMDeployMenu.cpp` | Input conventions and settings | Keyboard, mouse, touch; persistent local settings | Complete; campaign saves/revive remain |
| DROP GAS / UMG / EOS / cooked packages | Unreal-specific runtime / packaging | Behavior only | React DOM, shared TypeScript, standard WebSocket | Deliberately omitted |

## Deletion gate

Selected editable source is retained under `assets/source/legacy`, readable source/docs under `assets/reference`. `docs/legacy-asset-inspection.json` inventories inspected geometry/rigs; `docs/asset-validation.json` records web exports. Normal play/build never accesses the Unreal path.

The owner permits deletion only after the old build is obsolete. It is retained. Before any removal: preserve selected editable source models, animation and environment sources, tuning/design documents, asset provenance and any unreplaced P1 mechanics; verify browser gameplay and networking; record explicit evidence that nothing needed remains only in the old folder. A prototype does not by itself satisfy that condition.
