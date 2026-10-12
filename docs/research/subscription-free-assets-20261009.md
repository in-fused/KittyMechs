# Subscription-free KittyMech asset pipeline

**Current state, later October 9:** The owner cleared the previous development goal. Earlier paused-state language below is historical. This asset plan remains applicable to the [new task prompt](new-overhaul-task-prompt-20261009.md), which has not been executed.

October 9, 2026. This records the user's decision to cancel Higgsfield and buy no further Higgsfield credits/subscription. It is an implementation-ready replacement plan, not a claim that new tools were installed or an asset overhaul shipped. Continuous development remains paused during research.

## Selected method

Use **local Blender authoring + the retained reference bank + CC0 materials**, with optional local generation for specific gaps. The core pipeline requires no paid asset API, hosted generation service, or new asset subscription. Existing coding-model usage and computer time still have costs; “subscription-free” refers to the selected asset-production tools and content sources.

No hosted free-demo quota is treated as a dependable production resource. A paid Meshy/Tripo/Leonardo API is not substituted for Higgsfield. New code must not require contacting a generation provider to launch or play the game.

## What is already retained

A filesystem inventory on October 9 found **55 original PNGs** in the raw directories under [city-materials-v1](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/city-materials-v1/README.md), and **16 non-empty local MP4 references**, totaling 257,167,265 bytes, under `assets/source/city-materials-v1/motion/raw`. This inventory checked presence/count/size, not a fresh full cryptographic audit. An additional Bastion shield reference is retained under `assets/source/free-motion-transfer-v1/raw`. The `local-assets-snapshot` Git branch exists; that is not a new independent off-PC backup verification.

The main motion bank contains four categories for each Pounce/Bastion/Lynx/Caracal: Stride, Jump_Climb, Transform_Run and Paired_Ability. [Existing visual inspection](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/city-materials-v1/motion/visual-inspection.json) and frame-extraction records remain. The [frozen bank README](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/city-materials-v1/README.md) records limitations: geometry drift, framing changes, incomplete ledge transitions, weak sustained upright motion and rejected non-seamless material candidates. These are reference movies, not rigged gameplay clips.

[Higgsfield's current terms, section 4.4](https://higgsfield.ai/terms-of-use-agreement) state that rights in generated/exported outputs survive subscription cancellation, subject to applicable model/content terms. Our selected reuse is art reference and asset authoring. Do not use this bank to train or fine-tune replacement models: section 5.2 restricts that use. Retain job/provenance ledgers and existing rights notes. No cancellation or account action was performed by the agent.

Editable sources already exist in `assets/source/feline-web`, `pounce-art-v1`, `bastion-art-v1/v2`, `lynx-art-v1`, `caracal-art-v1`, `environment-factory`, `environment-foliage` and `legacy`. Large source assets are ignored on the publishing branch; a source clone alone is not a substitute for these local files. Preserve these before any later cleanup or migration. The user reports the original Unreal tree was deleted; the selected pipeline uses retained local copies only.

## Hardware-aware choices

Windows reports **NVIDIA GeForce GTX 1070 Ti** and 17,112,305,664 bytes of system RAM (about 15.9 GiB). WMI's `AdapterRAM` value is not accepted as a reliable VRAM measurement; no actual local generation benchmark ran. This is not evidence of a 24-GB GPU workstation.

| Need | Selected tool/content | Concrete production use and limits |
| --- | --- | --- |
| Hero mech geometry | Existing Blender 4.5.14 + Python/bpy authoring | Rebuild curved armor, mechanical shoulder/hip assemblies and four distinct silhouettes from retained multi-view art. Editable `.blend` → GLB; no model-service calls. |
| Rigging and skeletal animation | Blender keyframes, custom control rig; optional [Rigify cat/quadruped rig](https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html?highlight=pose+mode) | Author feline spine/scapula/toes/tail movement and dual-stance conversion. Bake explicit action clips and contacts. Rigify is a starting tool, not a complete transforming-mech rig; enable/compatibility status was not tested. |
| Optional Blender control | [MCP for Blender](https://github.com/ahujasid/mcp-for-blender), community MIT connector | Interactive inspect/edit/render access where useful. Existing headless Python workflow already works without MCP. No installation/connection in this research. |
| City and realistic PBR materials | Blender modular kits/procedural materials + [Poly Haven](https://polyhaven.com/license) and [ambientCG](https://docs.ambientcg.com/license/) CC0 sources | Purpose-built columns/slabs/façades/roofs/props; coherent trim sheets, measured texture scale and LODs. CC0 does not mean every package is small or suitable for gameplay. |
| Free animation starting points | [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html), CC0 | Twelve animated animals, Blend/FBX/glTF formats. Inspect actual skeleton and animations before selecting a quadruped retarget test. Low-poly source style is a prototype/reference, not the final hero-mech quality bar. Cat-specific and dual-stance clips are not promised by this pack. |
| Local reference-image/texture generation, optional | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) + a specifically licensed smaller model such as [SD 1.5](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5) | Local graph/API workflow, no paid endpoint. For this GPU the current ComfyUI README identifies a CUDA 12.6/Python 3.12 build for NVIDIA 10-series; do not use its newest CUDA 13 package blindly. SD 1.5 uses CreativeML OpenRAIL-M, not CC0/MIT. Compatibility, output quality and speed still require a small test. Use original prompts/authorized inputs, not model training on the Higgsfield bank. |
| Local image-to-static-mesh, optional | [TripoSR](https://github.com/VAST-AI-Research/TripoSR), MIT code/weights | Official default inference uses roughly 6 GB VRAM. Candidate for one simple prop reconstruction after CUDA/PyTorch compatibility and usable VRAM are verified. Generated mesh still needs Blender cleanup, topology, material work, collision and LODs. It supplies neither feline rigging nor animation. No successful local run claimed. |
| Higher-end 3D generation | [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2), MIT model/code with separately licensed dependencies | Official requirements specify Linux and at least 24 GB GPU memory. Not selected for this PC; do not hide the requirement behind a free MCP or assume paid cloud capacity. |
| Other larger generators | [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) | README reports 10 GB shape, 21 GB texture, 29 GB combined VRAM, plus its own license. Not selected as a dependable local baseline. Low-VRAM/offload options are not a proved quality/speed solution here. |
| Transformation/cutscene/reference videos | Blender timeline/Eevee or captured game-camera sequences | Render the actual approved rig and authored clips, giving consistent geometry and editable timing. This replaces reliance on generated cinematics. The priority is playable animation, then capture/render from it. |
| Audio | Retained owned WAV cues + procedural Web Audio effects | Improve claws, impacts, servos, landings and weather with layered synthesis and existing source recordings. No fresh music-generation subscription. Record origin/license for any additional sound file. |
| Packaging | Existing glTF Transform, meshoptimizer and project exporters | Optimize GLB, textures and clips, maintain source/runtime provenance and inspect normal-camera results. Tools are authoring dependencies; the shipped game consumes local assets. |

The selected core works through editable geometry and animation authoring even if both optional local generators prove impractical on this GPU. This is a real fallback, not a requirement to buy another service or GPU.

## Reference-to-playable workflow

1. **Map existing source to deliverables.** For each chassis, select the best retained silhouette, armor/material source and motion poses. Record source file/job, target mesh/UV/rig/clip and an acceptance view. Use known limitations rather than treating every paid output as approved art.
2. **Choose a canonical shape.** Preserve the role identities, physical dimensions and required attachments. Produce Blender turntable renders at gameplay distance, wireframe/material views and a size comparison. Match the final title/menu artwork to the actual approved model.
3. **Author the deform/panel rig.** Use custom controls for scapula, spine, paws/claws, hips, tail and mechanical joints. Keep rigid armor weights plausible. Define physical bounds that permit the intended performance instead of suppressing torso motion to fit an old capsule.
4. **Extract motion intent.** Study local reference frames for anticipation, foot phase, rear-leg launch and follow-through. Author key poses and transitions on the canonical rig. Generated geometry drift is not copied into skin transforms; video frames are not renamed as animation clips.
5. **Coordinate paired actions.** Author both attacker and victim for pounce/contact/pin/escape/throw. Declare relative anchors and event times. Integrate collision-constrained motion and authoritative interaction locks before presenting a combat clip as playable.
6. **Compile world art.** Build a repeatable district kit and bake structural clusters/convex hulls. Export visible geometry, climbable support and destruction ownership from a common description. Detail every playable neighborhood; use LODs and regional streaming to afford it.
7. **Package and judge the game view.** Check units/pivots, materials, seams, foot contact, deformation, LOD changes and loading. Show uninterrupted gameplay and a two-client demonstration. Neither a Blender beauty render nor a generated video proves runtime quality.

## Bounded setup when development is explicitly resumed

The first asset job is an editable **Pounce geometry/rig/clip successor**, integrated with traversal and an enemy reaction. Use the existing Blender executable and repository scripts. Preserve original masters and the published package; write candidate sources in a new workspace subdirectory and optimize into candidate output.

If new raster references are actually needed, qualify one ComfyUI + SD 1.5 image on this GPU before adding custom nodes or larger models. If one simple retained-authorized prop shape would benefit from reconstruction, qualify TripoSR separately. Keep both optional tools outside the shipped runtime and do not install their dependency chains into the game's Node environment.

For Blender MCP, use the pinned official repository/package provenance of the community project, keep access local and disable unrelated provider-generation features. A connector is admitted only after one useful inspect/edit/render task succeeds. No full MCP search or install spree is needed.

All new assets retain exact origin, license, authoring source and runtime derivative records. Free downloads can be incorporated without making them the visual target. The final result must still pass the movement/combat/city/destruction review in [the overhaul blueprint](C:/Users/Taylor/Documents/GitHub/KittyMech-Web/docs/research/overhaul-20261009.md).
