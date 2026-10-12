# Rainline architectural identity candidate 002

Read-only reassessment, 2026-10-09. No implementation, Blender, browser or test jobs
started. Working inspection 002 denies finished presentation. Mission009's actual
failure view shows the issue clearly: the readable blue kiosk/shelter is small
against three nearly identical square buildings with the same tall-window grid.
Changing bay selection and adding 88 apparatus cells did not change that hierarchy.

## One candidate: tidal rail and pump quarter

Keep the current district, all 1,084 canonical source IDs/poses and the first
candidate's props. Rebuild four architectural families for six memorable parcels;
use new native roof constructions to change skyline and new cell-contained facade
modules to change material, opening scale and rhythm. No additional yard-prop pass.

| Family / precise parcels | Visible change at ordinary camera | Physical shape |
|---|---|---|
| Loading works: spawn-west; east-relay-yard | Warm brick plinth, pale corrugated upper panels, one broad closed loading shutter across adjacent independently owned bays; sparse horizontal clerestory slots rather than repeated full-height windows. One large loading label, weathered teal framing. | Spawn-west gains an asymmetric raised roof monitor: center (-30,23), footprint at most 6.4 × 1.8 m, top 2.4 m above its unchanged deck. Three stepped flat roof plates create a recognizable industrial silhouette. East-relay-yard retains its guarded roof and machinery geometry; its facade gets the loading profile only. |
| Transit: west-relay-yard | Long dark ticket glazing in a continuous blue/cream lintel band, broad opaque end piers and horizontal station lettering. Ground and upper rows have different rhythms. Existing shelter/kiosk become the station forecourt rather than furniture beside an office block. | A separate raised horizontal station lantern at (-30,-52.5), footprint at most 6.4 × 1.8 m, height 1.6 m. It sits toward the south roof interior, away from the existing Sky Uplink apparatus at (-33,-59). |
| Civic/control: spawn-east; core-west | Pale cast-concrete panels, wide opaque wall fields, grouped three-slot service glazing, a single vertical teal control strip and large pump-number panel. These are visibly heavier and less glazed than the station. | Core-west gains a compact stepped control crown centered (-23,-86), footprint at most 2.4 × 2.4 m, height 3 m, with a strong vertical marker. Spawn-east keeps its existing roof apparatus and receives the control facade profile only. |
| Residential: west-midrise | Warm plaster over a brick ground floor, short paired domestic windows and alternating solid panels; two shallow horizontal balcony/spandrel bands per upper source cell. One narrow shopfront below, no factory intake or civic tall-window grid. | A stepped residential roof crown centered (-57,-55), footprint at most 4 × 4 m, height 2.2 m, with two unequal flat tiers and short chimney clusters. No outward balconies beyond the source wall box. |

The normal west-relay view should read *station + apartment backdrop*, with the
east loading works as a different opponent-facing frontage. Spawn should read
*loading works + pump control*. The change is testable in the same ordinary camera
views, without hiding the perimeter in fog. Secondary existing buildings can use
the corresponding new family facade modules, but no extra roof construction or
map enlargement is included. Cosmetic distant skyline is deliberately outside
this candidate: fixing the visible playable architecture has priority.

## Source and ownership bounds

Proposed edit owners after the quiet grant:

- New `assets/source/overhaul-city-v3/` editable Blender master/author/GLB,
  optimized `public/assets/overhaul/city-v3/` and provenance/budget report. Retain
  city-v1/v2 and both dressing kits unchanged. At most eight new facade/roof
  module families, existing licensed textures and original local geometry/paint.
- `src/game/world/overhaulDistrictArt.tsx`: explicit parcel/family selection and
  instanced modules at existing source transforms; intact and ruins share selection.
- New `shared/overhaulArchitecture.ts`: four small roof assembly recipes, at most
  48 appended native cells, plus exact facade/roof surface descriptors. Root's
  compiler appends these once without replacing existing IDs or bank membership.
  Target stage <=1,132 cells; <=4 additional material batches, <=30k additional
  placed triangles and <=1 MiB new compressed GLB are ceilings, not approval.
- Narrow shared surface integration: admit new roof-assembly walls/decks from
  their actual source cells into universal native grip/corner/landing queries.
  Existing 21 building faces and anchors remain authoritative. No simulation,
  input, camera, NPC, mission logic or ground-pin/terrain ownership changes.

Roof monitors are assemblies of individually visible, axis-aligned wall panels,
piers and stepped deck plates. A slope/gable mesh over a filled cuboid proxy is
excluded. Empty interiors have no enclosing collider. Each roof-wall face derives
from its actual cell plane and mask; roof grip/landing requires the actual surviving
deck footprint. A narrow monitor plate cannot falsely admit the 4.1 m Anchor as a
landing. Every appended assembly pad depends on all adjoining original roof
quarters; its walls/decks depend on the real pad/piers, and details disappear or
fall with their own authoritative component. New art stays within its exact cell
box, including in persistent ruins.

The facades retain the existing continuous outer source planes: shutter, glazing,
spandrels and frames are visual depth inside the owned 0.4 m wall thickness, not
new overhangs or claimed walk-through doors. This retains real five-point claw
support and continuous native corner geometry while changing large-scale rhythm.

## Clearance and admission

The four proposed roof interiors are unguarded and avoid the first candidate's
apparatus footprints. Keep at least the complete 4.2 m perimeter mantle band,
existing approach tangents, the gantry portal, roads, ground objective/revive holds
and actual NPC patrol hulls clear. The station roof monitor must also keep the
Sky Uplink approach/interaction hull clear; validate this before admission rather
than infer it from its nominal position. No new roof construction on guarded
relay-west-entry or east-relay-yard. The inherited Anchor gantry deck/landing
defect remains explicitly separate, with no waiver or all-21 Anchor pass claim.

One implementation and one meaningful bounded repair only after quiet grant.
Validate exact source/GLB bounds and production support/ruin closure; rerun ordinary
Pounce 21-building climbs, unchanged full-hull wall/corner/mantle differential
clearance and objective/NPC holds. Inspect two final perspectives tied to
mission009 and corner003. Root then captures ordinary use of the station shelter
or loading cover in a real fight/route and submits the actual playable scene to
the independent critic. Cell counts, local renders and green tests do not override
that critic or establish performance/finished-presentation acceptance.
