# Next city and directional destruction slice

Planning only, 2026-10-04. Implement after the pending upright/jump release is published and separately scoped. This note changes no runtime, art, tests, review documents or frozen asset folder. Preserve the original Unreal tree and all current gameplay evidence.

## Playable outcome and site

Build one dense, connected Rainline repair district: eight materially detailed buildings, an avenue, two service alleys, loading yards, continuous sidewalks, visible drainage/curbs, utility connections, readable signs, roof equipment and a small vertical encounter. Use a designed block composition with consistent meter scale, roof lines, service frontage and street materials. Repeating isolated boxes across empty terrain is not this slice.

Reserve a provisional 128 × 128 m site at world x=[64,192], z=[0,128] (four 64 m tiles). This lies inside the existing ±448 m world boundary. Survey and validate before committing building coordinates: procedural props, authored footprints, existing road grading and full-hull foundations still apply. An incoming route can extend from the existing eastern avenue near (58,-30), turn through (74,-30), then enter the district. These are planning waypoints, not proven admitted coordinates. Do not silently remove existing landmarks, workshops, main objectives or service routes to make the district fit.

Give every new independent gameplay solid a reachable supported top and an authored grip/mantle/exit route. Eight buildings each receive one or two broad climb faces and supported roofs; freestanding cover gets an appropriate short climb/mantle route. Small bolts, pipes fixed to a facade, gutters and signage can remain cosmetic within the measured solid envelope. This qualifies every solid in this district, not every existing tree, crane, mountain or future structure. Provide two connected roof elevations and at least two street routes through the encounter. Start with two guardians and one ground Scout; retain actual LOS, hearing, finite pursuit and truthful respawns. Dense architecture and functional placement matter more than unbounded NPC counts.

## Source-backed constraints to change

- `shared/maps.ts` describes a small authored prop list and three theater road networks. `shared/world.ts` combines those with deterministic vegetation/rocks; it is not a city parcel generator. Its circular lane admission can reject a building whose actual oriented frontage would fit beside a street. Add district-specific oriented-footprint validation, not a blanket admission bypass.
- `propCollider` gives a workshop one solid [10.3,6,8.4] half-extent box. A visual hole in that building cannot become a walkable opening until its affected proxy is replaced. The current detailed factory body is a closed assembly, not independently removable wall panels.
- `shared/traversal.ts` authors service/combat workshop anchors and rectangular supported decks only. `Simulation.attachClimb` considers `climbAnchors(...).slice(0,8)`. New routes beyond that limit would be unreachable. Select nearby eligible anchors deterministically with a bounded candidate count. Preserve grounded/energy/LOS eligibility, conservative full hull, lift-before-crossing, occupied landing, stale/release/death detach and pose retraction.
- `roofPath` in `shared/vertical-navigation.ts` rejects grids above 320 cells and assumes its rectangular deck is supported throughout. Large/partially broken roofs need segmented supported surfaces and explicit support checks; a free space cell over a hole is not a walking route.
- `Simulation` initializes at most twelve whole-prop `CoverState` records. `damageCover` lowers one HP value, emits whole-prop events and retires one body. `Navigation.setPropFilter` clears whole occupancy/path caches, and its 3 m grid plus 2.3 m clearance will not admit a narrow breach. Preserve bounded searches and require a genuinely wide opening, rather than shrinking NPC clearance.
- `World.tsx` instances model parts separately per streamed chunk, tints whole covers and removes destroyed props. It cannot expose partial holes. `GuestCollisionTiles` persistently removes known whole-cover IDs and owns cleanup before Rapier disposal; extend that ownership pattern to stable cell IDs.
- Dedicated arenas run at 60 Hz and send full JSON snapshots at 20 Hz (`server/index.ts`). They stop sending when buffered output exceeds 256 KB. Peer hosts also send full state. Guests currently accept authority snapshots by casting, rather than structural schema validation. Existing event retention is only 1.2 seconds: fracture events cannot be the source of persistent geometry.

## Shared district and fracture contract

Introduce a pure `shared/cityDistrict.ts`: static seed-scoped building IDs, asset family, transform, foundations/footprints, immutable frame boxes, supported surfaces, climb anchors, street fixtures and optional fracture layouts. Keep descriptor construction independent of physics/render imports to avoid the current world/maps/traversal import cycle becoming a data-generation cycle. Both authority and client derive geometry from these exact descriptors.

Each of two designated buildings gets a panelized street-facing bank, 8 columns × 4 rows, with visible depth, edge caps and finite cell HP. Begin with 64 panel cells total. Make openings wide enough for actual hulls: a single roughly 2 m cell cannot pass a Bastion; neighboring cells must be removed to create the promised breach. Author real interior floor/courtyard support behind those banks, with matching side/rear/frame colliders. Do not carve a facade over an unchanged solid workshop box.

Proposed bounded state:

```ts
type StructureState = {
  id: string; version: number;
  brokenMask: number;       // one 32-cell bank, unsigned; no packed 64-bit JS number
  hp: number[];            // exactly the authored cell count; server-owned
};
type StructuralImpact = {
  structureId: string; cellId: number;
  position: Vec3; incoming: Vec3; normal: Vec3;
};
```

Stable IDs come from authored district/building/face/cell identity, not rounded moving debris coordinates. State lives for the room, survives tile eviction and is copied into initial/full snapshots. Add a geometry version and bounded structural state validation at the guest ingestion boundary: known IDs, unsigned masks, exact finite HP lengths and legal versions. Inputs remain ordinary validated movement/aim/fire commands; clients never supply cell damage, masks, fracture positions or debris transforms. Keep existing scalar event `direction` semantics and add vector impact fields explicitly.

Use the winning swept projectile intersection to choose a cell and actual contact normal. Pulse damage affects that cell; rocket damage uses impact position, incoming direction, distance and intact-geometry LOS to choose nearby cells. Direction changes which part opens, not whether the entire facade arbitrarily disappears. Evaluate all actor/cell blast visibility before any geometry retirement; then apply the damage batch and remove exactly the newly destroyed cell colliders. Invalidate affected ground and roof routes. Begin with bounded full-cache invalidation if necessary; add regional versions only when measured work warrants them.

After panel breaches pass, add one deliberately authored structural dependency: two breakable support clusters and one small supported roof/deck sector. Cap this extension at eight additional damageable cells (72 total). Destroying the specified supports removes that sector and its matching visual geometry, invalidates its routes/anchors and lets occupants fall through actual KCC motion. Remaining frames/roofs stay visibly supported. Recheck attached anchors and mantle destinations every tick; never teleport occupants onto a replacement floor. This is targeted directional structural failure, not arbitrary runtime fracturing of every mesh.

Use pre-authored fracture-edge/cap meshes and direction-oriented cosmetic shards. Limit shards to eight per new break, 48 alive, three seconds lifetime, shared material/instancing; discard older shards at the cap. No authoritative dynamic rubble or blocked passages in the first slice. Add debris collision only as a separately budgeted milestone with navigation and networking evidence.

## Ownership and presentation

| Owner boundary | Concrete files/contracts |
|---|---|
| District/layout and geometry | New `shared/cityDistrict.ts`; `shared/maps.ts`, `shared/world.ts`, `shared/traversal.ts`, `shared/encounters.ts`: exact descriptors, foundation admission, segmented roofs, finite anchors and encounter homes |
| Authoritative physics/combat | `shared/simulation.ts`: room state, collider-to-cell lookup, accepted impact, intact-blast evaluation, batch retirement, detach/support loss and safe spawn/respawn |
| Navigation | `shared/navigation.ts`, `shared/vertical-navigation.ts`: live frame/cell occupancy, supported roof segments, routes through sufficiently wide breaches and bounded invalidation/retry |
| State/transport | `shared/types.ts`, `shared/protocol.ts`, `server/index.ts`, `src/game/network.ts`: bounded full structural snapshots, immutable nested copies, guest validation and initial/late-join state; no client mutation endpoint |
| Scene/guest collision | `src/game/world/World.tsx`, `guestCollisionTiles.ts`, new district instance renderer: identical cell admission/removal, late snapshot and tile reload handling, layout cleanup; scene geometry owns GPU lifetime |
| Impact presentation | Effects/render timeline: deduplicated transient events, actual impact direction, bounded shards; persistent masks control holes even when all events expire |
| Editable art | New reproducible building/street assembly tools and retained derivatives; selected original/verified CC0 modules, portable matched PBR, LODs, pivots and per-part bounds; separate future admission receipts |

Authority collision always uses its current accepted structural state. For rendered guests, feed structural geometry and camera/contact proxies from the same presented structural tick/time, not HUD throttling or an unrelated latest actor snapshot. A buffered guest must not show an intact wall while its camera proxy already contains a hole. Late joins initialize from full state; snapshot gaps skip cosmetic effects safely. Record the actual presented structural version alongside authority tick in diagnostics.

## Art and browser budgets

Reuse the accepted detailed factory kit's brick, loading-bay, window and trim language, then author a genuinely panelized variation for the two breakable buildings. Make coherent roofs, gutters, service doors and utility routes; atlas compatible roles and preserve glass roughness. Batch common facade/roof/street parts across visible district tiles by asset/material/LOD, rather than multiplying a seven-material building batch for every tile. Per-building LOD/culling must retain damage silhouettes and every solid's visible proxy. Preserve Ember/Frost identity; expand those only after this district qualifies.

The staged original Higgsfield coolant candidate is usable future input, not admitted art: `assets/source/higgsfield-coolant-candidate/Frostline_Coolant_Candidate_meshopt_pbr.glb`, 1,096,008 bytes, 5,860 triangles, one primitive/material and three 1,024 px maps. Native revision 3/source scripts and inspected cloud previews exist. Its optimized runtime appearance, distant LOD, local Blender compatibility and any model-specific restrictions remain open gates. Higgsfield's platform commercial-output permission was independently checked against its [official terms](https://higgsfield.ai/terms-of-use-agreement); this alone is not a copyright/provenance clearance (retained `assets/source/higgsfield-rights-notes/platform-terms.json`). Use revision-guarded 3D Jutsu editable scene work for bounded architecture/fixtures; no generative-mesh endpoint or automatic license grant is assumed. Preserve all frozen source packages and prior failures.

Starting budgets, to be enforced and adjusted only with retained evidence:

| Resource | Initial district limit |
|---|---|
| Authored gameplay | Eight buildings; at most sixteen anchors; three additional NPCs; no core-mission expansion |
| Persistent fracture | 64 panels, then at most eight support cells; at most four structure-state banks; exactly bounded HP arrays/masks |
| Physics | At most 128 additional live static colliders for the district; cell retirement never duplicates/retains stale colliders |
| Rendering | Environment adds at most 30 calls; whole frame including new NPCs adds at most 60 calls to the retained approximately 243-call baseline |
| Triangles | LOD/culling target at most 150,000 additional reported triangles, including shadow passes, against approximately 1.3 million; approximately 80,000 district camera-visible source triangles before extra passes |
| Transfer/textures | At most 6 MB new optimized district payload; each GLB remains below the existing 5 MB gate; at most 32 MB additional decoded texture allocation including mipmaps; shared maps, not per-building duplicates |
| Snapshots | Added persistent JSON at most 4 KB per full snapshot (about 80 KB/s at 20 Hz before transport overhead); measure full packet/output backlog rather than claiming this is total bandwidth |
| Runtime jobs | Retain terrain scheduler's one active/64 queued/96 completed data limits; do not introduce unbounded city mesh jobs or generate a whole district on one render frame |
| Debris | At most eight shards per break, 48 alive, three seconds; cosmetic and unnetworked |

These are proposed pass/fail budgets, not measured results. The current medium scene's roughly 57 FPS observation is a short GTX 1070 Ti profile, not evidence for high-density city performance or other hardware. Compare matched cold-load and settled moving runs; target no more than 5% settled FPS regression and no more than 2 ms p95 increase, with retained long-frame counts and failure routes. Material realism and density must improve in actual shoulder-camera captures without hiding solids or reducing contact quality.

## Staged implementation and qualification

1. **District and portable art:** validate all parcel/road footprints, original-source provenance, actual GLB maps/bounds/LODs and coherent street composition. Build the eight solid buildings and reachable surfaces first; ordinary-control walk, climb, mantle, roof travel and exit on all four chassis. Preserve current missions and existing service climbs. Stop if this stage exceeds the rendering/physics budgets.
2. **Directional panel bank:** introduce the shared cell state and exact render/authority/guest proxies on two buildings. Demonstrate opposite impact directions producing different openings, a breach wide/tall enough for quad/upright hulls, and an intact neighboring cell still blocking shots/movement. Keep existing cover behavior compatible.
3. **One structural dependency:** qualify the specified support loss/deck removal, supported falling actors, interrupted grip/mantle, truthful guardian safe-respawn behavior and re-planning. No uncontrolled whole-building collapse.
4. **Production multiplayer/cost gate:** run one ordinary-control authority, one actual rendered peer/dedicated guest and a late join through the same damaged route. Capture full masks/versions, matched visuals/collision, reload persistence, cleanup and profile evidence before critic approval/admission.

Mandatory regressions: (a) cell-winning projectile versus a nearer actor/immutable frame; (b) same rocket cannot damage a pilot protected by the intact wall it breaks; (c) cell retirement persists across eviction and late join without resurrecting colliders; (d) real four-chassis/Scout climb and safe occupied mantle on every new route; (e) support loss during walk/grip/mantle causes physical falling and bounded navigation recovery; (f) duplicate/delayed events and unknown/malformed state cannot rebuild or remove unrelated geometry; (g) eight-pilot checkpoint/spawn safety and all existing stance, jump, contact, lifecycle, supplies and mission suites remain passing; (h) cold import, moving seam recross and hangar teardown release leases/colliders/instance buffers, with truthful scene readiness and retained frame pacing. No current-release completion claim follows from this planning note.
