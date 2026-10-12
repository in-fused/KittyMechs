"""ONE read-only-in-memory extraction. No master save, authoring, bake or export."""
import bpy
import hashlib
import json
import math
import sys
import time
import traceback
from pathlib import Path
from datetime import datetime, timezone
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / 'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.blend'
OUTPUT = ROOT / 'assets/source/overhaul-pounce-bind-extractor-001/extraction'
EXPECTED_MASTER = '63fdc9b9ea96459d8943ab519ca6e7cc3f2d39dcb21f0b74915359e8109bd400'
EXPECTED_LEGACY = '302781eb955fbb21614f637bf510e4242c55672bb08cde5e903f927d47f94220'
# Authored units/Z-up -> canonical native-model metres/Y-up. Mount pi NOT included.
A = Matrix(((.8, 0, 0, 0), (0, 0, .8, 0), (0, -.8, 0, 0), (0, 0, 0, 1)))
AINV = A.inverted()
START = time.monotonic()
CREATED_OUTPUT = False
REPORT = {'schema': 'pounce-measured-bind/1', 'candidate': 'pounce-bind-extractor-001',
          'admitted': False, 'status': 'STARTED', 'startedUTC': datetime.now(timezone.utc).isoformat(),
          'master': str(MASTER), 'expectedMasterSHA256': EXPECTED_MASTER,
          'sourceQualification': 'NONE; rest extraction only', 'nativePhysics': 'NOT_RUN'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rows(matrix):
    return [list(row) for row in matrix]

def vector(v):
    return list(v)

def write(name, payload):
    path = OUTPUT / name
    path.write_text(json.dumps(payload, sort_keys=True, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    return {'file': name, 'bytes': path.stat().st_size, 'sha256': digest(path)}

def bounds(points):
    if not points:
        return None
    return {'min': [min(p[i] for p in points) for i in range(3)],
            'max': [max(p[i] for p in points) for i in range(3)]}

def legacy_fingerprint(rig, meshes):
    # EXACT old pose-owner001 algorithm, including default JSON whitespace.
    packet = {'bones': {n: {'head': tuple(b.head_local), 'tail': tuple(b.tail_local),
                           'parent': b.parent.name if b.parent else None,
                           'matrix': [list(row) for row in b.matrix_local]}
                         for n, b in rig.data.bones.items()}, 'meshes': {}}
    for obj in meshes:
        packet['meshes'][obj.name] = {
            'vertices': [tuple(v.co) for v in obj.data.vertices],
            'faces': [tuple(p.vertices) for p in obj.data.polygons],
            'materials': [m.name for m in obj.data.materials],
            'assignments': [p.material_index for p in obj.data.polygons],
            'weights': [[[obj.vertex_groups[g.group].name, g.weight] for g in v.groups]
                        for v in obj.data.vertices]}
    return hashlib.sha256(json.dumps(packet, sort_keys=True).encode()).hexdigest()

def animation_record(obj):
    ad = obj.animation_data
    action = ad.action if ad else None
    return {'activeAction': action.name if action else None,
            'activeActionFrameRange': list(action.frame_range) if action else None,
            'nlaTracks': [{'name': t.name, 'mute': t.mute,
                           'strips': [{'name': s.name, 'action': s.action.name if s.action else None,
                                       'frameStart': s.frame_start, 'frameEnd': s.frame_end} for s in t.strips]}
                          for t in ad.nla_tracks] if ad else [],
            'drivers': [{'dataPath': d.data_path, 'arrayIndex': d.array_index} for d in ad.drivers] if ad else []}

def object_record(obj, rig):
    return {'name': obj.name, 'type': obj.type, 'data': obj.data.name if obj.data else None,
            'parent': obj.parent.name if obj.parent else None, 'parentType': obj.parent_type,
            'parentBone': obj.parent_bone, 'matrixBasis': rows(obj.matrix_basis),
            'matrixLocal': rows(obj.matrix_local), 'matrixParentInverse': rows(obj.matrix_parent_inverse),
            'loadedMatrixWorld': rows(obj.matrix_world),
            'loadedObjectToRig': rows(rig.matrix_world.inverted() @ obj.matrix_world),
            'loadedObjectToRigNative': rows(A @ (rig.matrix_world.inverted() @ obj.matrix_world) @ AINV),
            'animation': animation_record(obj),
            'constraints': [{'name': c.name, 'type': c.type, 'mute': c.mute} for c in obj.constraints],
            'modifiers': [{'name': m.name, 'type': m.type, 'showViewport': m.show_viewport,
                           'armature': m.object.name if m.type == 'ARMATURE' and m.object else None}
                          for m in obj.modifiers]}

def bone_record(b):
    relative = b.parent.matrix_local.inverted() @ b.matrix_local if b.parent else b.matrix_local
    return {'name': b.name, 'parent': b.parent.name if b.parent else None,
            'headArmatureSource': vector(b.head_local), 'tailArmatureSource': vector(b.tail_local),
            'headArmatureNative': vector(A @ b.head_local), 'tailArmatureNative': vector(A @ b.tail_local),
            'lengthSource': b.length, 'lengthNative': .8 * b.length,
            'matrixBoneLocalToArmatureSource': rows(b.matrix_local),
            'matrixBoneNativeToArmatureNative': rows(A @ b.matrix_local @ AINV),
            'matrixBoneLocalToParentBoneSource': rows(relative),
            'matrixBoneNativeToParentBoneNative': rows(A @ relative @ AINV),
            'axesInArmatureSource': {'x': vector(b.x_axis), 'y': vector(b.y_axis), 'z': vector(b.z_axis)},
            'axesInArmatureNativeDirections': {'x': vector((A.to_3x3() @ b.x_axis).normalized()),
                                              'y': vector((A.to_3x3() @ b.y_axis).normalized()),
                                              'z': vector((A.to_3x3() @ b.z_axis).normalized())},
            'useDeform': b.use_deform, 'inheritScale': b.inherit_scale}

try:
    if OUTPUT.exists():
        raise RuntimeError('Output exists; no overwrite or automatic second extraction permitted')
    OUTPUT.mkdir(parents=True)
    CREATED_OUTPUT = True
    REPORT['masterSHA256Before'] = digest(MASTER)
    if REPORT['masterSHA256Before'] != EXPECTED_MASTER:
        raise RuntimeError('Protected master byte hash mismatch before load')
    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    scene = bpy.context.scene
    rig = bpy.data.objects['Pounce_Overhaul_Rig']
    if rig.type != 'ARMATURE':
        raise RuntimeError('Actual named rig is not an armature')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    REPORT['legacyFingerprintBefore'] = legacy_fingerprint(rig, meshes)
    if REPORT['legacyFingerprintBefore'] != EXPECTED_LEGACY:
        raise RuntimeError('Actual legacy geometry/rest/bind fingerprint mismatch; no relabel')
    loaded = {'frame': scene.frame_current, 'subframe': scene.frame_subframe,
              'fps': scene.render.fps, 'fpsBase': scene.render.fps_base,
              'posePosition': rig.data.pose_position, 'rigObject': object_record(rig, rig),
              'poseBones': {b.name: {'matrixArmaturePose': rows(b.matrix), 'matrixBasis': rows(b.matrix_basis),
                                    'headArmaturePose': vector(b.head), 'tailArmaturePose': vector(b.tail),
                                    'rotationMode': b.rotation_mode,
                                    'constraints': [{'name': c.name, 'type': c.type, 'mute': c.mute} for c in b.constraints]}
                            for b in rig.pose.bones}}
    objects = {o.name: object_record(o, rig) for o in meshes}
    bone_packet = {b.name: bone_record(b) for b in rig.data.bones}
    chains = {}
    for limb in ['FL', 'FR', 'HL', 'HR']:
        upper, lower, paw = [rig.data.bones[limb + '_' + suffix] for suffix in ['upper', 'lower', 'paw']]
        chains[limb] = {'upper': upper.name, 'lower': lower.name, 'paw': paw.name,
                        'upperParent': upper.parent.name if upper.parent else None,
                        'upperLengthSource': upper.length, 'lowerLengthSource': lower.length,
                        'upperLengthNative': upper.length * .8, 'lowerLengthNative': lower.length * .8,
                        'reachMaximumNative': (upper.length + lower.length) * .8,
                        'hipRestArmatureSource': vector(upper.head_local),
                        'kneeRestArmatureSource': vector(lower.head_local),
                        'pawRestArmatureSource': vector(paw.head_local),
                        'upperTailToLowerHeadSource': (upper.tail_local - lower.head_local).length,
                        'lowerTailToPawHeadSource': (lower.tail_local - paw.head_local).length}
    REPORT['packets'] = [write('loaded-state.json', loaded), write('armature-rest.json', {'bones': bone_packet, 'chains': chains, 'objectsLoaded': objects})]
    # In-memory REST only. No pose reset, scene frame change, modifier edits, transforms or file save.
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    rig_eval = rig.evaluated_get(graph)
    totals = {'vertices': 0, 'polygons': 0, 'triangles': 0}
    paw_geometry = {k: [] for k in chains}
    material_names = set()
    for index, obj in enumerate(meshes):
        data = obj.data
        data.calc_loop_triangles()
        groups = {g.index: g.name for g in obj.vertex_groups}
        bone_groups = {i for i, name in groups.items() if name in rig.data.bones}
        part_groups = {i for i, name in groups.items() if name.startswith('part:')}
        raw_positions = [vector(v.co) for v in data.vertices]
        weights = [[[g.group, g.weight] for g in v.groups] for v in data.vertices]
        parts = {groups[i]: [v.index for v in data.vertices if any(g.group == i and g.weight > .5 for g in v.groups)] for i in part_groups}
        polygons = [{'vertices': list(p.vertices), 'material': p.material_index, 'smooth': p.use_smooth} for p in data.polygons]
        triangles = [{'vertices': list(t.vertices), 'polygon': t.polygon_index, 'material': t.material_index} for t in data.loop_triangles]
        eval_obj = obj.evaluated_get(graph)
        evaluated = eval_obj.to_mesh()
        try:
            evaluated.calc_loop_triangles()
            to_rig = rig_eval.matrix_world.inverted() @ eval_obj.matrix_world
            rest_source = [vector(to_rig @ v.co) for v in evaluated.vertices]
            rest_native = [vector(A @ Vector(p)) for p in rest_source]
            eval_tri = [list(t.vertices) for t in evaluated.loop_triangles]
            evaluated_payload = {'coordinates': 'REST-evaluated current-armature-object space (carrier removed once)',
                                 'matrixEvaluatedObjectToCurrentRig': rows(to_rig), 'verticesArmatureSource': rest_source,
                                 'verticesArmatureNative': rest_native, 'triangles': eval_tri,
                                 'boundsSource': bounds(rest_source), 'boundsNative': bounds(rest_native)}
        finally:
            eval_obj.to_mesh_clear()
        sums = [sum(g.weight for g in v.groups if g.group in bone_groups) for v in data.vertices]
        name_materials = [m.name if m else None for m in data.materials]
        material_names.update(n for n in name_materials if n)
        mixed_faces = [p.index for p in data.polygons if len({groups[g.group] for i in p.vertices for g in data.vertices[i].groups if g.group in part_groups and g.weight > .5}) != 1]
        packet = {'object': obj.name, 'rawCoordinateSpace': 'mesh datablock local, not world or bone local',
                  'rawVertices': raw_positions, 'polygons': polygons, 'triangles': triangles,
                  'vertexGroupNames': groups, 'vertexWeights': weights, 'partVertexIndices': parts,
                  'ambiguousOrUnownedPartFaces': mixed_faces, 'materialSlots': name_materials,
                  'boneWeightSumRange': [min(sums), max(sums)] if sums else None,
                  'maximumBoneWeightNormalizationError': max((abs(s - 1) for s in sums), default=None),
                  'rawBounds': bounds(raw_positions), 'restEvaluation': evaluated_payload}
        REPORT['packets'].append(write('mesh-%02d.json' % index, packet))
        totals['vertices'] += len(data.vertices); totals['polygons'] += len(data.polygons); totals['triangles'] += len(data.loop_triangles)
        # Select complete retained named rigid parts with ONE actual paw owner, never all weighted skin vertices.
        if obj.name == 'Pounce_Skinned_RigidDetails_001':
            raw_to_rig = rig.matrix_world.inverted() @ obj.matrix_world
            for limb in chains:
                bone_name = limb + '_paw'
                for part_name, ids in parts.items():
                    if ids and all(sum(g.weight for g in data.vertices[i].groups if groups[g.group] == bone_name) > .999 for i in ids):
                        paw_geometry[limb].append({'part': part_name, 'object': obj.name, 'vertexIndices': ids,
                                                   'verticesArmatureSource': [vector(raw_to_rig @ data.vertices[i].co) for i in ids]})
    paws = {}
    for limb, owned_parts in paw_geometry.items():
        points = [p for part in owned_parts for p in part['verticesArmatureSource']]
        paw_head = rig.data.bones[limb + '_paw'].head_local
        local_points = [vector(rig.data.bones[limb + '_paw'].matrix_local.inverted() @ Vector(p)) for p in points]
        paws[limb] = {'actualNamedRigidPawParts': owned_parts, 'restBoundsArmatureSource': bounds(points), 'restBoundsPawBoneLocal': bounds(local_points),
                     'lowestAuthoredZSource': min((p[2] for p in points), default=None),
                     'geometricEnvelopeHalfExtentsFromPawHeadSource': [max((abs(p[i] - paw_head[i]) for p in points), default=0) for i in range(3)],
                     'functionalSoleReference': None, 'functionalSupportFootprint': None,
                     'soleStatus': 'UNKNOWN: lowest named paw geometry includes claws/armor; no authored sole marker or support-pad surface provenance establishes a functional sole',
                     'envelopeIsNotSupportPad': True}
    REPORT['packets'].append(write('paw-ownership.json', paws))
    REPORT['legacyFingerprintAfter'] = legacy_fingerprint(rig, meshes)
    REPORT['masterSHA256After'] = digest(MASTER)
    if REPORT['masterSHA256After'] != EXPECTED_MASTER or REPORT['legacyFingerprintAfter'] != EXPECTED_LEGACY:
        raise RuntimeError('Protected source changed; extraction gate failed')
    REPORT.update(status='MEASURED_REST_EXTRACTION_ONLY', totals=totals, bones=len(rig.data.bones), meshes=len(meshes), materialNames=sorted(material_names),
                  basisSourceToNative=rows(A), basisNativeToSource=rows(AINV), rootCarrier='rig object once; actor pi mount excluded',
                  restEvaluation='in-memory pose_position REST only; loaded object animation separately recorded, no master save',
                  functionalSole='UNKNOWN', sourceMotion='NOT_RUN', continuousClearance='UNKNOWN', bodyMassCOM='NOT_QUALIFIED')
except Exception as error:
    REPORT.update(status='STOPPED_FIRST_EXTRACTION_FAILURE', firstFailure={'type': type(error).__name__, 'message': str(error), 'traceback': traceback.format_exc()})
finally:
    REPORT['elapsedSeconds'] = time.monotonic() - START
    REPORT['closedUTC'] = datetime.now(timezone.utc).isoformat()
    if MASTER.exists():
        REPORT['masterSHA256AtClose'] = digest(MASTER)
    if CREATED_OUTPUT:
        write('receipt.json', REPORT)
    print(json.dumps({'status': REPORT['status'], 'elapsedSeconds': REPORT['elapsedSeconds'], 'output': str(OUTPUT), 'masterUnchanged': REPORT.get('masterSHA256AtClose') == EXPECTED_MASTER}))

if REPORT['status'] != 'MEASURED_REST_EXTRACTION_ONLY':
    sys.exit(1)
