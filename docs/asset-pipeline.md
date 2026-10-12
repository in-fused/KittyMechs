# Asset pipeline and provenance

Sources live under `assets/source`; imported design/source references under `assets/reference`; intermediary exports under `assets/runtime`; compressed runtime assets under `public/assets`. Shipping a build never requires the old Unreal checkout, Blender, a generation provider or remote model URLs.

The hosting Git backend rejects large binary source objects. Full editable source, generation originals, large concept images and intermediary exports are preserved in the local KittyMech-Web folder and the **local-assets-snapshot** Git branch. The publishing branch contains code, provenance, reproducible tools and all optimized `public/assets` needed to play/build. Those large source folders are intentionally ignored on the publishing branch; a clone of that branch can build/play but needs the retained local source or asset snapshot to re-export art. No source art was deleted to meet the hosting limit. Compression and export receipts are mirrored into `assets/reference` so the publishing branch retains their hashes and inventory.

## Editable source → GLB

The local Blender executable is `D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe`. Set `BLENDER_PATH` when using a different install. Blender runs without opening Unreal.

```powershell
npm run assets:export
& $env:BLENDER_PATH --background --python-exit-code 1 --python tools/build_feline_mech.py
python tools/prepare-nature-textures.py
& $env:BLENDER_PATH --background --python tools/build_nature.py
npm run assets:optimize
npm run assets:validate
```

`assets:export` reads retained local copies of the selected legacy `.blend`/FBX files. `build_feline_mech.py` authors all four playable chassis and three Sentinels, five quadruped gaits and actual-model portraits, and saves editable `.blend` files. Each player additionally has UprightIdle/UprightWalk/UprightAir/TransformUp/TransformDown, plus Grab/Cling/Climb/Mantle, for 28 player clips and 25 bones. All Sentinels now also have traversal and combat reactions, for 17 clips each. Pulse/Missile/Ability/Hit/Death and neutral CombatBase support additive runtime reactions; player upright reactions complete the set. CPU form/grip previews and evaluated bone-deformed bounds are retained in `assets/source/feline-web`; copy `upright-bounds-*.json`, `climb-bounds-*.json`, `combat-bounds-*.json`, `rig-bounds-*.json`, `turn-bounds-*.json`, `turn-composition-*.json`, `turn-motion-evidence.json`, `traversal-motion-evidence.json`, `combat-motion-evidence.json` and `combat-composition-evidence.json` into `assets/reference` after regeneration. These measured fixtures participate in the review fingerprint. Climb core armor fits the chassis radius, player full height fits 2.6 m and Sentinel hulls use 3.2 m, and wall-contact claws are measured separately; root translation/rotation stays zero. `build_nature.py` builds a fuller layered evergreen from tilted photographed bough fans, preserving the 5k triangle budget and normalizes/decimates a scanned coastal rock. `python tools/prepare-refinement-art.py` normalizes generated terrain/theater sources and model portraits. Runtime models use meter units, Y up, planted origins and named animation clips. Skin joint transforms carry the bind pose, so raw POSITION extrema alone are not its posed bounding box.

glTF Transform welds, deduplicates, prunes and applies Meshopt compression. `assets/runtime/optimization-receipt.json` records source/runtime size and SHA-256. `docs/asset-validation.json` records material, primitive and clip inventory. Validation checks finite accessor data, required feline clips and the 5 MB model limit. DX normal maps use negative Y normal scale; the newly downloaded GL maps use positive Y.

## Admitted sources

| Material | Source / license | Transformation / use |
|---|---|---|
| Rainline kit and six WAV cues | Owner's original KittyMech art | Copied read-only, exported as GLB, PBR dressed, used in district and sound |
| Original enemy assemblies | Owner's original KittyMech art | Exported and retained as reference; role designs informed newly authored bodies |
| Four playable feline bodies and three Sentinel variants | Authored in this repository | Editable Blender and optimized GLB; five quadruped clips for all seven, 23 additional turn/form/traversal/combat clips for each player and twelve additional turn/traversal/combat clips per Sentinel; model portraits and evaluated bounds |
| Legacy concrete/rock floor | Original Poly Haven provenance retained with source | CC0, resized WebP; concrete and DX normals remain available |
| Fir bough and bark photographs | [fir_tree_01](https://polyhaven.com/a/fir_tree_01), CC0 | Cropped photographed bough, alpha coverage adjustment, 512 px, new low-poly canopy; enormous source tree is not shipped |
| Scanned coastal basalt | [coast_rocks_02](https://polyhaven.com/a/coast_rocks_02), CC0 | Centered six-meter cluster, decimated to 2.2k triangles, 512 px textures |
| Terrain rock / soil | [rock_ground](https://polyhaven.com/a/rock_ground), [forest_ground_04](https://polyhaven.com/a/forest_ground_04), CC0 | 1k diffuse/GL normal/roughness → WebP |
| Overcast environment | [kloetzle_blei](https://polyhaven.com/a/kloetzle_blei), CC0 | Local 1k HDRI |
| Key art, armor albedo, animated menu | Higgsfield generations, owner's connected account | Original outputs retained locally; web derivatives included; job IDs in ledger |
| Three supply faceplates | Higgsfield generations, owner's connected account | Three 256 px WebP pickup textures; `tools/prepare-supply-art.py` retains originals and validates hashes/dimensions in `higgsfield-supplies.json` |
| Three theater illustrations, basalt and snow albedos | Higgsfield generations, owner's connected account | Concept previews and bounded WebP terrain surfaces; job IDs/prompts in refinement ledger |

Official Poly Haven API metadata is retained as JSON alongside provenance. `tools/fetch-environment.ts` and `tools/fetch-terrain.ts` reproduce the selected downloads. Higgsfield-generated assets require no generation call during normal gameplay. Do not infer licensing for additional external assets; record their exact source and license before admitting them.

## Fitted recon and medic revisions

The Lynx and Caracal art receipts are `assets/reference/lynx-art-evidence.json` and `caracal-art-evidence.json`. Their complete existing 25-joint rigs, all 32 current player clips, source curves, decoded channel arrays and paw bounds are preserved. Original-contour teal/silver recon guards and ivory/orange medic guards add readable separation around the retained mechanisms; Caracal retains exactly six repair cells. This is an incremental body refinement, below the title illustration's fidelity.

Packed editable masters and compact original/export/audit stages live in ignored `assets/source/lynx-art-v1` and `caracal-art-v1`; the original `feline-web` masters remain untouched. Each package's frozen README/inventory captures its private-source checkpoint. `admission-v15.json` and the reference receipt record the subsequent asset review and shipping transfer. Source reproduction still requires the retained original scenes/PNG masters and documented cohort/helper dependencies; a publishing-branch clone alone cannot re-export this art.

For another fresh private export, `tools/normalize-recon-medic-art.ts` welds/prunes, proves exact oriented attribute streams through same-material primitive consolidation, then applies Meshopt. `tools/externalize-recon-medic-atlas.py` verifies all three frozen WebP payloads and every remaining geometry/compression byte span before externalizing their image buffers. Both tools accept explicit input/output paths under `.sites-runtime` and refuse existing output files. These steps do not imply appearance, posed geometry, contact or release approval. Exact decoded inherited-triangle subset, rig/sole, source classification, production carrier/IK, rendered transport and scoped resource checks remain separate.

The unchanged three 1024 px transport maps total 18,332 bytes. White paint and pale steel use albedo-only UV offsets while normal/ORM preserve their original swatches. Separate GLTF parsers still allocate three additional GPU textures per revised role in the measured scene; shared URLs do not prove shared GPU allocation. The Higgsfield job in `higgsfield-recon-medic-concept.json` supplied a specific original design reference at 2.75 credits, with no purchase/top-up. Its pixels are retained locally and are not gameplay screenshots or mesh/rig evidence.

## Detailed environment candidate

The next reviewed slice retains complete official CC0 factory/fir/fern packages and separate editable assemblies. See `factory-provenance.json`, `factory-bounds.json`, `foliage-provenance.json`, `environment-optimization.json` and `higgsfield-factory-sign.json` under assets/reference. These receipts and shipping GLBs are fingerprinted. The installed game-dev CLI is unavailable; local provider/package validation is explicit rather than claiming its vendor admission workflow ran.

```powershell
python tools/fetch-polyhaven-model.py fir_tree_01 --format blend --resolution 1k
python tools/fetch-polyhaven-model.py fern_02 --format gltf --resolution 1k
python tools/prepare-foliage-source.py
& $env:BLENDER_PATH --background --python-exit-code 1 --python tools/build_foliage.py
python tools/prepare-factory-sign.py
& $env:BLENDER_PATH --background --python-exit-code 1 --python tools/build_factory.py
python tools/inspect_factory.py
npx tsx tools/optimize-environment.ts Forest_Fir.glb Forest_Fern.glb Factory_Workshop.glb
python tools/record-foliage-provenance.py
npm run assets:validate
```

Factory generation requires its retained official package and Higgsfield sign source. Normalizing a sign does not submit a generation. Blender uses `--python-exit-code 1` so Python failures cannot silently succeed. Keep source package data unchanged and derivatives separate. Before release, inspect decoded source UVs, alpha and PBR in actual rendering: asset names, presence of textures and file-size checks alone do not prove they sample correctly.

For an animation-only turn update, `build_feline_mech.py --turns-only` opens the retained editable rigs and appends the two original turn actions. `npm run assets:optimize -- --feline-only` compresses only those seven rigs and retains other admitted art and textures. Compare decoded geometry, skin data and every preceding clip against the frozen release before accepting the export. Standalone and combined pose receipts complement actual gameplay contact review; source composition alone does not qualify the final IK, carrier, head aim or arbitrary surfaces.
