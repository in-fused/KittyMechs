# Rainline extraction039 original industrial art

This is an original procedural Blender kit for the three extraction039 native parcels. The source was prepared under the game-asset-production skill with the previously verified unavailable game-dev CLI and existing local Blender. No external library, hosted provider, image generator, texture, font, installation or licensing research is involved.

The editable author source is `assets/source/overhaul-extraction-art-039/author_extraction039.py`; the manifest is beside it. The root agent owns the single serial Blender invocation:

```powershell
& 'D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe' --background --python 'C:/Users/Taylor/Documents/GitHub/KittyMech-Web/assets/source/overhaul-extraction-art-039/author_extraction039.py'
```

The command writes only the new editable master `Rainline_Extraction039.blend`, new export receipt and `/assets/overhaul/extraction039/Rainline_Extraction039.glb`. Source/export assertions constrain authoring plus export to 120 seconds, 80 MB master, 10 MB GLB, 50,000 unique triangles and four materials. These constraints need actual root-side byte inspection after execution. There are no embedded/external textures, so the master is self contained without an image packing dependency.

The geometry contract is meters and normalized cuboids `[-1,1]` centered at the origin. Source front is engine +Z; Blender coordinates are `(x,-z,y)` so glTF Y-up yields engine `(x,y,z)`. Every primitive asserts its complete bounds before authoring. Each named module joins original editable parts into at most one mesh per shared material. The native component half extents scale the module once, with east/west facade width/depth swap and the existing side yaw. Columns, beams and foundation have no facade rotation. Runtime world positions and structural owner IDs come only from the compiled district.

Freight frontage has ochre solid wall panels, limestone slatted shutters, folded blue tracks, service windows and canopy folds. Utility frontage has blue steel service doors with graphite inset louvers, conduit and an ochre rail. Transit frontage has graphite glazing with limestone mullions, blue canopy folds and ochre wayfinding bands. All three use upper clerestory modules with multiple window subdivisions; this is an industrial facade kit rather than repeated apartment windows. One ground bay per face has the family's original geometric W/E/T glyph. The roof includes thin standing seams, grille and hatch within its native slab volume, keeping the native full roof walkable and avoiding added machines. Canopy and panel detail stays inside the existing facade thickness.

`src/game/world/rainlineExtractionArt.tsx` uses up to four BatchedMesh material groups per intact/ruin render pass. It generates no collider, body, grip or simulation object. Physical structures must be preloaded by the native district owner before this cosmetic GLB resolves. The main district and identity adapters must both exclude the extraction039 prefix to avoid duplicate skins.

The adapter follows the shared `CityPresentation` active mask and HP wear. A removed component vanishes with all its details. Persistent whole ruins use the native complete world rotation plus only the facade art side offset. Experimental facade fractures use the shared recipe and keys. The kit is scaled by `.5` into the clipper's canonical `[-.5,.5]` source domain; the clipper receives the unchanged canonical quarter offset and subtracts it; then the clipped geometry scales by `2` back to kit units. Each centered quarter uses the original component scale at the native fragment center. Roofs, beams, columns and foundation remain full native ruins. No visual-only collapse or decorative obstruction is introduced.

This author handoff makes no finished-art, runtime-import, gameplay, synchronization or frame-rate claim. Root output byte/geometry inspection, production integration and ordinary-camera extraction route/destruction evidence are still required, followed by the independent critic's review.
