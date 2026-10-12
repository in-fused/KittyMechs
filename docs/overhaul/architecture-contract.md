# KittyMech architecture comparison contract

Decision status: **open, pending measurements on the GTX 1070 Ti**. The two candidates are an R3F repair with an imperative presentation owner and a lean imperative Three.js TypeScript renderer. No third implementation has been added. Existing networking and gameplay authority are retained for integration.

## Launch and capture

Use the existing Vite development server. Open these at the **same viewport size and browser zoom**, in separate sequential runs:

- `/benchmark.html?candidate=r3f`
- `/benchmark.html?candidate=three`

The entry is independent of `src/main.tsx`. It uses Three r180, React 19 and R3F 9 already installed. Eight animated copies of `/assets/models/Pounce_Quadruped.glb?rev=feline-pounce-art-12` and one deterministic district are shared. A future local asset can be supplied as `&model=` followed by its URL-encoded path, using the same URL for both candidates. Failed asset loads appear in the HUD and capture API; they do not silently substitute a primitive.

Controls: WASD move, Space jump, R toggle quadruped/upright stance, Q rotate the camera a quarter-turn, drag on the playfield to orbit. Reset restores the player and camera. UI buttons start and stop ordinary-play capture, run a 30-second matched route, and save the report as JSON. Allow at least five seconds after `ready` for shader and animation warmup before recording. Capture the same movements through the same district, including jumps, stance changes and camera changes, for each candidate. The matched route also toggles stance. A matched route is supplemental controlled evidence, not a replacement for ordinary play.

Browser capture API:

```js
window.kittyBenchmark.ready                    // true after Pounce load
window.kittyBenchmark.error                    // null, or loader error
window.kittyBenchmark.reset()
window.kittyBenchmark.start('ordinary-play')
// Use the keyboard; scripts can also use the identical command boundary:
window.kittyBenchmark.setInput({ forward: true, jump: false })
window.kittyBenchmark.setInput({ forward: false, jump: true })
window.kittyBenchmark.setInput({ jump: false, transform: true }) // rising-edge stance toggle
window.kittyBenchmark.setInput({ transform: false })
window.kittyBenchmark.setCamera(0, 0.35)       // radians
const report = window.kittyBenchmark.stop()   // full serializable report
window.kittyBenchmark.lastReport              // last explicit stop result

window.kittyBenchmark.route(30)                // reset + start matched-route capture
window.kittyBenchmark.status().routeActive    // wait until false, then stop()
window.kittyBenchmark.snapshot()              // current report; does not stop
window.kittyBenchmark.status()                // cheap live status, no sample sorting
```

`route()` from the API does not stop capture automatically. The UI route button does. `setInput` merges fields, so explicitly release every held field. Capture is bounded to 36,000 visible frame samples. `start` replaces the active capture. `stop` returns its complete report, while a subsequent `snapshot` is a fresh live view with no active samples.

Reports have schema `kitty-benchmark-v1`: raw samples; interval mean/p50/p95/p99/max; implied FPS; counts above 16.7 and 33.3 ms; update and render CPU distributions; draw-call and triangle distributions; live geometry, texture and shader-program counts; framebuffer size/DPR; exposed GPU/vendor; district revision; actor model URL and clip names; authority tick and final pose; hidden-frame and discarded-step counts. Renderer counts include the shared shadow passes. Render CPU includes visual pose/animation, camera and draw submission; it is **not GPU elapsed time**. Browser/driver privacy settings may hide GPU identity. Record the actual hardware separately if needed. Shader first-use and asset loading are outside the intended warmed capture.

Renderer settings are identical: DPR 1, antialiasing enabled, high-performance preference, ACES exposure 1.1, sRGB output, hemisphere/sun illumination, exponential fog, 1024 PCF soft shadows, 62-degree camera, near .1/far 850, no postprocessing. Canvas sizes must match. Raw intervals use `performance.now()` at the frame callback; this measures user-visible scheduling as well as rendering. Discard or separately label runs with a hidden page, capture after cold shader start, software rendering, different viewports, or discarded authority steps. Do not infer a winner from a single FPS average near the display refresh cap; compare tails, repeat runs, visual parity and integration cost.

The API observes `navigator.gpu` and whether an adapter can be requested. This is a capability check, **not evidence that WebGPU improves this workload**. It creates no WebGPU renderer. A third candidate requires a concrete, measured reason outside this bounded comparison.

## Authority and presentation ownership

The benchmark authority is deliberately small: a fixed 60 Hz kinematic movement/jump/collision/stance owner, with previous/current pose snapshots. R uses a rising-edge authoritative stance toggle, .7-second transition admission interval and basic overhead clearance. Upright movement/jump values match existing Pounce configuration. It uses sealed building navigation hulls and street equipment AABBs. Its scenery has 16 buildings with column, beam, slab, wall, glazing, roof and equipment parts; parts compile into five material batches. The seven other rigs are deterministic cosmetic animation load. The benchmark does not reproduce combat, Rapier cost, multiplayer traffic, fracture simulation, weather, material dressing, postprocessing, or paw IK. It demonstrates viable scheduling/ownership and equal scene rendering, and cannot prove complete-game performance or networking correctness.

Integration keeps `shared/Simulation` as the authority, the existing host/client snapshot/input transport, fixed 60 Hz stepping and 20 Hz snapshot publication. Session generation fences and physics failure latching remain required. Only the authority can advance Rapier or change survival, collision, damage and structural topology. A renderer can read published snapshots, interpolate and show effects; it cannot step the world, write player authority poses, create gameplay colliders from presentation, or infer damage from visible meshes.

Climbing and traversal admission stay inside fixed authority: command intent is checked against the common compiled surface's stable ID, generation/topology revision, surviving collider, reach and clearance. The snapshot publishes the accepted contact point/normal, traversal mode and progress. A cached visual support receipt cannot outlive its structure revision; a demolished or detached surface ends the authoritative contact and the renderer releases its associated paw lease. Camera smoothing and pose correction consume the accepted state and cannot turn a rejected contact into a successful climb. Combat likewise keeps cooldowns, aim/hit queries, projectile motion, damage, stance/ability admission and structural break events on the fixed authority. Render muzzle flashes, recoil, strikes and debris use committed event IDs/timestamps, with bounded cosmetic interpolation and duplicate suppression across snapshots. Presentation animation completion never applies damage or selects the authoritative impact tick.

Ownership order for either future adapter: input command boundary → fixed authority steps → committed snapshot publication → structural presentation → actor animation/pose → camera composition → render → completed-frame metrics. React mounts and retires owners, and may update low-frequency DOM/rosters. It does not own per-frame transforms or skeleton poses. The harness's R3F hook has positive render priority to make its single explicit draw owner unambiguous; Three uses one animation loop. Both call the same presentation pipeline, so this is a comparison of the proposed repair and imperative lifecycle patterns, rather than the old game's entire React component graph versus a reduced scene.

The accumulator retains sub-tick time for interpolation, caps catch-up to eight fixed steps and reports discarded steps. That benchmark policy is not authorization to drop live network authority ticks; integration must preserve the game's authority policy. Snapshot sequence and session generation identify a render stream; late async assets must not attach to a retired stream.

## Units, pivots and animation contract

- World units are metres, Y up, right handed. Floor `y=0`; world gameplay forward is the actor root's local `+Z`, with yaw `atan2(dx,dz)`.
- Structural box transforms are world-space **centers**, axis-aligned full sizes in metres. Render box pivots are centered. Collider min/max derive from the same centers and sizes.
- An actor root is at its floor/contact origin. Existing Pounce art uses a `.8` carrier scale and a `PI` Y carrier rotation, as the current actor renderer does. The harness applies a measured static bind-pose lower-bound offset to put its imported asset at the floor. This benchmark normalization is recorded as `modelFloorOffset`; production exports must supply an explicit floor pivot and cannot depend on animated bounding-box recentering.
- Actor collision dimensions, camera envelope and articulated visual dimensions remain separate metadata. Production conversion preserves existing `ACTOR_HEIGHT` snapshot-to-floor convention explicitly in an adapter; it must not reinterpret center snapshots as floor snapshots.
- The presentation owner owns one mixer per actor, shares immutable asset geometry/materials, and chooses clips from exact manifest names. A missing walk clip remains an explicit asset limitation. The benchmark blends `FelineIdle`/`FelineWalk` with `FelineUprightIdle`/`FelineUprightWalk` and bounded `FelineTransformUp`/`FelineTransformDown` sampling from authoritative stance time. This simple stance presentation is shared by both candidates; integration retains existing traversal/combat clips and the approved procedural animation contract.
- One staged pose pipeline owns the skeleton: restore authored base → clip sampling/blending → bounded procedural correction → optional authority-contact-qualified IK → camera-envelope publication. No second owner may add another mixer or write the same bones after publication. Animation never creates collision authority or extrapolates structural support from visible debris.

## Stable manifests and compiled structural representation

Production manifests must be revisioned and immutable for a session. Each asset record includes stable ID, content revision/hash, URI, licence/provenance, units, floor pivot, forward axis, scale policy, static/collision bounds, named clip/root-motion policy, material slots, LODs and expected draw/triangle/texture budgets. A content revision changes cache identity; a URI alone is not revision identity. Keep source and approved converted asset revisions traceable. Both architecture candidates use the exact same manifest revision during measurement.

`district.ts` demonstrates the common compiled boundary (`benchmark-district-v1`):

```ts
type StructuralPart = {
  id: string;                  // stable structure ID + local part ID
  structureId: string;
  kind: 'column' | 'beam' | 'slab' | 'wall' | 'roof' | 'glazing' | 'equipment';
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  material: string;            // stable material-slot ID
  collision: boolean;
};
```

The production compiler extends this representation with asset revision, topology revision, local-to-world transform, collider recipes, support graph node IDs/edges, damage/fracture groups, gameplay surface tags and batch/LOD memberships. Rotation must be represented explicitly before rotated structures are supported; an axis-aligned benchmark box is not a universal collision schema. Both authority and rendering consume this compiled definition. Deterministic structural compilation occurs once, independent of React or Three objects. Rapier handles, Three geometries/materials/instance indices and local visibility/streaming state belong in adapters, never in the common record or network payload.

An authoritative mutation refers to stable part/group IDs plus generation/tick/topology revision. The presentation maps those IDs to instance slots and visual debris. Render culling or LOD does not change collider/support state. Retiring a structure invalidates both its authority handles and published contact receipts; recycled render slots never change logical IDs. Render meshes and authority collision can have different detail, but derive from the same compiled source and accepted surface policy. Future destructibility requires support-graph and survival-state tests before measuring visual fracture as gameplay.

## Handoff paths and validation

- `benchmark.html`: standalone development entry.
- `src/overhaul/benchmark/main.ts`: controls, capture UI and `window.kittyBenchmark`.
- `src/overhaul/benchmark/candidate-r3f.tsx` and `candidate-three.ts`: the only two lifecycle adapters.
- `src/overhaul/benchmark/district.ts`: deterministic structural compiler.
- `src/overhaul/benchmark/authority.ts`: isolated fixed-step authority.
- `src/overhaul/benchmark/content.ts`: common instanced district, asset animation, light/camera and draw pipeline.
- `src/overhaul/benchmark/runtime.ts`: frame ordering, input, capture and capability observation.
- `tools/overhaul-architecture/tsconfig.json`: isolated strict typecheck (`npx tsc --project tools/overhaul-architecture/tsconfig.json --noEmit`).
- `tools/overhaul-architecture/vite.config.ts`: optional standalone benchmark build (`npx vite build --config tools/overhaul-architecture/vite.config.ts`). Output stays under `tools/overhaul-architecture/dist`; the product Vite configuration is unchanged.

Static typecheck and standalone Vite production build passed. The parent completed frozen comparison-003 and selected R3F; see architecture-decision.md. This contract does not approve integrated gameplay.
