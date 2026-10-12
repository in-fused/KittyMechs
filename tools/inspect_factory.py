"""CPU validation of the actual workshop GLB and closed licensed source roster."""
import hashlib
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'assets/source/environment-factory'
REFERENCE = ROOT / 'assets/reference'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf8')


def main():
    candidate = ROOT / 'assets/runtime/models/Factory_Workshop.glb'
    data = candidate.read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data))
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    document = json.loads(data[20:20 + length])
    offset = 20 + length
    binary_length, kind = struct.unpack_from('<II', data, offset)
    assert kind == 0x004E4942 and offset + 8 + binary_length == len(data)
    binary = data[offset + 8:]

    def accessor(index):
        item = document['accessors'][index]
        view = document['bufferViews'][item['bufferView']]
        dtype = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[item['componentType']]
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[item['type']]
        unit = np.dtype(dtype).itemsize
        stride = view.get('byteStride', unit * components)
        start = view.get('byteOffset', 0) + item.get('byteOffset', 0)
        assert start + (item['count'] - 1) * stride + components * unit <= len(binary)
        return np.ndarray((item['count'], components), dtype=dtype, buffer=binary, offset=start, strides=(stride, unit)).copy()

    nodes = []
    all_points = []
    triangles = vertices = 0
    for node in document['nodes']:
        # This authored exporter intentionally bakes scale/rotation. Refuse a
        # silently changed hierarchy instead of assuming local positions world.
        assert not node.get('children') and 'matrix' not in node and 'rotation' not in node and 'scale' not in node
        points, primitives = [], []
        for primitive in document['meshes'][node['mesh']]['primitives']:
            assert primitive.get('mode', 4) == 4
            positions = accessor(primitive['attributes']['POSITION']) + np.array(node.get('translation', [0, 0, 0]))
            indices = accessor(primitive['indices']).ravel()
            assert len(indices) % 3 == 0 and indices.max() < len(positions)
            assert np.isfinite(positions).all()
            normal = accessor(primitive['attributes']['NORMAL'])
            tangent = accessor(primitive['attributes']['TANGENT'])
            uv = accessor(primitive['attributes']['TEXCOORD_0'])
            assert np.isfinite(normal).all() and np.isfinite(tangent).all() and np.isfinite(uv).all()
            assert np.max(np.abs(np.linalg.norm(normal, axis=1) - 1)) < .002
            assert np.max(np.abs(np.linalg.norm(tangent[:, :3], axis=1) - 1)) < .002
            assert np.max(np.abs(np.sum(normal * tangent[:, :3], axis=1))) < .002
            assert np.isin(tangent[:, 3], [-1, 1]).all()
            points.append(positions)
            count = len(indices) // 3
            triangles += count
            vertices += len(positions)
            primitives.append({'material': document['materials'][primitive['material']]['name'], 'triangles': count, 'vertices': len(positions), 'bounds': {'min': positions.min(axis=0).tolist(), 'max': positions.max(axis=0).tolist()}, 'normalAndTangentBasisValid': True})
        points = np.concatenate(points)
        part = node['extras']['assembly_part']
        allowed = np.array([[-11.5, 0, -9], [11.5, 12.8, 9]]) if part == 'roof' else np.array([[-10.3, 0, -8.4], [10.3, 12.0001, 8.4]])
        assert (points.min(axis=0) >= allowed[0] - .0002).all() and (points.max(axis=0) <= allowed[1] + .0002).all()
        nodes.append({'name': node['name'], 'part': part, 'bounds': {'min': points.min(axis=0).tolist(), 'max': points.max(axis=0).tolist()}, 'primitives': primitives})
        all_points.append(points)
    points = np.concatenate(all_points)
    derivatives = json.loads((STAGE / 'texture-derivatives.json').read_text())
    derivative_hashes = {item['sha256']: item for item in derivatives}
    images = []
    for image in document['images']:
        view = document['bufferViews'][image['bufferView']]
        content = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        sha = digest(content)
        assert sha in derivative_hashes, 'Exported texture differs from audited shipping derivative'
        expected = derivative_hashes[sha]
        decoded = Image.open(io.BytesIO(content))
        assert max(decoded.size) <= 1024 and list(decoded.size) == expected['size']
        images.append({'name': image['name'], 'bytes': len(content), 'sha256': sha, 'size': list(decoded.size), 'role': expected['role'], 'colorSpace': expected['colorSpace'], 'derivativePath': expected['path']})
    assert len(images) == len(derivatives) == 16
    for material in document['materials']:
        pbr = material['pbrMetallicRoughness']
        if material['name'].startswith('modular_factory_facade_'):
            assert material['occlusionTexture']['index'] == pbr['metallicRoughnessTexture']['index']
            for role, info in [('normalGL', material['normalTexture']), ('ARM', material['occlusionTexture']), ('baseColor', pbr['baseColorTexture'])]:
                assert images[document['textures'][info['index']]['source']]['role'] == role
            assert material.get('alphaMode', 'OPAQUE') == ('BLEND' if material['name'].endswith('_glass') else 'OPAQUE')
    assert len(data) <= 5_000_000 and triangles <= 28000 and len(document['materials']) <= 7
    source = json.loads((STAGE / 'source-package-receipt.json').read_text())
    assert sorted(p.relative_to(STAGE / 'package').as_posix() for p in (STAGE / 'package').rglob('*') if p.is_file()) == sorted(item['path'] for item in source['files'])
    for item in source['files']:
        raw = (STAGE / 'package' / item['path']).read_bytes()
        assert digest(raw) == item['sha256'] and hashlib.md5(raw).hexdigest() == item['providerMd5'] and len(raw) == item['bytes']
    assembly = json.loads((STAGE / 'assembly-receipt.json').read_text())
    assert assembly['triangles'] == triangles
    bounds = {'schema': 1, 'candidate': candidate.relative_to(ROOT).as_posix(), 'sha256': digest(data), 'bytes': len(data), 'units': 'meters', 'up': 'Y', 'bounds': {'min': points.min(axis=0).tolist(), 'max': points.max(axis=0).tolist()}, 'nodes': nodes, 'triangles': triangles, 'exportVertices': vertices, 'primitives': sum(len(n['primitives']) for n in nodes), 'materialCount': len(document['materials']), 'images': images, 'materials': document['materials'], 'cpuBinaryValidationPassed': True, 'gpuRenderRan': False}
    provenance = {'schema': 1, 'asset': 'Factory_Workshop', 'scope': 'Original selected-module Rainline assembly; not the complete factory kit', 'candidate': bounds['candidate'], 'candidateSha256': bounds['sha256'], 'license': {'architectureAndMatchedMaps': 'CC0-1.0', 'author': 'James Ray Cock', 'provider': 'Poly Haven', 'sourcePage': source['sourcePage'], 'licenseUrls': source['licenseUrls'], 'sign': 'Original project-generated texture; see retained Higgsfield provenance, not represented as Poly Haven CC0'}, 'sourcePackage': source, 'sourceInventorySha256': digest((STAGE / 'source-inventory.json').read_bytes()), 'assembly': assembly, 'textureDerivatives': derivatives, 'signProvenance': json.loads((REFERENCE / 'higgsfield-factory-sign.json').read_text()), 'binaryValidation': {'boundsReceipt': 'assets/reference/factory-bounds.json', 'boundsReceiptSha256': None, 'sourceHashRosterReverified': True, 'embeddedImagesMatchAuditedDerivatives': True, 'normalAndTangentBasisValid': True, 'fullKitCloned': False}, 'buildTool': {'path': 'tools/build_factory.py', 'sha256': digest((ROOT / 'tools/build_factory.py').read_bytes())}, 'validationTool': {'path': 'tools/inspect_factory.py', 'sha256': digest(Path(__file__).read_bytes())}, 'gameDevCliGateRan': False, 'gpuRenderRan': False, 'releaseApproved': False}
    save(REFERENCE / 'factory-bounds.json', bounds)
    provenance['binaryValidation']['boundsReceiptSha256'] = digest((REFERENCE / 'factory-bounds.json').read_bytes())
    save(REFERENCE / 'factory-provenance.json', provenance)
    print(json.dumps({'bytes': len(data), 'triangles': triangles, 'vertices': vertices, 'primitives': bounds['primitives'], 'materials': len(document['materials']), 'images': len(images), 'bounds': bounds['bounds'], 'sha256': bounds['sha256'], 'cpuBinaryValidationPassed': True}))


if __name__ == '__main__':
    main()
