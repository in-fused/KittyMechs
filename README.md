# KittyMech Web

A browser-native, playable KittyMech rebuild. Pilot an articulated feline mech, fight sentinels, restore the relays and extract with your squad. No Unreal installation, cooked package or runtime is required.

## Play

Public entry point: [KittyMech — Rainline Expeditions](https://kittymech-rainline-expeditions.sagegunnerpwns.chatgpt.site).

For tonight's server-hosted sessions, use [the online prototype](https://triangle-arctic-genome-encouraged.trycloudflare.com). **Host squad → Copy invite → friends join** uses secure WebSockets through the public tunnel, so friends do not need a direct WebRTC connection. This temporary link runs from this PC and needs it powered on. The permanent browser build above remains available for solo and browser-hosted invitations.

Run `Play-KittyMech-Web.cmd`, or run:

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173**. Choose Pounce, Bastion, Lynx or Caracal and a theater. **Deploy solo** starts the expedition immediately. **Host squad** creates an arena; use **Copy invite** to give friends its link. Friends choose a callsign and press **Join squad**. The host chooses the map and rules for everyone. Up to eight pilots can join.

Browser invites use WebRTC with PeerJS cloud signaling. Keep the host tab open and active. Closing it ends the arena. Some restrictive networks require a TURN relay, which this release does not configure. The two-browser connection and combat have been tested; cross-household NAT compatibility remains unverified. A public web build serves the same game and invite flow without installing software.

For an independent authority on a LAN, expand **Hosting options / LAN** and choose **Host on arena server**. Other players visit the host PC's LAN address on port 5173 and join its room link. For a production Node server, run `npm run build` then `npm start`; the default HTTP/WebSocket port is 8787. A separately hosted frontend can use `VITE_ARENA_URL=wss://your-arena-server/arena` at build time. When the Node server serves the frontend itself, **Host squad** automatically uses its same-origin arena. **Host browser invite** is an optional WebRTC route. See [architecture](docs/architecture.md).

To restart the temporary public service, run `pwsh -File Start-Online-Prototype.ps1`; it reuses an active tunnel or prints a new address. It serves a frozen reviewed release, so development builds cannot change an active friends session. After committing and building a newly approved release, run `pwsh -File tools/prepare-live-release.ps1` before restarting the arena service. The helper keeps the system awake while that tunnel is alive, without changing the permanent power plan. `pwsh -File Stop-Public-Link.ps1` stops the public tunnel and its sleep request; the local arena stays available. The Cloudflare binary is downloaded from its official release and checked against the published SHA-256. A durable cloud server and stable hostname remain the next networking milestone.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move relative to camera |
| Mouse | Aim; click battlefield to capture pointer |
| Left mouse | Pulse repeater |
| Q / right mouse | Micro missile; right mouse also narrows the view |
| Space | Jump |
| R / touch FORM | Transform between quadruped travel and hind-leg combat form; requires ground and overhead clearance |
| Hold C + W / S | Grip a marked service facade on four paws, ascend/descend; release C to drop |
| Shift | Current form's chassis ability |
| E / touch USE | Restore relays, collect core, extract, or claim a beneficial nearby cache; hold to capture a cleared rooftop uplink |
| Wheel | Camera distance |
| Tab | Squad roster and invite |
| M | Mission route map |
| Escape | Pause/menu; multiplayer arena stays live |

Portrait phone touch controls provide a movement stick, drag-to-aim and action buttons; wide landscape/tablet touch layouts still need work. Hold CLIMB and move the stick up/down at a marked service wall; release CLIMB to drop. Settings include four real graphics presets, volume, sensitivity, camera distance, inverted mouse Y and reduced flashes. Settings persist locally.

## Current slice

- Four newly authored quadruped chassis: Pounce (220 armor, leap), Bastion (340 armor, shockwave + three-second shield), Lynx (170 armor, fast recon dash), and Caracal (260 armor, repairs itself and nearby co-op squadmates). Chassis also differ in movement, fire cadence and damage. Rival modes allow self-repair only.
- Seven 25-bone rigs with distinct silhouettes and chassis-specific stride lengths, paw duty, body weight and ability poses. Each player has 32 clips for locomotion, angular turn steps, forms, traversal, recoil, missiles, abilities, hit reactions and collapse; Sentinels have 17. Four appended upright clips add longer walk/running strides, weight transfer and mirrored hind-foot turning steps, while retaining all 28 previous clips exactly. Accepted authority timestamps drive additive combat reactions with death/ability/weapon/hit priority. A 0.7-second transformation gates attacks/jumping and conservatively retains the taller hull while lowering. Actual-model portraits show each chassis in the hangar.
- Upright Pounce uses a forward crescent rake, Bastion a four-second squad shield dome, Lynx a stationary slowing/damaging ion snare, and Caracal a five-second sanctuary heal. Persistent fields are bounded, replicated and checked against cover; friendly shields/healing support allies in co-op and the owner in rival modes. All forms have distinct travel/fire tradeoffs. Area rims follow terrain or clip to actual roof/cargo support and show the real footprint.
- Each theater has two marked workshop service facades and fully supported roof decks. Four chassis have distinct grab/cling/climb/mantle clips, distance-driven strides and wall/roof paw correction. Authority checks reach, facing, energy, headroom and occupied landings, lifts the whole hull above the ledge before crossing, and releases on stale input/death/depletion. The 2.6 m player/3.2 m Sentinel climb hull stays conservative through a 0.3-second release fade. Green ladder symbols on the route map locate these authored routes.
- The forward roof has an optional SKY UPLINK, a rooftop Anchor guardian and a Scout that pursues through the actual service-wall climb. Clear the guardian and local roof enemies, then hold E for three seconds: an eight-second EMP suppresses visible enemy weapons within 60 m and awards 200 salvage. It does not gate the main expedition.
- One 180 HP retaining wall and two 100 HP roof cargo banks per theater have persistent damage. Pulse/missile hits damage it, and destruction removes its exact collision and visible model, persists through chunk reloads and late joins, and invalidates enemy paths. The destroying blast remains blocked by the intact wall; later attacks and movement pass through. Damage tint, sparks and bounded cosmetic rubble show the change. Fields clip to actual roof/cargo tops; debris lands on support or falls over the edge. Arbitrary building fracture remains future work.
- Co-op expeditions, first-to-ten PvP and contested PvPvE. Friendly fire is disabled in co-op. PvPvE shares relay unlocks while pilots compete to finish extraction.
- Three distinct authored layouts: Rainline dock avenues/cargo alleys, Ember's terraced quarry/haul loop, and Frostline's rising ridge/causeway branches. Each has its own terrain, objectives, spawn points, patrol routes and landmarks. They reuse the industrial kit and expedition rules.
- Scout, Mortar and Anchor enemies use sight, hearing, last-known positions, bounded cached pathfinding, patrols, flanks, retreat and objective guarding. Mortars visibly wind up before launching and cancel when sight is blocked. Pulse/missile projectiles, cover interception, splash damage, heat, health recovery, salvage and respawn remain authoritative.
- Restore two relays, secure the storm core, then return to extraction. In co-op, relay/core completion advances a shared checkpoint for safe squad respawns and late joins. Living pilots stay in place; optional uplinks do not overwrite the checkpoint. Clear nearby enemies before holding the interaction.
- Six room-randomized caches supply armor repair, energy and missile/heat recovery. Hold E within three meters to claim a beneficial item; full or obstructed pilots leave it available. Repair caches also restore visible nearby co-op teammates. Claims replicate once, and caches return at a new valid position after 55–75 seconds.
- Streamed 64-meter chunks with bounded forward preparation, worker-built terrain and a ground underlay until exact tiles are ready. Every solid tree stays visible at every preset. Fuller scanned firs use three instanced detail levels; two fern clumps use near/far variants with matched normal/roughness maps. Rainline workshops have detailed CC0 brick/window/loading-bay architecture fitted to the existing supported roof and service route. Ember and Frostline retain their own existing architecture.
- Body/camera share a coherent movement timeline: live 60 Hz authority sampling, a bounded guest jitter buffer and synchronized distance-driven gait/paw support reduce stepping and sliding. Disabled enemy corpses cannot block movement. Client prediction/server rewind remain future work.
- Grounded paws sample actual fixed collision over their whole footprint, hold bounded stance anchors and release before overstretching. Rigid joint correction, chassis-specific support/release profiles, smooth body settling on grades and raised-edge retraction improve contact. Original left/right turn clips reposition paws during grounded quadruped and upright turns, with distinct cadence, chest lead and tail counterbalance. Displayed travel drives upright gait weights and phase together, so a blocked hull fades to standing. Actual displayed angular travel drives turning; stopped snapshots hold its phase. Swing paws release their ground anchors before repositioning. Air, forms, traversal, death and respawn release ground anchors. Quadruped launches are 12.2/9.4/12.4/10.5 m/s by chassis; upright launches retain their prior values independently. Dynamic platforms and arbitrary uneven contacts still need qualification; [feline movement direction](docs/feline-motion-direction.md) records the remaining authored transitions.
- Shared room time drives gradual rain, ash and snow fronts, integrated wind drift, cloud coverage, fog and sunlight. Reduced flashes suppress rain lightning. Weather pauses with solo play and stays synchronized for squad pilots.
- Higgsfield-generated key art, six-second menu, armor albedo, three theater concept illustrations, two map-specific ground albedos, three pickup textures and original Rainline Works signage are integrated. Theater previews are clearly labeled concept art; the workshop sign is an actual embedded runtime texture.

This is a playable prototype, with production art and networking work still ahead. It has no account system, matchmaking, campaign saves or host migration; its current Internet server is a temporary PC-hosted service. [Asset gaps](docs/asset-gaps.md) and [roadmap](docs/roadmap.md) describe the remaining work accurately.

## Development and validation

```powershell
npm run typecheck
npm run lint
npm test
npm run assets:validate
npm run build
npm run test:browser
npm run release:check
```

Browser tests use installed Microsoft Edge (`msedge`). For release checks, build and start the production server with `npm start`, then set `GAME_URL` to that server's address before running them. They exercise UI input, all four chassis in three maps, real two-context WebRTC PvP, WebSocket co-op, touch actions and scene transitions. Screenshots go to `test-results/`. Add `?debug=1` for FPS, draw calls, triangles, resource counts and read-only diagnostics; normal production play hides the debug overlay.

The independent critic must approve mechs, maps, enemy tactics and integration separately. `release:check` verifies the critic's receipt against the current source/assets fingerprint and blocks when an area is denied or reviewed files change. Browser tests must also pass against the compiled build. Review evidence and known production gaps are recorded in `docs/critical-review.md`; passing the gate is approval of this prototype iteration.

The game lives entirely in this repository. Legacy source is retained in `assets/reference`, selected editable art in `assets/source/legacy`, and new mech sources in `assets/source/feline-web`. Normal installation, builds and play never read the old Unreal directory. The original `../KittyMech` remains untouched; the deletion condition has not been met. See the [migration audit](docs/legacy-migration.md), [asset pipeline](docs/asset-pipeline.md), [art direction](docs/art-direction.md), [performance budget](docs/performance-budget.md), [validation report](docs/validation.md) and [independent critical review](docs/critical-review.md).

Durable hosting is deferred. The active [evolution goal](docs/evolution-goal.md) guides reviewed playable iterations. Next implementation plans cover [playable armor and dedicated mech materials](docs/mech-art-next.md), followed by [a dense city district and directional structural damage](docs/city-destruction-next.md). Authored service-wall climbing and breakable cover establish the first traversal/destruction slice; broader building access and structural destruction remain ahead. A commercial AAA release still requires substantial production art, encounter content, long-session hardware qualification and networking work.
