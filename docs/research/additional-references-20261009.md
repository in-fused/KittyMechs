# Additional KittyMech references and rebuild decision

October 9, 2026. Research only. The user cleared the previous goal; `get_goal` returned `null`. No new goal, runtime changes, tool installations, asset-generation jobs or purchases were made. The [new task prompt](new-overhaul-task-prompt-20261009.md) is a draft for the user to submit later.

This supplements the [overhaul blueprint](overhaul-20261009.md) and [subscription-free asset plan](subscription-free-assets-20261009.md). It changes the architecture recommendation from provisionally retaining R3F to explicitly allowing a lean custom runtime when a bounded comparison demonstrates an advantage. It does not establish that writing a renderer from scratch is necessary.

## Evidence boundaries

Direct X page fetches returned 403. Official `publish.twitter.com/oembed` responses exposed the three posts' text, which was read as data. Their videos were not independently reviewed. Two linked sites were inspected in the browser and their publicly served application code was read statically. This is a substantial review of the accessible evidence, not a claim to have watched unavailable videos or audited entire products. Creator statements about models, build times and quality remain attributed claims.

No reference code, models, textures or remote videos were copied into KittyMech. Public accessibility is not a reuse license. The temporary reference tabs were used for inspection, not a controlled performance benchmark.

## 1. Kaiju: destruction integrated with mission progression

[Stefan's post](https://x.com/Stefan_3D_AI/status/2106024277762097354) attributes the game to Opus 5.5 and claims every city building can be broken, seven mission stages and a completed run without bugs. The accessible post supplied no playable build or source link. A focused search did not locate one. The video, destruction mechanics, engine, licensing and reliability were therefore not independently verified.

**Use in KittyMech:** destruction must affect the mission and traversal space, rather than remain a cosmetic ability effect. An initial mission should require breaching, climbing, defending and surviving changing structures. Progression needs distinct objectives and checkpoints. This reference does not prove structural support simulation, directional collapse, synchronized multiplayer ruins or a budget for implementing them.

## 2. Teleoperator: an actual custom WebGPU layer alongside Three.js

[Mindblown's post](https://x.com/mindblown_ai/status/2106089461969019357) describes a San Francisco teleoperator game made with Fable 5.5 and Three.js. That model attribution is the poster's claim; its development history was not independently verified.

On [Teleoperator](https://teleoperator.mindblown.ai/), I inspected the vehicle selection and started a shift. The resulting ordinary gameplay view showed a third-person taxi on a hilly road, textured facades, vegetation, traffic, street furniture, a minimap and a ride objective. I did not finish a fare, assess sustained driving, test collisions or multiplayer, or benchmark it. A screenshot/AX capture initially timed out; later DOM inspection and screenshots worked. That tooling timeout does not establish a game defect.

The outer page embeds a game at [`/?mb=game`](https://teleoperator.mindblown.ai/?mb=game). Its public [application bundle](https://teleoperator.mindblown.ai/app.js) contains direct GPU-adapter/device initialization and an explicit Three.js WebGL fallback. It also contains Three.js scene/model helpers and compressed-model loaders. The [boot module](https://teleoperator.mindblown.ai/boot.js) preloads assets. These are static code observations, not an independent determination of the backend used by the inspected browser frame. A `WebGLRenderer` identifier alone would have missed the custom GPU path.

Asset references include downtown map/building data, facade atlases, lightmaps, impostors, vegetation and vehicle models. The visible result supports the value of coherent streets, curated assets and an understandable objective. No general code or asset reuse license was located; copying the bundle, vehicles or map data is not admitted.

**Use in KittyMech:** a custom game layer can coexist with Three.js loaders and scene helpers. Evaluate a lean TypeScript simulation/animation/render loop against the existing React-hosted runtime. WebGPU can be considered seriously, while assets, animation, collisions and game design remain separate engineering work. Do not recreate a graphics engine merely because a post calls its application custom.

## 3. Gigacity: concentrated procedural city presentation

[The Three.js post](https://x.com/threejs/status/2108328281904992441) links to [Gigacity](https://sael.net/gigacity/). Its served import map uses Three.js 0.186.1, `three/webgpu`, `three/tsl`, and TSL postprocessing addons. The application constructs a WebGPU renderer.

The author's visible “How it works” panel describes seeded lot/tower generation, parametric architecture, shader-based interior illusion, arithmetic traffic motion and atmospheric depth. These are the author's explanations, not independently verified scale or performance claims. The initial Auto view showed a blue canvas; after selecting Fast, a dense city with detailed facades, balconies, signs, flying traffic and fog rendered. HUD counts and FPS were observed but are not accepted as measured performance. No destruction, climbing or mission system was established. The page reserves rights in its code and scene; no reuse license was found.

**Use in KittyMech:** combine authored district rules with procedural variation and inexpensive distant detail. Interior shaders and decorative traffic enrich the view but must not invent physical grips, supports or destructible occupants. Every interactable building needs authoritative geometry and structural data. Render quality presets must preserve the gameplay contract.

## 4. What changes in the new task

The recommendation is a **selective rebuild with permission to replace the runtime**, not another indefinite patch cycle and not deleting everything first. Retain the existing assets, useful network/lifecycle safeguards, build tools and evidence. Replace weak systems according to observable results.

Use one representative integrated district to select the architecture and production method. It must contain a detailed feline mech, quadruped/upright movement, paired combat, climbing on every building, consequential structural damage and a cooperative mission. A camera-only city demo or a polished title screen cannot pass this gate. Then expand the accepted systems to all four mechs, Rainline/Ember/Frostline, and the requested game modes. The first district is a sequencing decision, not the final game scope.

Choose the renderer separately from gameplay state. A fixed simulation step, interpolated presentation, explicit input actions, animation ownership and a common building representation matter regardless of WebGL/WebGPU. Compare bounded candidates on Taylor's actual PC before selecting a renderer. A custom layer is justified by simpler ownership, better frame pacing or better delivered gameplay—not by its name.

Asset production remains local Blender authoring, retained Higgsfield references and properly licensed free content. Existing films are choreography references, not skeletal clips. No paid substitute, new subscription or training on retained Higgsfield outputs is part of the plan. This inspection produced no new local-generation benchmark.

An independent critic must assess normal play, authored close-up art, camera behavior, paired combat and support loss, alongside technical checks and two-client evidence. Approving this research or the prompt is not release approval. If an implementation fails the same quality gate twice, revisit the design or architecture instead of extending a micro-tuning loop.

## Sources inspected

| Primary source | Inspection | Limit |
| --- | --- | --- |
| [Kaiju post](https://x.com/Stefan_3D_AI/status/2106024277762097354) | Official oEmbed text | Creator claims; no accessible game/source/video review |
| [Teleoperator post](https://x.com/mindblown_ai/status/2106089461969019357) | Official oEmbed text | Model attribution unverified |
| [Teleoperator game](https://teleoperator.mindblown.ai/) | Browser selection, started shift and ordinary play view | No completed ride or benchmark |
| [Teleoperator application](https://teleoperator.mindblown.ai/app.js) | Static initialization, loader and asset-reference inspection | Not a full code audit; active browser backend not probed |
| [Teleoperator boot](https://teleoperator.mindblown.ai/boot.js) | Static preload inspection | Asset licenses unestablished |
| [Three.js Gigacity post](https://x.com/threejs/status/2108328281904992441) | Official oEmbed text | Link, not implementation claims |
| [Gigacity](https://sael.net/gigacity/) | Static imports/init, visible explanation, Fast preset screenshot | No gameplay/destruction verification or controlled benchmark |

