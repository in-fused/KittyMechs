"""Read-only selected recorded evidence for one design; no source pose/native query."""
import json,pathlib,hashlib,datetime
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(__file__).resolve().parent
PATHS={'state':ROOT/'assets/source/overhaul-anatomical-paw-loft-001/first-failure-full-state.json','geometry':ROOT/'assets/source/overhaul-anatomical-paw-loft-001/first-failure-full-geometry.json','catalog':ROOT/'assets/source/overhaul-anatomical-paw-loft-001/source-catalog.json','originalRigid':ROOT/'assets/source/overhaul-pounce-bind-extractor-001/extraction/mesh-01.json','rest':ROOT/'assets/source/overhaul-pounce-bind-reconciliation-001/reconciliation/reconciled-rest.json'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bounds(points):return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
before={k:sha(p) for k,p in PATHS.items()};data={k:json.loads(p.read_text(encoding='utf-8-sig')) for k,p in PATHS.items()}
state,geometry,catalog,rigid,rest=[data[k] for k in PATHS];mapping={int(v):int(k) for k,v in catalog['retirement']['oldToNew'].items()};groups=rigid['vertexGroupNames'];retained=geometry['Pounce_Skinned_RigidDetails_001'];witnesses=[];part_ids=set()
def owners(new_vertex):
    old=mapping[new_vertex];names=[groups[str(g)] for g,w in rigid['vertexWeights'][old] if w>0 and groups[str(g)].startswith('part:')]
    return {'currentVertex':new_vertex,'originalVertex':old,'partNames':names,'weights':[[groups[str(g)],w] for g,w in rigid['vertexWeights'][old]]}
for row in state['forbiddenInterference']:
    if row['a']!='Pounce_Skinned_RigidDetails_001':continue
    if row['type']=='actual-surface-crossing':
        tri=row['firstFilteredPair'][0];vertices=retained['triangles'][tri];owned=[owners(i) for i in vertices];witnesses.append({'into':row['b'],'type':row['type'],'currentTriangle':tri,'trianglePairs':row['trianglePairs'],'vertices':owned})
        for record in owned:part_ids.update(record['partNames'])
    elif row['witness']['retainedSource']:
        record=owners(row['witness']['vertex']);part_ids.update(record['partNames']);witnesses.append({'into':row['b'],'type':row['type'],'vertex':record,'worldSource':row['witness']['worldSource']})
parts={}
for name in sorted(part_ids):
    group=next(int(k) for k,v in groups.items() if v==name);ids=[i for i,w in enumerate(rigid['vertexWeights']) if any(g==group and value>0 for g,value in w)];current=[new for new,old in mapping.items() if old in set(ids)];parts[name]={'originalVertexIndices':ids,'retainedCurrentVertexIndices':current,'originalBoundsMeshLocal':bounds([rigid['rawVertices'][i] for i in ids]),'actualTick0WorldSourceBounds':bounds([retained['verticesWorldSource'][i] for i in current])}
planes={}
for limb in ('FL','FR','HL','HR'):
    lower=rest['bones'][limb+'_lower'];head=lower['sourceHead'];tail=lower['sourceTail'];axis=[tail[i]-head[i] for i in range(3)];length=sum(v*v for v in axis)**.5
    planes[limb]={'newDesignReplacementPlaneSource':[head[i]+.5*axis[i] for i in range(3)],'planeNormalTowardPawSource':[v/length for v in axis],'originalLowerLengthSource':length,'nativeUnchangedFullChainLength':.8*(rest['bones'][limb+'_upper']['lengthSource']+lower['lengthSource']) if 'lengthSource' in lower else None,'pawHeadSource':tail,'planeDefinition':'AUTHOR DESIGN midway through original lower bone; no new exact tessellation loop extracted or qualification'}
after={k:sha(p) for k,p in PATHS.items()}
if before!=after:raise RuntimeError('RECORDED_INPUT_CHANGED')
result={'status':'READONLY_RECORDED_WITNESS_AND_AUTHOR_BOUNDARY_DECISION','createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputBefore':before,'inputAfter':after,'actualClock':{'tick':state['tick'],'time':state['time'],'carrier':state['actualCarrierMatrix']},'retainedHardwareWitnesses':witnesses,'retainedHardwareParts':parts,'newDeclaredBoundary':planes,'geometryPoseOrNativeExecution':False}
(OUT/'recorded-facts.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps({'parts':{k:v['originalBoundsMeshLocal'] for k,v in parts.items()},'newPlanes':planes,'witnessCount':len(witnesses)}))
