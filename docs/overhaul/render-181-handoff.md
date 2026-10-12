# Render181 source handoff

Writer CLOSED. One source candidate; independent source review and actual render admission pending. No browser, build, server, asset, native, quality, density, camera or animation edits. No candidate repair used.

## Change and ownership

Only production changes: `src/game/world/FoliageInstances.tsx` and new `src/game/world/spatialFoliage181.ts`. The original caller is preserved byte-exact in `tools/overhaul-render-181/preimages/FoliageInstances.tsx` (SHA c74de98c75c1a37d55a10b0138ccaa68bda12bee943644185ec9aed2ef525a73).

The caller now packs its existing per-LOD/material instances into cached 32m cells instead of one world-wide instance mesh per primitive. Every prop has exactly one cell. Existing source matrices, authored meshes, materials, UVs, seed tint, fern variants, LOD distances/hysteresis, 10Hz refresh, native props and shadow policy are retained. Bounds are recomputed from each current dense pack. Three can evaluate each cell independently for each main/shadow camera; no main-camera compaction is shared across passes. Geometry/material ownership and disposal remain with the original preparation lifecycle. Total allocated instance capacity per primitive is unchanged; more mesh objects are created.

## Exact saved-draw correspondence

Offline source-derived variant layouts uniquely matched all raw index count/byte-offset operands, not merely shader labels. Full block/module operands are in `correspondence181.json`. The seven OFF city groups all share program992/tag RainlineIdentity_glazing but have these actual compiled owners:

| Index buffer | Capacity bytes | Source owner / material | Triangles/frame |
|---|---:|---|---:|
|728|120834|Identity / metal|174683|
|732|32112|Identity / masonry|45192|
|736|36720|Identity / mineral|62196|
|684|5328|Identity / glazing|8688|
|738|141108|Street / painted|103400|
|740|16776|Street / rubber|17092|
|742|624|Street / instrument|460|

These sum to 411711 OFF triangles; ON raw groups sum to 411387. Extraction layouts were separately decoded and do not match these groups. This is a unique compiled-layout correspondence within the actual source catalogs, not a captured WebGL object UUID.

`Forest_Fir.glb` actual LOD2 needles: buffer762, 12798 indices, 25596 bytes, 48 instances = 204768 triangles. LOD1 needles: buffer764, 25515 indices, 51030 bytes, one instance = 8505 triangles. Bark/trunk add 13443 triangles, for 226716 fir triangles across six native draws. Exact GLB hashes and all primitive operands are preserved.

## Finite checks and results

One source-derived inventory invocation completed exit0 (combined extraction/inventory tool wall 2.75147s). One actual decoded foliage fixture completed exit0 (tool wall 1.1599231s), 179 directed checks. It reconstructs the saved OFF quad, ON quad and ON upright cameras at FOV62/aspect1.6 with exact source seed7734/chunk selection/Low LOD laws, complete actual fir geometry and original matrices. Each case has 49 trees, LOD counts [0,1,48], 17 cells. All source vertices inside each saved frustum remain in an eligible cell; cell boundaries, negative coordinates, single ownership, empty input and actual saved index/instance operands are checked.

For these saved cameras, eligible fir geometry falls from 226716 triangles / six draws to 10044 / three draws: 216672 fewer triangles, about 24.3% of saved OFF geometry and 19.7% of ON geometry. This is an offline camera-eligibility result. It does not measure GPU time, actual candidate submissions, occlusion, worker cost or affected-human FPS. Saved OFF imagery retains one nearby LOD1 fir, consistent with the reconstructed selection.

Caller integration then passed `node node_modules/typescript/bin/tsc --noEmit`, terminal exit0 in 13.453s under a 60s process cap. PID365824 is closed; stdout is empty and the explicit terminal receipt is preserved. No further fixture was needed for the narrow caller packing change. Neither closed143 nor closed174 fixtures were replayed.

Root CPU182 separately measured render/renderBufferDirect work without a single dominant main-thread CPU function; worker CPU and human rendering remain unmeasured. This candidate targets concrete excess submitted geometry rather than claiming a human lag fix.

## Remaining gate and limits

Root should run one ordinary actual ON/OFF Low gate with real movement and camera turns: compare actual native draw/index/instance counts and frame costs, nearby/distant appearance, streaming/unmount and camera changes. High shadow behavior and context restoration remain unobserved. More cell batches can increase draw calls in views that see many cells; net actual cost must be admitted before shipping. No city geometry, ruin/intact poses, support/destruction or actor detail was changed. The old 178 candidate remains rejected and untouched.

All immutable read inputs/assets match closure fingerprints; the only changed historical read input is the explicitly owned Foliage caller, whose exact original is preserved. This packet is source-only and unshipped. Full movement/art and affected-human severe lag remain unresolved.
