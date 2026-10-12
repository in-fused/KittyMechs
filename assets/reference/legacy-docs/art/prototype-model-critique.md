# Independent disposition of Blender prototypes v004

Reviewer: root agent. Evidence: actual Pounce and Bastion v004 three-quarter renders, independently opened and visually inspected.

## Decision

**Accepted as M0 rig/import prototypes. Geometry frozen pending concrete issues from engine import. Not accepted as final/M2 art.**

Accepted improvements: readable cockpit cats, correct shield side, exposed shoulder undersides, tapered lower torso, backward-leaning Pounce shins, distinct palettes and shield/tail equipment.

Remaining visual gaps: torso and arm shape families remain too similar between kits; broad shell surfaces need intentional panel design; wrists and gun still have a simple toy-like construction. Final concept fidelity, animation-in-engine quality and runtime performance are not established. Do not spend more generations or remodel without a specific next finding.

## Delivered evidence

- Pounce: `Art/Models/Pounce/SK_Pounce.blend`, `.fbx`, `.glb` and separate LOD1/LOD2 exports. Triangles: **42,672 / 23,468 / 11,948**.
- Bastion: corresponding files in `Art/Models/Bastion/`. Triangles: **36,288 / 19,958 / 10,160**.
- Shared 25-bone rest transforms verified both from GLB inverse-bind matrices and Blender FBX re-import; UV0, normalized skin weights, finite geometry and Idle/Walk clips verified.
- Re-imported FBX heights: approximately **3.842m** for both. FBX take names carry rig prefixes and end with `Idle` / `Walk`.
- Each model uses 12 material sections. Collision JSON is integration guidance, not an Unreal PhysicsAsset.
- Sampled 60 idle frames and 32 walk frames per kit at 24fps. Deformations were finite. Walk samples reached approximately **1.7cm Pounce / 2.5cm Bastion** below the ground plane; foot locking/contact cleanup remains outstanding. These are prototype in-place loops.
- `qa-metadata.json`, `glb-validation.json`, `fbx-roundtrip-validation.json`, and `animation-sample-validation.json` preserve checks beside each asset. This is Blender/file evidence, not Unreal import evidence.
- Following independent pipeline review, validator revision 2.0.0 was rerun without geometry changes. Receipts now carry exact input SHA-256, input revision, validator SHA-256/revision and timestamps. GLB checks compare joint parent hierarchy as well as names/bind matrices across both kits and all six LOD exports; FBX LOD0 checks also compare parent links. The six-file GLB evidence set is recorded in `Art/Models/shared-skeleton-validation.json`.

Current Higgsfield expenditure: **12 credits total** across six images, three reviewed batches. Verified account balance after batch 003: **98 total credits**. Reported trial counter remains 100 and is not used as the debit ledger. No purchases, top-ups or further generations occurred.

## Exact reproduction commands

The following are documented for reproducibility, not an instruction to unfreeze geometry. The source script rebuilds generated exports; preserve manual changes before any future invocation.

```powershell
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe' --background --factory-startup --threads 2 --python 'C:\Users\Taylor\Documents\GitHub\KittyMech\Tools\Blender\build_mech_prototypes.py' -- --asset all
```

Render the saved three-quarter views without rebuilding geometry:

```powershell
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe' --background 'C:\Users\Taylor\Documents\GitHub\KittyMech\Art\Models\Pounce\SK_Pounce.blend' --threads 2 --python-expr "import bpy; bpy.ops.render.render(write_still=True)"
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe' --background 'C:\Users\Taylor\Documents\GitHub\KittyMech\Art\Models\Bastion\SK_Bastion.blend' --threads 2 --python-expr "import bpy; bpy.ops.render.render(write_still=True)"
```

Repeat structural, re-import and animation checks:

```powershell
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\4.5\python\bin\python.exe' 'C:\Users\Taylor\Documents\GitHub\KittyMech\Tools\Blender\validate_asset_exports.py' --asset all
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe' --background --factory-startup --threads 2 --python 'C:\Users\Taylor\Documents\GitHub\KittyMech\Tools\Blender\validate_fbx_roundtrip.py'
& 'D:\KittyMechTools\blender-4.5.14-windows-x64\blender.exe' --background --factory-startup --threads 2 --python 'C:\Users\Taylor\Documents\GitHub\KittyMech\Tools\Blender\validate_animation_samples.py'
```

Units/orientation and material/collision integration notes are in `Art/Models/README.md`.
