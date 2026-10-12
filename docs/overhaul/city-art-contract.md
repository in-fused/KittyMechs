# Rainline city art handoff

Runtime: `src/game/world/overhaulDistrictArt.tsx` exports `OverhaulDistrictArt({seed,presentation})` and `OverhaulRuinsArt({seed,presentation})`. The latter reads optional `PresentedCityState.ruins`, with stable compiled block index, authoritative world position and quaternion, settled flag and birth time. Both use the same optimized GLB and shared compiler ownership.

## Artifacts and provenance

- Editable source: `assets/source/overhaul-city-v1/Rainline_Modular_City_v1.blend`.
- Shipping GLB: `public/assets/overhaul/city-v1/Rainline_Modular_City_v1.glb`.
- Author script: `tools/overhaul-author-city.py`.
- Source/game-distance review: `assets/source/overhaul-city-v1/review-game-distance.png` (1600x900).
- Optimization and audit scripts plus exact measured report: `assets/source/overhaul-city-v1/{optimize.mjs,audit.ts,validation.json}`.

All geometry and eight PBR palette materials were locally authored for this project. No third-party mesh, paid API, generated external image or newly downloaded content is used. Existing `assets/reference/factory-provenance.json` and `hdri-files.json` were inventoried once; no assets were borrowed from those packages. This kit is original project art, not represented as third-party CC0. Source subtrees are git-ignored; preserve with targeted forced add when committing.

## Geometry and ownership contract

Blender roots are separate editable component families: `frame`, `foundation`, `facade_apartment`, `facade_shop`, `facade_workshop`, `roof`, `slab`, `gantry`, `bridge`, `rail`, `props`. Child meshes have stable `<root>__<material>` names. Material groups are editable separate objects. `REVIEW_Street_Assembly` is source-only and excluded from GLB export. Apartment glazing has modeled jambs, sills, crossbars and internal shelves; shop cells add painted fascia marks; workshop cells add roller shutter ribs and hazard strips. Roofs have standing seams and gutters; frame columns have collars and angle reinforcement; utility cabinets have caps, louvres and a pressure port.

Runtime units are meters, Y up, component pivot at exact box center. Each module is contained in the centered unit cube. Runtime scales by twice the compiler's `halfExtents` and uses the exact block center. West/east facade modules rotate 90 degrees and swap X/Z scale so canonical glazing fits the correct physical facade. All detailing stays inside the owning component volume; this adapter creates no extra buildings, colliders or grips. No full-building backing mesh exists. Fixture components along ordinary routes come from the compiler's eight real utility cabinet cells.

Intact instances use `cityBlockActive` with the existing presentation clock. Every material child is compacted out when its owning block becomes inactive. Ruins instances instead follow `ruins[block]` poses, composing authoritative quaternion with the canonical facade rotation. Settled ruins retain detailed component geometry as long as their authoritative snapshot entry persists. The renderer does not invent rubble lifetime or delete settled ruins. Shared state/simulation owns collision, support closure and climb eligibility.

## Exact measured budgets

Final shipping GLB: **42,944 bytes**, SHA-256 `b35ec348477d32ee309ea0b5a5b60c09717cf01c60626d80b75ced7ad53e7630`. **2,332 unique triangles**, **8 shared materials**, **0 textures**. Asset budget: <64 KB GLB, <=2,500 unique triangles, <=8 materials, zero texture memory. Optimization: glTF Transform weld/dedup/prune and meshopt medium; no Draco decode required. Drei/GLTF loader uses meshopt support.

For compiled revision `rainline-first-district-v1` with 934 components: **364,064 fully intact triangles**, **33 instanced material batches/draw calls per pass**. Runtime contract budget: <=400,000 district triangles and <=40 intact draw calls per pass. Ruins uses the same batches, with only authoritative removed components rendered (no intact/ruin double drawing). Shadows add renderer passes; these counts are geometry submissions, not full-frame GPU timing. Both adapters share cached material/GLB resources; each adapter owns only transformed geometry copies. Static instancing updates only on presented damage/ruins revisions. No per-frame traversal of scene geometry is needed.

## Verification and limits

`npm run typecheck` passed after both intact and ruins adapters. Structural audit decodes meshopt/quantized positions with complete node transforms and verifies every vertex within normalized bounds. One correction inset shelf/window details into owner bounds; final audit passes. The audit verifies all 934 initial components are active and all are absent with fully broken banks, and reports module triangle/draw counts. Local Blender rendered the source assembly successfully. This review is an authored kit/assembly view, not a captured gameplay acceptance image. Root browser lane owns live scene, performance, falling component and settled collision validation.


## V2 ordinary-view art revision (pending critic approval)

V1 editable source, raw/shipping GLB, report and original author script are preserved in the v1 subtree. Current runtime URL is `/assets/overhaul/city-v2/Rainline_Modular_City_v2.glb`; source is `assets/source/overhaul-city-v2/Rainline_Modular_City_v2.blend`. The author script now produces v2. No shared district or simulation files were edited in this revision.

The ordinary capture `.sites-runtime/overhaul-20261009/district-001/quad.png` exposed repeated giant panels and blank peach sides. The backing core is now centered and shallower so exterior details cannot be hidden by it. Facades have one exterior front, oriented to the compiler's west/east/north/south normal; ordinary interior faces are plain backing. Bay/row selection distinguishes ground workshops, factory upper clerestories and ducts, selected ground shops, two-level apartment windows/shutters, utility intake panels, station fronts and civic fins. Storefronts and workshops have deeply inset glazing/doors, canopies, display shelving and original locally modeled lettering (`WORKS 07`, `DOCK MARKET`, `PUMP 04`, `RAINLINE`). Roof styles differ by usage with contained parapets, vents, rooflights and low circular housings. Roof art stays inside the existing .4m slab envelope; no tall rooftop obstacles or extra gameplay solids are invented.

V2 uses six retained licensed factory texture maps: brick, garage and trim base color + matched OpenGL normal, downsampled locally to **512x512 JPEG** and embedded in GLB/source. Source/derivative SHA-256 and full license lineage are in `assets/source/overhaul-city-v2/provenance.json`; retained original admission is `assets/reference/factory-provenance.json`, with local provider license HTML. Maps are **CC0-1.0**, author **James Ray Cock**, [Poly Haven Modular Factory Facade](https://polyhaven.com/a/modular_factory_facade). No new network asset, paid API or generated image was used. Eleven shared material palette factors are applied by the optimizer to the retained wear maps. Original source geometry and lettering remain editable.

Measured v2 shipping budget: **574,656 bytes** (+531,712), **3,348 unique triangles** (+1,016), **11 materials** (+3), **6 textures** (+6). SHA-256 `60fdf81c28f3b7193129111b72179bdf96cc3a9c254c1241e2bb5606aa9f5870`. Fully intact same 934-component district: **256,272 triangles** (**-107,792 / -29.6%**) and **64 instanced material draws per pass** (**+31**). This replaces the v1 art budgets: v2 limits <=650KB GLB, <=3,500 unique triangles, <=12 shared materials, six <=512px maps, <=280,000 intact district triangles and <=65 intact draws. Six maps require about **8MiB decoded GPU memory including mipmaps** assuming RGBA8. Texture UVs intentionally repeat outside [0,1]; glTF Transform skips UV quantization for these while meshopt compresses geometry. Shadows and ruins add their own passes; root's browser lane must measure whole-frame performance.

The ruin adapter also corrects full world rotation handling: authoritative pose quaternion composes only the canonical art-facing offset, rather than adding the original block yaw twice. Exact original half-extents remain the scale contract. All trim, lettering, glazing and vents follow the same component mask/pose.

One local render/check was taken: `assets/source/overhaul-city-v2/review-ordinary-street.png`. It demonstrated texture/facade distinction but caught a Blender font dimension-cache problem. The evaluated lettering meshes were then normalized and audited to exact requested dimensions without another render. That PNG is retained as **pre-font-repair local review**, not final acceptance evidence. Final geometry audit passed **18,762 decoded position coordinates** inside normalized unit bounds; all 934 intact owners show, and fully broken banks remove every intact owner. Current browser critic capture must qualify the final source/GLB; art remains **unapproved** pending that review.
