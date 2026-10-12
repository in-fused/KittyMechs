"""One stdlib postprocess of frozen measurements; no Blender/imported controller."""
import hashlib
import json
import math
import struct
import sys
import time
import traceback
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / 'assets/source/overhaul-pounce-bind-extractor-001/extraction'
OUTPUT = ROOT / 'assets/source/overhaul-pounce-bind-reconciliation-001/reconciliation'
MASTER = ROOT / 'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.blend'
RAW = ROOT / 'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.raw.glb'
EXPECTED_MASTER = '63fdc9b9ea96459d8943ab519ca6e7cc3f2d39dcb21f0b74915359e8109bd400'
EXPECTED_RAW = '2a12ec71e453c811faad006cbfa29b99dc395f995a13d20974e3f2982c429eab'
EXPECTED_RECEIPT = 'e682c6655cb249f24bd3b06cea65344668b58b25bce3ecdb53c60b62effb14e6'
A = [[.8, 0, 0, 0], [0, 0, .8, 0], [0, -.8, 0, 0], [0, 0, 0, 1]]
AINV = [[1.25, 0, 0, 0], [0, 0, -1.25, 0], [0, 1.25, 0, 0], [0, 0, 0, 1]]
START = time.monotonic()
CREATED = False
REPORT = {'candidate': 'pounce-bind-reconciliation-001', 'schema': 'pounce-reconciled-bind/1',
          'status': 'STARTED', 'admitted': False, 'startedUTC': datetime.now(timezone.utc).isoformat(),
          'functionalSole': None, 'functionalFootprint': None, 'nativeSourceMotion': 'NOT_RUN'}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, packet):
    path = OUTPUT / name
    path.write_text(json.dumps(packet, sort_keys=True, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    return {'file': name, 'bytes': path.stat().st_size, 'sha256': sha(path)}

def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def inverse(m):
    a = [list(row) + [1.0 if i == j else 0.0 for j in range(4)] for i, row in enumerate(m)]
    for col in range(4):
        pivot = max(range(col, 4), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-14:
            raise ValueError('Singular recorded matrix')
        a[col], a[pivot] = a[pivot], a[col]
        scale = a[col][col]
        a[col] = [x / scale for x in a[col]]
        for row in range(4):
            if row != col:
                factor = a[row][col]
                a[row] = [a[row][j] - factor * a[col][j] for j in range(8)]
    return [row[4:] for row in a]

def columns(m):
    return [[m[i][j] for i in range(3)] for j in range(3)]

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def norm(a):
    return math.sqrt(dot(a, a))

def minus(a, b):
    return [x - y for x, y in zip(a, b)]

def normalized(a):
    n = norm(a)
    if not n > 0:
        raise ValueError('Zero recorded direction')
    return [x / n for x in a]

def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]

def transform_direction(v):
    return normalized([v[0], v[2], -v[1]])

def max_error(a, b):
    return max(abs(a[i][j] - b[i][j]) for i in range(4) for j in range(4))

def rounding_bound(operations, scale=1):
    # Fixed float32 measurement-consistency budget, not a geometry/contact tolerance.
    u = 2 ** -24
    return operations * u / (1 - operations * u) * max(1, scale)

def validate_bone(name, b, bones):
    m, parent = b['matrixBoneLocalToArmatureSource'], b['parent']
    c = columns(m)
    head, tail = b['headArmatureSource'], b['tailArmatureSource']
    delta = minus(tail, head)
    relative = b['matrixBoneLocalToParentBoneSource']
    parent_m = bones[parent]['matrixBoneLocalToArmatureSource'] if parent else [[float(i == j) for j in range(4)] for i in range(4)]
    recomposed = mul(parent_m, relative)
    position_scale = max(1, *(abs(x) for x in head + tail), *(abs(x) for row in m for x in row))
    residuals = {
      'orthonormal': max(abs(dot(c[i], c[j]) - float(i == j)) for i in range(3) for j in range(3)),
      'rightHandedDeterminant': abs(dot(cross(c[0], c[1]), c[2]) - 1),
      'headTranslation': max(abs(m[i][3] - head[i]) for i in range(3)),
      'headTailDirection': norm(minus(normalized(c[1]), normalized(delta))),
      'headTailLength': abs(norm(delta) - b['lengthSource']),
      'parentComposition': max_error(recomposed, m),
      'recordedNativeConjugate': max_error(mul(mul(A, m), AINV), b['matrixBoneNativeToArmatureNative']),
      'homogeneousRow': max(abs(m[3][j] - float(j == 3)) for j in range(4))}
    limits = {'orthonormal': rounding_bound(32), 'rightHandedDeterminant': rounding_bound(48),
              'headTranslation': rounding_bound(32, position_scale), 'headTailDirection': rounding_bound(48),
              'headTailLength': rounding_bound(32, position_scale), 'parentComposition': rounding_bound(96, position_scale),
              'homogeneousRow': rounding_bound(8), 'recordedNativeConjugate': rounding_bound(96, position_scale)}
    failed = [key for key in residuals if residuals[key] > limits[key]]
    old = b['axesInArmatureSource']
    relative_axes = columns(relative)
    discrepancy = {axis: {'oldRecordedProperty': old[axis],
                           'actualArmatureColumnDirection': normalized(c[i]),
                           'actualParentRelativeColumnDirection': normalized(relative_axes[i]),
                           'errorAgainstArmature': norm(minus(old[axis], normalized(c[i]))),
                           'errorAgainstParentRelative': norm(minus(old[axis], normalized(relative_axes[i])))}
                   for i, axis in enumerate(['x', 'y', 'z'])}
    converted = mul(mul(A, m), AINV)
    original_directions = {axis: transform_direction(c[i]) for i, axis in enumerate(['x', 'y', 'z'])}
    converted_directions = {axis: normalized(v) for axis, v in zip(['x', 'y', 'z'], columns(converted))}
    return {'name': name, 'parent': parent, 'sourceRestMatrix': m,
            'sourceHead': head, 'sourceTail': tail, 'lengthSource': b['lengthSource'], 'lengthNative': b['lengthNative'],
            'armatureSourceDirectionsOfOriginalBoneLocalAxes': {axis: normalized(c[i]) for i, axis in enumerate(['x', 'y', 'z'])},
            'parentBoneSourceDirectionsOfOriginalChildBoneLocalAxes': {axis: normalized(relative_axes[i]) for i, axis in enumerate(['x', 'y', 'z'])},
            'armatureNativeDirectionsOfOriginalBoneLocalAxes': original_directions,
            'convertedBoneNativeToArmatureNative': converted,
            'armatureNativeDirectionsOfConvertedBoneLocalAxes': converted_directions,
            'convertedLocalLongitudinalAxis': [0, 0, -1],
            'originalLocalLongitudinalAxis': [0, 1, 0],
            'oldKnownBadLabelsPreserved': {'axesInArmatureSource': old, 'axesInArmatureNativeDirections': b['axesInArmatureNativeDirections']},
            'oldPropertyDiscrepancy': discrepancy,
            'validation': {'residuals': residuals, 'limits': limits, 'passed': not failed, 'failedFields': failed}}

def node_matrix(n):
    if 'matrix' in n:
        return [[n['matrix'][4*j+i] for j in range(4)] for i in range(4)]
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    if abs(x*x+y*y+z*z+w*w-1) > rounding_bound(32):
        raise ValueError('Nonunit raw GLTF node quaternion')
    s = n.get('scale', [1, 1, 1]); t = n.get('translation', [0, 0, 0])
    r = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
         [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
         [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    return [[r[i][j]*s[j] for j in range(3)] + [t[i]] for i in range(3)] + [[0, 0, 0, 1]]

def glb_record(path, bones):
    data = path.read_bytes()
    magic, version, total = struct.unpack_from('<III', data)
    if magic != 0x46546c67 or version != 2 or total != len(data):
        raise ValueError('Malformed protected GLB header')
    document = None; binary = None; offset = 12
    while offset < len(data):
        size, kind = struct.unpack_from('<II', data, offset); offset += 8
        payload = data[offset:offset+size]; offset += size
        if len(payload) != size:
            raise ValueError('Malformed protected GLB chunk')
        if kind == 0x4e4f534a:
            document = json.loads(payload.decode('utf-8').rstrip('\x00 \t\r\n'))
        elif kind == 0x004e4942:
            binary = payload
    if document is None or binary is None:
        raise ValueError('Missing protected GLB JSON/BIN')
    nodes = document['nodes']; parents = {}
    for i, n in enumerate(nodes):
        for child in n.get('children', []):
            if child in parents:
                raise ValueError('GLTF node has multiple parents')
            parents[child] = i
    globals_m = {}; active = set()
    def global_m(index):
        if index in globals_m:
            return globals_m[index]
        if index in active:
            raise ValueError('GLTF node hierarchy cycle')
        active.add(index)
        local = node_matrix(nodes[index])
        result = mul(global_m(parents[index]), local) if index in parents else local
        active.remove(index); globals_m[index] = result
        return result
    measured_nodes = [{'index': i, 'name': n.get('name'), 'parentIndex': parents.get(i),
                       'localMatrixGLTF': node_matrix(n), 'globalDefaultMatrixGLTF': global_m(i),
                       'originalTRSOrMatrix': {k: n[k] for k in ['translation', 'rotation', 'scale', 'matrix'] if k in n},
                       'mesh': n.get('mesh'), 'skin': n.get('skin')} for i, n in enumerate(nodes)]
    measured_skins = []
    for si, skin in enumerate(document.get('skins', [])):
        accessor = document['accessors'][skin['inverseBindMatrices']]
        if accessor.get('sparse') or accessor['componentType'] != 5126 or accessor['type'] != 'MAT4' or accessor['count'] != len(skin['joints']):
            raise ValueError('Unsupported actual inversebind accessor representation')
        view = document['bufferViews'][accessor['bufferView']]
        if view.get('buffer', 0) != 0 or document['buffers'][0].get('uri'):
            raise ValueError('External protected GLB buffer unsupported')
        begin = view.get('byteOffset', 0) + accessor.get('byteOffset', 0); stride = view.get('byteStride', 64)
        joints = []
        for ji, ni in enumerate(skin['joints']):
            at = begin + ji*stride
            if at < 0 or at+64 > len(binary) or at+64 > view.get('byteOffset', 0)+view['byteLength']:
                raise ValueError('Inversebind accessor outside actual bufferView')
            raw = struct.unpack_from('<16f', binary, at)
            ibm = [[raw[4*j+i] for j in range(4)] for i in range(4)]
            inv = inverse(ibm); name = nodes[ni].get('name'); source = bones.get(name)
            joints.append({'nodeIndex': ni, 'name': name, 'inverseBindMatrixGLTF': ibm,
                           'jointBindLocalToMeshBindLocalGLTF': inv,
                           'currentDefaultGlobalTimesIBM': mul(global_m(ni), ibm),
                           'sourceBoneNameMatchOnly': name if source else None,
                           'sourceRestHeadNativeIfNameMatch': source['headArmatureNative'] if source else None,
                           'meshBindTranslationTimesRuntimeScale0_8': [.8*inv[i][3] for i in range(3)],
                           'correspondenceStatus': 'UNKNOWN: actual meshbind/default/export frames recorded; name match does not establish local-basis equivalence'})
        measured_skins.append({'index': si, 'name': skin.get('name'), 'skeletonNode': skin.get('skeleton'), 'joints': joints})
    return {'asset': document.get('asset'), 'nodes': measured_nodes, 'skins': measured_skins,
            'runtimeUniformScale': .8, 'runtimeActorPiMount': 'SEPARATE_NOT_APPLIED',
            'localConvention': 'ACTUAL_GLTF_LOCAL_AXES; no assumed A*M*A^-1 exporter equivalence',
            'defaultPoseCorrespondence': 'UNKNOWN: exported default/current/source actions may differ',
            'animationNames': [a.get('name') for a in document.get('animations', [])]}

try:
    if OUTPUT.exists():
        raise RuntimeError('Output exists; preserve prior attempt, no overwrite')
    OUTPUT.mkdir(parents=True); CREATED = True
    if sha(INPUT / 'receipt.json') != EXPECTED_RECEIPT or sha(MASTER) != EXPECTED_MASTER or sha(RAW) != EXPECTED_RAW:
        raise RuntimeError('Protected input hash mismatch before postprocess')
    receipt = json.loads((INPUT / 'receipt.json').read_text(encoding='utf-8'))
    protected = {str(MASTER): EXPECTED_MASTER, str(RAW): EXPECTED_RAW, str(INPUT / 'receipt.json'): EXPECTED_RECEIPT}
    for packet in receipt['packets']:
        path = INPUT / packet['file']; actual = sha(path)
        if actual != packet['sha256'] or path.stat().st_size != packet['bytes']:
            raise RuntimeError('Frozen measured packet hash/bytes mismatch: ' + packet['file'])
        protected[str(path)] = actual
    REPORT['protectedInputsBefore'] = protected
    rest = json.loads((INPUT / 'armature-rest.json').read_text(encoding='utf-8')); bones = rest['bones']
    if len(bones) != 25:
        raise RuntimeError('Unexpected frozen bone count')
    roots = [name for name, bone in bones.items() if bone['parent'] is None]
    if not roots:
        raise RuntimeError('Recorded source hierarchy has no root')
    depths = {}
    for name in bones:
        visited = set(); current = name
        while current is not None:
            if current not in bones or current in visited:
                raise RuntimeError('Recorded source hierarchy missing parent or cycle: ' + name)
            visited.add(current); current = bones[current]['parent']
        depths[name] = len(visited)-1
    REPORT['hierarchy'] = {'roots': roots, 'depthByBone': depths, 'acyclicAllParentsPresent': True}
    reconciled = {name: validate_bone(name, bone, bones) for name, bone in bones.items()}
    REPORT['packets'] = [write('reconciled-rest.json', {'bones': reconciled, 'unchangedChains': rest['chains'], 'A': A, 'AInverse': AINV,
                                                      'derivedDataOnly': True, 'notNewBlenderMeasurements': True})]
    failed = [name for name, bone in reconciled.items() if not bone['validation']['passed']]
    if failed:
        REPORT['failedBones'] = failed
        raise RuntimeError('First mathematical rest consistency gate failed; full all-bone residual packet preserved')
    REPORT['packets'].append(write('raw-gltf-binding.json', glb_record(RAW, bones)))
    after = {path: sha(Path(path)) for path in protected}
    REPORT['protectedInputsAfter'] = after
    if after != protected:
        raise RuntimeError('Protected inputs changed during postprocess')
    REPORT.update(status='DERIVED_REST_RECONCILIATION_ONLY', bonesValidated=25, allFrozenInputsUnchanged=True,
                  maximumResiduals={field: max(b['validation']['residuals'][field] for b in reconciled.values()) for field in next(iter(reconciled.values()))['validation']['residuals']},
                  oldLabels='PRESERVED_KNOWN_BAD; discrepancy measured against both actual matrix frames',
                  gltfCorrespondence='UNKNOWN_NOT_FORCED', sourcePhysicsQualification='NONE')
except Exception as error:
    REPORT.update(status='STOPPED_FIRST_POSTPROCESS_FAILURE', firstFailure={'type': type(error).__name__, 'message': str(error), 'traceback': traceback.format_exc()})
finally:
    if 'protectedInputsBefore' in REPORT:
        REPORT['protectedInputsAfter'] = {path: sha(Path(path)) for path in REPORT['protectedInputsBefore']}
        REPORT['allFrozenInputsUnchanged'] = REPORT['protectedInputsBefore'] == REPORT['protectedInputsAfter']
    REPORT['elapsedSeconds'] = time.monotonic() - START; REPORT['closedUTC'] = datetime.now(timezone.utc).isoformat()
    if CREATED:
        write('receipt.json', REPORT)
    print(json.dumps({'status': REPORT['status'], 'elapsedSeconds': REPORT['elapsedSeconds'], 'output': str(OUTPUT)}))
if REPORT['status'] != 'DERIVED_REST_RECONCILIATION_ONLY':
    sys.exit(1)
