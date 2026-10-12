"""Re-open saved v1/v2 sources; independently compare retained source streams."""
import bpy, json, hashlib, sys, argparse, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--attempt',default='attempt-003')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
assert re.fullmatch(r'attempt-\d{3}',args.attempt)
OUT=ROOT/'assets/source/bastion-art-v2'/args.attempt
assert not (OUT/'saved-source-verification-v2.json').exists(), 'Refusing immutable source proof overwrite'
receipt=json.loads((OUT/'source-shoulder-receipt.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(path,exclude):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    mesh.data.calc_loop_triangles();rows=[];uv=mesh.data.uv_layers.active
    assert uv and len(uv.data)==len(mesh.data.loops)
    for t in mesh.data.loop_triangles:
        if any(i in exclude for i in t.vertices):continue
        corners=[]
        for i,loop in zip(t.vertices,t.loops):
            v=mesh.data.vertices[i]
            corners.append([list(v.co),list(mesh.data.corner_normals[loop].vector),list(uv.data[loop].uv),sorted((mesh.vertex_groups[g.group].name,g.weight) for g in v.groups)])
        variants=[corners[i:]+corners[:i] for i in range(3)]
        rows.append(json.dumps([mesh.data.materials[t.material_index].name,min(variants,key=json.dumps)],separators=(',',':')))
    actions={}
    for a in bpy.data.actions:
        actions[a.name]=[[c.data_path,c.array_index,[[*p.co,p.interpolation] for p in c.keyframe_points]] for layer in a.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]
    signature={'bones':{b.name:{'parent':b.parent.name if b.parent else None,'matrix':[list(r) for r in b.matrix_local]} for b in rig.data.bones},'actions':actions,'meshLocal':[list(r) for r in mesh.matrix_local],'rigLocal':[list(r) for r in rig.matrix_local]}
    images=[{'name':i.name,'size':list(i.size),'colorSpace':i.colorspace_settings.name,'packedSha256':hashlib.sha256(i.packed_file.data).hexdigest()} for i in bpy.data.images if i.source=='FILE']
    chest=rig.data.bones['chest'].matrix_local
    selected={index:[{'id':i,'position':list(mesh.data.vertices[i].co)} for c in components for i in c['vertices']] for index,components in receipt['selectedSourceComponents'].items()} if path.name.endswith('v1.blend') else None
    return sorted(rows),signature,images,selected,[chest[row][col] for col in range(4) for row in range(4)]
original=ROOT/receipt['source'];candidate=OUT/'Bastion_Quadruped.art-v2.blend'
assert sha(original)==receipt['sourceSha256'] and sha(candidate)==receipt['sourceBlendSha256']
deleted={i for components in receipt['selectedSourceComponents'].values() for c in components for i in c['vertices']}
before=read(original,deleted)
after=read(candidate,set(range(receipt['newVerticesStart'],receipt['sourceVertices'])))
assert before[0]==after[0], 'Retained saved source position/normal/UV/material/weights changed'
assert before[1]==after[1], 'Rig channels, local transforms or binds changed'
assert before[2]==after[2], 'Packed texture master or color space changed'
component_source=ROOT/'assets/source/bastion-art-v1/baseline-components.json'
component3=next(c for c in json.loads(component_source.read_text())['components'] if c['index']==3)
protection=[]
for index,components in receipt['selectedSourceComponents'].items():
    points={p['id']:p['position'] for p in before[3][index]}
    for component in components:
        outside=[i for i in component['vertices'] if any(points[i][axis]<component3['min'][axis]-2e-6 or points[i][axis]>component3['max'][axis]+2e-6 for axis in range(3))]
        assert outside, 'A selected connected component could be entirely component3-owned'
        protection.append({'sourceHull':int(index),'selectedComponent':component['component'],'outsideOriginalComponent3AABBVertexIds':outside})
result={'passed':True,'method':'Independent read-only reopen of actual saved Blender files; exact canonical oriented retained position/normal/UV0/material/all-weight triangle streams; exact source rig/actions/local transforms and packed images.',
 'baseline':str(original.relative_to(ROOT)),'baselineSha256':sha(original),'candidate':str(candidate.relative_to(ROOT)),'candidateSha256':sha(candidate),
 'retainedTriangles':len(before[0]),'streamSha256':hashlib.sha256(json.dumps(before[0],separators=(',',':')).encode()).hexdigest(),
 'sourceChestMatrixLocal':before[4],'originalSourceVertices':before[3],'packedImages':before[2],
 'protectedComponent3':{'method':'Every deleted connected component has measured vertices outside original component3 AABB; no same-component3 convex-envelope part can be selected wholesale. Exact all-unselected triangle stream verification protects the retained chest parts.', 'baselineComponentMetadataSha256':sha(component_source),'component3Bounds':component3,'selectedComponents':protection},
 'producerSha256':sha(Path(__file__)),'scope':'Source preservation only; decoded graphics, contacts, shell clearance and art approval separate'}
assert not (OUT/'saved-source-verification-v2.json').exists()
(OUT/'saved-source-verification-v2.json').write_text(json.dumps(result,indent=2))
print('SAVED_SHOULDER_SOURCE_PASS',json.dumps({'triangles':len(before[0]),'selectedVertices':len(deleted),'packedMaps':len(before[2])}),flush=True)
