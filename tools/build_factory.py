"""Build a selected-module CC0 workshop; no source/legacy or public files overwritten.

System Python: python tools/build_factory.py --mode download
Blender CPU: blender --background --python tools/build_factory.py -- --mode inspect
Blender CPU: blender --background --python tools/build_factory.py -- --mode build
This manual package receipt is not a game-dev CLI vendoring gate.
"""
import argparse
import concurrent.futures
import hashlib
import json
import struct
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'assets/source/environment-factory'
RAW = STAGE / 'package'
REFERENCE = ROOT / 'assets/reference'
ASSET = 'modular_factory_facade'
API = 'https://api.polyhaven.com'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf8')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'KittyMech-Web asset research (bounded official download)'})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def download():
    STAGE.mkdir(parents=True, exist_ok=True)
    for name in ('info', 'files'):
        destination = STAGE / (name + '.json')
        if not destination.exists():
            destination.write_bytes(fetch(f'{API}/{name}/{ASSET}'))
    info = json.loads((STAGE / 'info.json').read_text())
    files = json.loads((STAGE / 'files.json').read_text())
    assert info['authors'] == {'James Ray Cock': 'All'}, 'Unexpected source author'
    model = files['gltf']['1k']['gltf']
    roster = {f'{ASSET}_1k.gltf': model, **model['include']}

    def obtain(item):
        relative, entry = item
        target = RAW / relative
        assert target.resolve().is_relative_to(RAW.resolve()), 'Escaping provider path'
        assert entry['url'].startswith('https://dl.polyhaven.org/file/ph-assets/Models/'), 'Unexpected provider origin'
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            for attempt in range(3):
                try:
                    payload = fetch(entry['url'])
                    assert len(payload) == entry['size'], f'Provider byte count mismatch: {relative}'
                    assert hashlib.md5(payload).hexdigest() == entry['md5'], f'Provider MD5 mismatch: {relative}'
                    temporary = target.with_suffix(target.suffix + '.partial')
                    temporary.write_bytes(payload)
                    temporary.replace(target)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(1 + attempt)
        payload = target.read_bytes()
        assert len(payload) == entry['size'] and hashlib.md5(payload).hexdigest() == entry['md5']
        return {'path': relative, 'url': entry['url'], 'bytes': len(payload), 'providerMd5': entry['md5'], 'sha256': sha256(target)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        hashes = list(pool.map(obtain, roster.items()))
    for name, url in [('polyhaven-license.html', 'https://polyhaven.com/license'), ('cc0-legalcode.html', 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en')]:
        path = STAGE / name
        if not path.exists():
            path.write_bytes(fetch(url))
    actual = sorted(p.relative_to(RAW).as_posix() for p in RAW.rglob('*') if p.is_file())
    assert actual == sorted(roster), 'Source package must have a closed declared dependency roster'
    receipt = {'asset': ASSET, 'sourcePage': f'https://polyhaven.com/a/{ASSET}', 'author': 'James Ray Cock', 'license': 'CC0-1.0',
               'licenseUrls': ['https://polyhaven.com/license', 'https://creativecommons.org/publicdomain/zero/1.0/'],
               'retrievedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'officialInfo': info, 'packageFormat': 'Complete official 1k glTF with every declared dependency',
               'files': sorted(hashes, key=lambda x: x['path']), 'metadata': [{'path': p.name, 'sha256': sha256(p)} for p in [STAGE / 'info.json', STAGE / 'files.json', STAGE / 'polyhaven-license.html', STAGE / 'cc0-legalcode.html']],
               'closedRosterVerified': True, 'declaredDependenciesVerified': True, 'gameDevCliGateRan': False}
    save_json(STAGE / 'source-package-receipt.json', receipt)
    print(json.dumps({'files': len(hashes), 'bytes': sum(p['bytes'] for p in hashes), 'closedRosterVerified': True}), flush=True)


def source_scene():
    import bpy
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(RAW / f'{ASSET}_1k.gltf'))
    return bpy


def inspect():
    from mathutils import Vector
    bpy = source_scene()
    objects = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        objects.append({'name': obj.name, 'mesh': obj.data.name, 'min': [min(p[i] for p in points) for i in range(3)], 'max': [max(p[i] for p in points) for i in range(3)],
                        'vertices': len(obj.data.vertices), 'triangles': sum(len(p.vertices) - 2 for p in obj.data.polygons),
                        'materials': [s.material.name if s.material else None for s in obj.material_slots], 'matrixWorld': [list(row) for row in obj.matrix_world]})
    textures = [{'name': image.name, 'size': list(image.size), 'path': image.filepath, 'colorspace': image.colorspace_settings.name} for image in bpy.data.images if image.type == 'IMAGE']
    save_json(STAGE / 'source-inventory.json', {'blender': bpy.app.version_string, 'coordinates': 'Blender Z-up meters, imported from official Y-up glTF', 'objects': objects, 'textures': textures})
    print(json.dumps({'objects': len(objects), 'triangles': sum(o['triangles'] for o in objects), 'textures': len(textures)}), flush=True)


def textures(sign_texture=None):
    from PIL import Image
    destination = STAGE / 'shipping-textures'
    destination.mkdir(exist_ok=True)
    roster = []
    for source in sorted((RAW / 'textures').glob('*.jpg')):
        kind = 'baseColor' if '_diff_' in source.name else 'normalGL' if '_nor_gl_' in source.name else 'ARM'
        target = destination / source.name
        image = Image.open(source).convert('RGB')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        quality = 85 if kind == 'baseColor' else 85 if kind == 'normalGL' else 82
        image.save(target, quality=quality, subsampling=2 if kind == 'baseColor' else 0, optimize=True)
        roster.append({'source': str(source.relative_to(STAGE)), 'sourceSha256': sha256(source), 'path': str(target.relative_to(STAGE)),
                       'sha256': sha256(target), 'size': list(image.size), 'bytes': target.stat().st_size, 'role': kind,
                       'colorSpace': 'sRGB' if kind == 'baseColor' else 'linear', 'jpegQuality': quality, 'subsampling': 2 if kind == 'baseColor' else 0,
                       'transform': 'No crop/channel remap; bounded JPEG recompression of matched official map; ARM remains R=AO G=roughness B=metallic'})
    if sign_texture:
        source = Path(sign_texture).resolve()
        image = Image.open(source).convert('RGB')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        target = destination / 'rainline-works-sign.jpg'
        image.save(target, quality=92, optimize=True)
        roster.append({'source': str(source), 'sourceSha256': sha256(source), 'path': str(target.relative_to(STAGE)), 'sha256': sha256(target),
                       'size': list(image.size), 'bytes': target.stat().st_size, 'role': 'originalSignBaseColor', 'colorSpace': 'sRGB', 'jpegQuality': 92,
                       'transform': 'Aspect preserved; max1024; original retained; source/provenance owned by parent integration'})
    save_json(STAGE / 'texture-derivatives.json', roster)
    print(json.dumps({'shippingTextures': len(roster), 'bytes': sum(p['bytes'] for p in roster), 'maxDimension': max(max(p['size']) for p in roster)}), flush=True)


def build(sign_texture=None, export=True):
    import math
    from mathutils import Matrix, Vector
    bpy = source_scene()
    source_objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
    all_source = list(bpy.context.scene.objects)
    shipping = STAGE / 'shipping-textures'
    assert (STAGE / 'texture-derivatives.json').exists(), 'Run --mode textures first'
    replacements = {}
    for image in list(bpy.data.images):
        if image.type == 'IMAGE':
            target = shipping / Path(image.filepath).name
            assert target.exists(), f'Missing matched shipping map {target}'
            color_space = image.colorspace_settings.name
            # Imported images retain original packed bytes even after reload.
            # Load a new datablock so the exporter embeds the audited derivative.
            replacement = bpy.data.images.load(str(target), check_existing=True)
            replacement.colorspace_settings.name = color_space
            replacements[image] = replacement
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image in replacements:
                node.image = replacements[node.image]
        # The provider glTF's BLEND glass refers to an RGB JPEG: its actual
        # alpha is constant1, not an alpha atlas. Preserve that exact semantic
        # without needlessly baking an opaque fourth channel into a large PNG.
        if material.name == 'modular_factory_facade_windows_glass':
            shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            for link in list(shader.inputs['Alpha'].links):
                material.node_tree.links.remove(link)
            shader.inputs['Alpha'].default_value = 1
        arm = next((n for n in material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and '_arm_' in n.image.filepath), None)
        if arm:
            # Official ARM includes AO in red although the source glTF omits
            # occlusionTexture. Explicitly expose that retained channel to glTF.
            group = bpy.data.node_groups.get('glTF Material Output')
            if not group:
                group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
                group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
            settings = material.node_tree.nodes.new('ShaderNodeGroup')
            settings.node_tree = group
            separate = material.node_tree.nodes.new('ShaderNodeSeparateColor')
            separate.mode = 'RGB'
            material.node_tree.links.new(arm.outputs['Color'], separate.inputs['Color'])
            material.node_tree.links.new(separate.outputs['Red'], settings.inputs['Occlusion'])
    materials = {m.name: m for m in bpy.data.materials}
    brick = materials['modular_factory_facade_brick']
    metal = materials['modular_factory_facade_garage']
    trim = materials['modular_factory_facade_trim_01']
    parts = []
    instances = []
    face_basis = {
        'front': (Vector((0, -8.15, 0)), Vector((1, 0, 0)), Vector((0, 1, 0))),
        'back': (Vector((0, 8.15, 0)), Vector((-1, 0, 0)), Vector((0, -1, 0))),
        'east': (Vector((10.05, 0, 0)), Vector((0, 1, 0)), Vector((-1, 0, 0))),
        'west': (Vector((-10.05, 0, 0)), Vector((0, -1, 0)), Vector((1, 0, 0))),
    }

    def bounds(obj):
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        # glTF export coordinate conversion: Blender(X,Y,Z) -> glTF(X,Z,-Y).
        points = [Vector((v.x, v.z, -v.y)) for v in points]
        return {'min': [min(v[i] for v in points) for i in range(3)], 'max': [max(v[i] for v in points) for i in range(3)]}

    def module(primary, names, face, center, bottom, width, height, label, repeat_brick=False):
        master = source_objects[primary]
        source_points = [master.matrix_world @ Vector(p) for p in master.bound_box]
        low = Vector(tuple(min(p[i] for p in source_points) for i in range(3)))
        high = Vector(tuple(max(p[i] for p in source_points) for i in range(3)))
        sx, sz = width / (high.x - low.x), height / (high.z - low.z)
        plane, u, inward = face_basis[face]
        origin_y = round(low.y)
        transform = Matrix.Identity(4)
        for row in range(3):
            transform[row][0], transform[row][1], transform[row][2] = u[row] * sx, inward[row], float(row == 2) * sz
        transform.translation = plane + u * (center - (low.x + (high.x - low.x) / 2) * sx) - inward * origin_y + Vector((0, 0, bottom - low.z * sz))
        assert transform.to_3x3().determinant() > 0, 'Reflected facade would invert winding'
        for name in names:
            source = source_objects[name]
            obj = bpy.data.objects.new(label + '_' + name, source.data.copy())
            bpy.context.collection.objects.link(obj)
            matrix = transform @ source.matrix_world
            normal_matrix = matrix.to_3x3().inverted().transposed()
            normals = [(normal_matrix @ Vector(n.vector)).normalized() for n in source.data.corner_normals]
            for vertex in obj.data.vertices:
                vertex.co = matrix @ vertex.co
            if repeat_brick:
                for layer in obj.data.uv_layers:
                    for loop in layer.data:
                        loop.uv.x *= sx
                        loop.uv.y *= sz
            obj.data.update()
            if normals:
                obj.data.normals_split_custom_set(normals)
            obj['assembly_part'] = 'body'
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            before = sum(len(p.vertices) - 2 for p in obj.data.polygons)
            modifier = obj.modifiers.new('Only redundant coplanar source topology', 'DECIMATE')
            modifier.decimate_type = 'DISSOLVE'
            modifier.angle_limit = math.radians(.1)
            modifier.delimit = {'UV', 'NORMAL', 'MATERIAL'}
            modifier.use_dissolve_boundaries = False
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(False)
            after = sum(len(p.vertices) - 2 for p in obj.data.polygons)
            parts.append(obj)
            instances.append({'name': obj.name, 'part': 'body', 'sourceObject': name, 'sourceMesh': source.data.name, 'primaryModule': primary,
                              'face': face, 'sourceWorldToAssemblyBlender': [list(row) for row in transform], 'sourceLocalToAssemblyBlender': [list(row) for row in matrix],
                              'scaleWidthHeight': [sx, sz], 'sourceTriangles': before, 'triangles': after, 'boundsYUp': bounds(obj),
                              'uvChange': 'Brick repeat scaled to maintain original physical texel/brick size' if repeat_brick else 'Retained matched source UVs',
                              'simplification': 'Planar dissolve .1deg; UV, custom-normal and material boundaries retained; no arbitrary collapse'})

    def plain(face, center, bottom, width, height, label):
        module('wall_standard_standard_01', ['wall_standard_standard_01'], face, center, bottom, width, height, label, True)

    def cube(name, center_game, size_game, material, part='body'):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(center_game[0], -center_game[2], center_game[1]))
        obj = bpy.context.object
        obj.name = name
        obj.scale = (size_game[0], size_game[2], size_game[1])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(material)
        # Reuse the matched source atlas on structural steel; independent from
        # window/brick UVs. A bounded tiling cadence suggests sheet-metal seams.
        for layer in obj.data.uv_layers:
            for loop in layer.data:
                loop.uv.x *= 3
                loop.uv.y *= 3
        obj['assembly_part'] = part
        parts.append(obj)
        instances.append({'name': name, 'part': part, 'sourceObject': None, 'construction': 'Original closed cuboid, source-matched PBR material', 'material': material.name,
                          'centerYUp': list(center_game), 'sizeYUp': list(size_game), 'triangles': 12, 'boundsYUp': bounds(obj)})
        return obj

    cube('Factory_Foundation', (0, .275, 0), (20.3, .55, 16.5), metal)
    for face in face_basis:
        span = 20.3 if face in ('front', 'back') else 16.5
        if face == 'front':
            module('wall_door_garage_double_01', ['wall_door_garage_double_01', 'door_garage_double_01'], face, 0, .55, 9, 4.55, 'Front_Closed_LoadingBay')
            plain(face, -7.325, .55, 5.65, 4.55, 'Front_Left_Brick')
            module('wall_door_centered_large_01', ['wall_door_centered_large_01', 'door_centered_large_01'], face, 7.15, .55, 3, 3, 'Front_Closed_PersonnelDoor')
            plain(face, 7.15, 3.55, 3, 1.55, 'Front_Personnel_Header')
            plain(face, 5.15, .55, 1, 4.55, 'Front_Right_Infill_A')
            plain(face, 9.4, .55, 1.5, 4.55, 'Front_Right_Infill_B')
        else:
            plain(face, 0, .55, span, 4.55, face + '_Lower_Brick')
        centers = [-6.8, 0, 6.8] if face in ('front', 'back') else [-5.3, 0, 5.3]
        for row, bottom in enumerate([5.1, 8.45]):
            cursor = -span / 2
            for col, center in enumerate(centers):
                if center - 1.5 > cursor + .01:
                    plain(face, (cursor + center - 1.5) / 2, bottom, center - 1.5 - cursor, 3.35, f'{face}_Infill_{row}_{col}')
                if face == 'front' and row == 0 and col == 1:
                    plain(face, center, bottom, 3, 3.35, 'Front_Sign_Brick_Background')
                else:
                    module('wall_window_centered_medium_03', ['wall_window_centered_medium_03', 'window_centered_medium_03'], face, center, bottom, 3, 3.35, f'{face}_RecessedWindow_{row}_{col}')
                cursor = center + 1.5
            if cursor < span / 2 - .01:
                plain(face, (cursor + span / 2) / 2, bottom, span / 2 - cursor, 3.35, f'{face}_Infill_{row}_End')
        # Narrow source cornices form the horizontal belt and upper coping. No
        # decorative railing/chimney occupies the separately supported roof.
        for tier, bottom in enumerate([5.0, 8.35, 11.8]):
            module('cornice02_standard_standard_01', ['cornice02_standard_standard_01'], face, 0, bottom, span, .2, f'{face}_SourceCornice_{tier}')
        module('dado_standard_standard_01', ['dado_standard_standard_01'], face, 0, 0, span, .55, face + '_SourceDado')
    # Solid corner steel protects the brick joins; stays inside the existing
    # body proxy rather than adding non-colliding outward columns.
    for x in [-9.98, 9.98]:
        for z in [-8.08, 8.08]:
            cube(f'Factory_CornerTrim_{x}_{z}', (x, 6, z), (.3, 12, .3), trim)
    cube('Factory_Roof_Soffit', (0, 12.37, 0), (23, .74, 18), metal, 'roof')
    for x in range(-10, 11, 2):
        cube(f'Factory_Roof_Seam_{x}', (x, 12.77, 0), (.055, .06, 17.7), metal, 'roof')
    sign_source = Path(sign_texture).resolve() if sign_texture else None
    if sign_source:
        sign_path = shipping / 'rainline-works-sign.jpg'
        assert sign_path.exists(), 'Normalize the retained original sign with --mode textures --sign-texture first'
        image = bpy.data.images.load(str(sign_path))
        image.colorspace_settings.name = 'sRGB'
        width = 6.4
        height = min(2.2, width * image.size[1] / image.size[0])
        if height == 2.2:
            width = height * image.size[0] / image.size[1]
        # Centered on the intentionally blank brick band above the sealed bay.
        mesh = bpy.data.meshes.new('Original Rainline works facade sign')
        mesh.from_pydata([(-width / 2, -8.29, 6.77 - height / 2), (width / 2, -8.29, 6.77 - height / 2), (width / 2, -8.29, 6.77 + height / 2), (-width / 2, -8.29, 6.77 + height / 2)], [], [(0, 1, 2, 3)])
        uv = mesh.uv_layers.new(name='UVMap')
        for loop, coordinate in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
            loop.uv = coordinate
        obj = bpy.data.objects.new('Factory_Original_RainlineWorks_Sign', mesh)
        bpy.context.collection.objects.link(obj)
        material = bpy.data.materials.new('Factory_Original_RainlineWorks_Sign_Paint')
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Roughness'].default_value = .82
        shader.inputs['Metallic'].default_value = .12
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
        obj.data.materials.append(material)
        obj['assembly_part'] = 'sign'
        parts.append(obj)
        instances.append({'name': obj.name, 'part': 'sign', 'sourceObject': None, 'sourceTexture': str(sign_source), 'sourceSha256': sha256(sign_source), 'triangles': 2, 'boundsYUp': bounds(obj), 'construction': 'Original generated facade sign, preserved aspect; physically painted plane within core envelope'})
        for z in [6.77 - height / 2 - .045, 6.77 + height / 2 + .045]:
            cube('Factory_Sign_Frame_Horizontal', (0, z, 8.27), (width + .18, .09, .08), trim)
        for x in [-width / 2 - .045, width / 2 + .045]:
            cube('Factory_Sign_Frame_Vertical', (x, 6.77, 8.27), (.09, height, .08), trim)
    for source in all_source:
        bpy.data.objects.remove(source, do_unlink=True)
    bpy.context.view_layer.update()
    for obj in parts:
        b = bounds(obj)
        allowed = [(-11.5, 11.5), (0, 12.8), (-9, 9)] if obj['assembly_part'] == 'roof' else [(-10.3, 10.3), (0, 12.0001), (-8.4, 8.4)]
        assert all(b['min'][i] >= allowed[i][0] - .0002 and b['max'][i] <= allowed[i][1] + .0002 for i in range(3)), f'Out-of-envelope detail: {obj.name} {b}'
    triangles = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in parts)
    assert triangles <= 28000, f'Assembly triangle budget exceeded: {triangles}'
    for image in bpy.data.images:
        if image.type == 'IMAGE' and image.users:
            assert max(image.size) <= 1024
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(STAGE / 'Factory_Workshop.blend'))
    save_json(STAGE / 'assembly-receipt.json', {'blender': bpy.app.version_string, 'units': 'meters', 'shippingUp': 'Y', 'coreProxy': {'halfExtents': [10.3, 6, 8.4], 'center': [0, 6, 0]},
                                               'roofTop': 12.8, 'externalServiceDeckTop': 13.1, 'externalServiceFacadeX': 12, 'triangles': triangles, 'instances': instances,
                                               'sourcePackageReceiptSha256': sha256(STAGE / 'source-package-receipt.json'), 'generatorSha256': sha256(Path(__file__)),
                                               'genericMaterialRewrite': False, 'matchedPbrPreserved': True, 'materialChanges': ['Expose official ARM red channel as glTF occlusion; original source omits occlusionTexture', 'Preserve source RGB JPEG glass alpha constant1 and BLEND; avoid redundant opaque PNG'], 'sourceMaterials': sorted(m.name for m in set(slot.material for o in parts for slot in o.material_slots if slot.material)),
                                               'exported': export, 'gameDevCliGateRan': False, 'gpuRenderRan': False})
    if export:
        # Separate body/roof nodes retain independently inspectable collision vs
        # full visual bounds; this adds one roof primitive over a single mesh.
        joined = []
        groups = {part: [o for o in parts if o['assembly_part'] == part] for part in ['body', 'roof', 'sign']}
        for part, name in [('body', 'Factory_Workshop_Core'), ('roof', 'Factory_Workshop_Roof'), ('sign', 'Factory_Workshop_Sign')]:
            group = groups[part]
            if not group:
                continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in group:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = group[0]
            if len(group) > 1:
                bpy.ops.object.join()
            obj = bpy.context.object
            obj.name = name
            obj['assembly_part'] = part
            # Export-only triangulation allows matched normal maps to carry a
            # valid tangent basis; the editable source keeps its planar faces.
            triangulate = obj.modifiers.new('Export tangent-safe triangulation', 'TRIANGULATE')
            triangulate.keep_custom_normals = True
            bpy.ops.object.modifier_apply(modifier=triangulate.name)
            joined.append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in joined:
            obj.select_set(True)
        output = ROOT / 'assets/runtime/models/Factory_Workshop.glb'
        output.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_animations=False, export_yup=True,
                                  export_cameras=False, export_lights=False, export_extras=True, export_image_format='AUTO', export_tangents=True)
        # Blender infers OPAQUE after removal of the redundant constant-alpha
        # texture link. Retain the provider's declared BLEND render semantic.
        data = output.read_bytes()
        json_length = struct.unpack_from('<I', data, 12)[0]
        document = json.loads(data[20:20 + json_length])
        source_materials = {m['name']: m for m in json.loads((RAW / f'{ASSET}_1k.gltf').read_text())['materials']}
        for material in document['materials']:
            original = source_materials.get(material['name'], {})
            if 'alphaMode' in original:
                material['alphaMode'] = original['alphaMode']
        encoded = json.dumps(document, separators=(',', ':')).encode('utf8')
        encoded += b' ' * (-len(encoded) % 4)
        binary_chunk = data[20 + json_length:]
        output.write_bytes(struct.pack('<III', 0x46546C67, 2, 20 + len(encoded) + len(binary_chunk)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + binary_chunk)
        assert output.stat().st_size <= 5_000_000, f'Unoptimized GLB exceeds5MB: {output.stat().st_size}'
        print(json.dumps({'candidate': str(output.relative_to(ROOT)), 'bytes': output.stat().st_size, 'triangles': triangles, 'sha256': sha256(output)}), flush=True)
    else:
        print(json.dumps({'draftBlend': str((STAGE / 'Factory_Workshop.blend').relative_to(ROOT)), 'triangles': triangles}), flush=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['download', 'inspect', 'textures', 'assemble', 'build'], default='build')
    parser.add_argument('--sign-texture')
    options = parser.parse_args(args)
    if options.mode in ('build', 'assemble'):
        build(options.sign_texture, options.mode == 'build')
    elif options.mode == 'textures':
        textures(options.sign_texture)
    else:
        {'download': download, 'inspect': inspect}[options.mode]()
