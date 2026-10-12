# First Rainline district: integration contract

Implementation is renderer-independent and uses existing CityDistrict/CityBlock/CityStructure/StructureState shapes. No simulation, network, product renderer or existing cityDistrict implementation is changed in this subtask.

## Authored extent and runtime inputs

`buildOverhaulDistrict(seed)` in `shared/overhaulDistrict.ts` returns the cached district for **7734 only**, and null for other theaters. Revision: `rainline-first-district-v1`. The district has 20 authored building parcels, one physical entry gantry and eight street utility cabinets: **934 meaningful interactable cells**, below the 1,200-part budget. Every source block is a member of one homogeneous material/HP bank with at most 32 cells; facade banks use the full uint32 mask, including cell31. IDs are stable authored strings, independent of array allocation and renderer instances.

Grading extent: X -72..72, Z -118..72, floor Y -.08 metres. Occupied parcels span roughly X -65..60, Z -96..60, with near buildings beside spawn(-8,22), the central approach and both relay routes. Streets preserve the main north/south mission spine, west relay return and east relay connection, with rear/core cross streets and side service streets. Mission objective points (-12,-35), (34,-30), (0,-76), extraction(-8,12) and spawn retain at least4.5m radial clearance from low structural solids. Street centerlines retain a2.05m capsule path. Street utility boxes are real exact solids near lane edges. The bridge is overhead at floor+9m, with real end pylons beside the approach; its underside clears the upright capsule.

The integration replaces Rainline's first district return value with this compiled district and removes old procedural props whose gameplay footprints intersect authored lots, streets or reserved entry corridors. Do not overlay the old first city, workshops, proxy hulls or decorative collisions on these parcels. Existing service-workshop destinations need remapping to authored building entry/roof metadata rather than leaving an old hidden workshop proxy beneath the new scene. Retain the other theater definitions and current networking.

The district includes actual foundation, frame-column, quarter-roof, facade, bridge-beam, bridge-deck, rail and fixture cells. Roofs are flat clean supported traversal surfaces. There are no full-building collision hulls. All pieces are authored axis aligned (`yaw=0`) in world metres, centered at `position`, with **half** sizes in `halfExtents`. Source block identity is the visual/collider/climb/damage/wear identity. Material and HP derive from its bank. Buildings use existing style categories works, utility, residential, transit and civic.

`getOverhaulComponent(blockOrId)` returns:

```ts
{
  kind: 'foundation' | 'column' | 'slab' | 'facade' | 'beam'
      | 'bridge-deck' | 'rail' | 'fixture';
  side?: 'west' | 'east' | 'north' | 'south';
  usage: CityBuilding['style'];
  maxHp: number;
  loadBearing: boolean;
}
```

Sides are west=-X, east=+X, north=-Z, south=+Z. Art transforms retain source centers and2*halfExtents. Module/details/wear disappear with their owning cell; art may not add collision, grip support or occlusion outside the accepted common solid. Directional facade contacts refer only to their actual face anchor. Quarter-roof cells advertise only the two adjoining face anchors, not every facade in the building.

## Support closure API

`compileOverhaulSupport(district)` builds a support graph once. It validates unique stable bank/cell identities,32-bit capacity, valid dependency refs, count thresholds and grounded ancestry. Self-supporting floating cycles are rejected. Graph nodes retain their exact CityBlock and homogeneous maxHp; support conditions reuse `CityBlock.support` and `.also`. Conditions are ANDed; each listed set admits its configured minimum surviving members.

Buildings use grounded foundation→redundant local steel columns→quarter roof slab→attached local facade panels. One of two columns can still carry its quarter. Removing both drops that slab and its attached eight facade cells, while other quarters remain supported. Destroying a quarter slab directly also detaches only its attached panels. A foundation loss propagates to its building frame, roof and facade. The gantry has a foundation and redundant pylons at **each** end. Both end conditions must hold for a longitudinal beam; one surviving beam can carry decks. Deck loss retires only its attached rail sections. This is conservative discrete survival, not a continuum stress solver or a claim of real-world structural engineering accuracy.

Use at the fixed authority transaction boundary:

```ts
const graph = compileOverhaulSupport(district); // once per authored revision
const retiredSourceIds = new Set<string>();     // persistent per match generation

// After direct damage has changed the existing StructureState hp/mask:
const closure = resolveOverhaulSupport(graph, structures, retiredSourceIds);
const changedBankIds = commitOverhaulSupport(closure, structures);
// Retire every newlyDetachedBlockId's old static collider / grip / roof handle.
// Invalidate accepted contact receipts before publishing this tick.
// Spawn authoritative persistent chunks from closure.detachedClusters.
closure.newlyDetachedBlockIds.forEach(id => retiredSourceIds.add(id));
// Publish updated StructureState through existing bank revision/mask payload.
```

`resolveOverhaulSupport` is pure: it does not mutate hp, masks or physics. It computes a deterministic fixed-point closure independent of wire state array order. Broken-mask OR hp<=0 count as gone. Missing streamed state is initially intact, matching existing `cityBlockActive`; persistent retired source IDs still count as gone. The returned fields are `brokenBlockIds`, `unsupportedBlockIds`, `brokenByBank` (`structureId,cellIds,brokenMask`), `newlyDetachedBlockIds` and `detachedClusters`. Root integration should call closure once per damage transaction, not per renderer component or contact query.

`commitOverhaulSupport` zeros closure cells' hp, ORs unsigned brokenMask, and increments each newly affected bank revision once. Reapplying the same committed closure does not increment revisions. It returns changed bank IDs. Direct damage has already advanced its own bank revision; commit advances only banks where it discovers an uncommitted cell. Banks must exist in authoritative `structures` before admission; the missing-state convention supports reads and does not authorize omitting bank state from the authority. The existing `cityBlockActive(block,states)` then remains the common renderer/static-collider survivor filter. Do not leave collapsed cells alive merely because only their ancestor's hp changed.

## Persistent detached chunks and retirement

Each `detachedClusters` entry has a stable source-derived ID, buildingId, persistent=true, source block IDs/cell refs, source CityBlocks, a volume-weighted source-space center, and compound child descriptions (offset, halfExtents, yaw, material, maxHp). Dependency-connected or touching new pieces from the same building form one chunk. Directly broken columns also remain physical source pieces; they are not silently replaced by dust. Opposite surviving columns stay in their original static bank. A roof-quarter collapse therefore has an asymmetric source extent and can yield a directional falling/settled outcome under the root's authoritative physics.

Cluster identity is deterministic from its sorted source-member IDs. The persistent `retiredSourceIds` ledger prevents chunk respawn on repeated closure. Existing moving or settled chunks are independent authority objects and remain alive after their source static cells retire. A later support loss produces new clusters from **only new source pieces**; it does not delete, reassign or respawn a previous chunk. Parent integration owns chunk IDs/generation, spawn tick, physics body lifetime, mass/inertia policy, collision/query groups, motion/settled snapshots, chunk damage, and accepted-contact invalidation. Cached compound descriptions are not a dust/fade effect, and body pooling must not reclaim occupied settled chunks based solely on age. Bound active physics and publish a meaningful failure if admission is exhausted; never silently discard required fallen geometry.

Retirement must remove all old source handles from the streamed chunk body's list and indexes: collider→cell, damage bodies, district/building colliders, wall-anchor supports, roof supports and navigation surfaces. Destroyed source colliders cannot stay pickable/climbable behind a hidden render cell. Invalidate current actor paw/grab/mantle handles in the same accepted-break transaction before the snapshot exposes the break. Navigation repaths against the updated survivor filter. Persistent chunk contacts use their own authority body/generation and accepted surface recipes; they do not reuse stale source block support receipts.

`overhaulContactOwnership(block)` returns separate wallAnchorIds and roofAnchorIds. `overhaulContactLive(receipt,graph,states,generation,closure?)` validates exact block/bank/cell ownership, session generation, nonfuture bank revision, survival including recursive closure, and requested wall/roof face. Supply the current closure rather than recomputing it per query. Damage to an unrelated cell in the same bank does not automatically invalidate a surviving cell: exact cell survival and surface ownership matter. A destroyed roof invalidates its roof receipt and attached wall receipts immediately; the surviving opposite facade remains a valid contact. Production physics-handle/geometry checks remain required on top of this pure source-state predicate.

## Validation

`npx vitest run tests/overhaul-support.test.ts` covers bounded/common cells, spawn/objective/street capsule clearance, redundant-column survival, asymmetric slab/facade collapse, foundation propagation and uint32 bit31, gantry end support, deterministic persistent chunks/no respawn, directional wall/roof ownership, same-transaction damaged roof/climb invalidation and cycle rejection. Focused typechecking covers the new district and support modules. Browser/real-physics admission, falling/settled chunk ownership, existing transport and authored art are parent integration gates, not claims made by these pure-data tests.
