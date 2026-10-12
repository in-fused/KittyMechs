# Rainline extraction039 structural handoff

Source candidate, 2026-10-10. Root owns tests, production build, ordinary play,
two-client captures and acceptance. No specialist heavy jobs ran. The full
overhaul remains incomplete; structural assertions do not establish art,
traversal, destruction, networking or performance acceptance.

## Compiled pocket

Three low industrial buildings face the already graded extraction road end:

| Parcel | Center x,z | Size x,z,y | Style / facade | Road front |
|---|---|---|---|---|
| freight-hall | -28,-112 | 20,10,6 | works / brick | east |
| switching-house | 28,-112 | 20,10,4.8 | utility / steel | west |
| pump-house | -50,-112 | 12,10,5.4 | transit / steel | east |

All identities start `7734:overhaul:extraction039:`. Each parcel has 45 cells in
five banks: two concrete foundations (main footprint and flush six-metre
forecourt), 16 steel posts, eight steel bearing beams, four steel roof plates,
and 15 facade panels. Foundation/frame/beam/roof/facade bank HP is
320/150/160/170/85. Bank cell counts are 2/16/8/4/15; all stay below 32.

Each roof quarter has two bearing lines. Each line's beam depends on either of
its two actual separated posts. Its slab requires both beams. Facade panels
depend on the matching slab. All posts and forecourt depend on the main
foundation. One lost post leaves its local beam; both lost posts release that
beam, roof quarter and attached facade. Main foundation loss retires all 45
source cells. Adjacent sectors and neighboring buildings retain independent
supports. Roof material and geometry remain real native solids, not shell
proxies or decorative carriers.

Road-facing negative-z bays provide actual five-metre-wide, four-metre-high
loading openings. The positive-z bay remains a supported facade; the primary
navigation anchor sits at z+2.5 on that real wall. Interiors near the opening,
six-metre flush forecourts and full roof footprints remain usable. Roof slabs
are .4m thick; posts .6m square; beams .3m high and .6m deep. Facades are .4m
thick in two vertical rows and two horizontal bays, with one front lower panel
omitted and its upper panel raised to form the lintel. Artist meshes use
normalized [-1,1] solids transformed once by the exact compiled cell center,
half extents and yaw. Standard component kind/side/style metadata is retained.

Existing `buildingFaces` derives four exterior faces per new building from
actual coplanar cell surfaces, and roof ownership from the four deck cells.
Native contact queries still prove claws and complete landing footprints;
descriptor rectangles do not certify empty loading openings or damaged cells.
No new grip spots, collider waivers, hidden carriers or per-building movement
rules were added. Original lots, actor spawns, NPC routes, mission objectives,
streets and grading are unchanged. Above-ground walls start at |x|>=18, beyond
the 12m road plus two-metre shoulder. Ground aprons are flush at y=-.08. All
new source bounds fit x[-72,72], z[-118,72].

## Preservation and evidence

The compiler appends after ALL legacy parcel, dressing, architecture and street
admission. Immutable root baseline `tools/overhaul-extraction-039/legacy031-district.json`
is exact JSON.stringify(full031district), SHA256
`7d38f7477823e8f758967efe67e606fb5293f8bceab5d7655ad3cce391712d2c`:
1193 blocks, 197 structures, 21 buildings. Extraction appends block indices
1193..1327, structure indices197..211, and building indices21..23. Existing
wire ruin indices and all legacy poses/support clauses remain unchanged.

Focused test `tests/rainline-extraction-039.test.ts` protects the full legacy
prefix verbatim, including old approaches, and unchanged streets/grading/NPCs.
It checks <=150 appended cells separately from the original <=1200 budget;
graded bounds and original road centerline clearance with 2.2m full-hull radius;
extraction endpoint (0,-108), core and return objective clearance; meaningful
post/foundation loss and contact retirement; actual Rapier exterior wall and
roof ray ownership; clear full tall Pounce-sized apron/open interior hulls;
absent roof hit after its support closure retires the source slab; and full
native Pounce/Bastion wall, corner and roof hull paths against ALL old and new
physical solids, including original street convex hulls. Positive-volume
legacy/new AABB intersections are also rejected.
Root must execute these tests and inspect public ordinary play. Historical
architecture/density tests with old whole-district count assumptions need
root-owned baseline-aware assertions, not arbitrary new global ceilings.

Owned paths and source hashes are recorded in
`tools/overhaul-extraction-039/structure-handoff.json`. Art source/renderer and
world layout revision belong to the art specialist/root respectively.

The initial candidate dimensions were superseded before root validation:
legacy core props at x=-13/+11 and the hydraulic manifold at x=-61.6 would
obstruct the initial fronts/pump wall. The final halls moved to x=+/-28,
z=-112, depth10, and the pump narrowed to12m at x=-50. Final road fronts at
x=+/-18 clear those props, z=-107 north edges clear service-road endpoints by
5m, and the pump/freight walls retain a six-metre passage. Cell counts and all
original IDs/indices remain unchanged. Root executes actual native checks.
