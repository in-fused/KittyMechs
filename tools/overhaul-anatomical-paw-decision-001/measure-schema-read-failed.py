"""Light recorded-data measurement only; no Blender/model/controller execution."""
import json, math, hashlib, pathlib, datetime
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'.sites-runtime/overhaul-20261010/anatomical-paw-decision-001'
PATHS={
 'skin':ROOT/'assets/source/overhaul-pounce-bind-extractor-001/extraction/mesh-00.json',
 'paw':ROOT/'assets/source/overhaul-pounce-bind-extractor-001/extraction/paw-ownership.json',
 'rest':ROOT/'assets/source/overhaul-pounce-bind-reconciliation-001/reconciliation/reconciled-rest.json',
 'geometry':ROOT/'assets/source/overhaul-pounce-digit-mechanism-001/first-failure-full-geometry.json',
 'state':ROOT/'assets/source/overhaul-pounce-digit-mechanism-001/first-failure-full-state.json',
 'catalog':ROOT/'assets/source/overhaul-pounce-digit-mechanism-001/source-catalog.json'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bounds(points):return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
def sub(a,b):return [a[i]-b[i] for i in range(3)]
def dot(a,b):return sum(a[i]*b[i] for i in range(3))
def norm(a):return math.sqrt(dot(a,a))
def center(vertices,tri):return [sum(vertices[v][i] for v in tri)/3 for i in range(3)]
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()

def main():
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();before={k:sha(p) for k,p in PATHS.items()}
    data={k:json.loads(p.read_text(encoding='utf-8-sig')) for k,p in PATHS.items()}
    skin=data['skin'];vertices=skin['rawVertices'];triangles=[t['vertices'] for t in skin['triangles']];bones=data['rest']['bones'];limbs={}
    adjacency={}
    for i,tri in enumerate(triangles):
        for a,b in zip(tri,tri[1:]+tri[:1]):adjacency.setdefault(tuple(sorted((a,b))),[]).append(i)
    bone_names=set(bones);groups=skin['vertexGroupNames']
    for limb in ('FL','FR','HL','HR'):
        head=bones[limb+'_lower']['sourceHead'];tail=bones[limb+'_lower']['sourceTail'];axis=sub(tail,head);length=norm(axis);unit=[v/length for v in axis]
        # One source-anatomical seam definition, no dimension search: distal20% of actual lower link.
        cut=[head[i]+.8*axis[i] for i in range(3)];signed=[dot(sub(v,cut),unit) for v in vertices]
        seed=min((i for i,t in enumerate(triangles) if max(signed[v] for v in t)>0),key=lambda i:norm(sub(center(vertices,triangles[i]),tail)))
        visited={seed};todo=[seed]
        while todo:
            tri=triangles[todo.pop()]
            for a,b in zip(tri,tri[1:]+tri[:1]):
                if max(signed[a],signed[b])<=0:continue
                for neighbor in adjacency[tuple(sorted((a,b)))]:
                    if neighbor not in visited:visited.add(neighbor);todo.append(neighbor)
        ids=sorted(set(v for t in visited for v in triangles[t]));cut_tris=[];segments=[];edge_points={};wholly=[]
        for i in sorted(visited):
            tri=triangles[i]
            if min(signed[v] for v in tri)>=0:wholly.append(i);continue
            if max(signed[v] for v in tri)<=0:continue
            crossed=[]
            for a,b in zip(tri,tri[1:]+tri[:1]):
                if signed[a]*signed[b]<0:
                    edge=tuple(sorted((a,b)));fraction=signed[a]/(signed[a]-signed[b]);point=[vertices[a][j]+fraction*(vertices[b][j]-vertices[a][j]) for j in range(3)]
                    edge_points[edge]=point;crossed.append(edge)
            if len(crossed)==2:segments.append(crossed);cut_tris.append(i)
            else:raise RuntimeError('DEGENERATE_CUT_TRIANGLE:'+str(i))
        graph={}
        for a,b in segments:graph.setdefault(a,[]).append(b);graph.setdefault(b,[]).append(a)
        remaining=set(graph);loops=[]
        while remaining:
            start=min(remaining);loop=[];previous=None;current=start
            while current not in loop:
                loop.append(current);remaining.discard(current);neighbors=graph[current]
                if len(neighbors)!=2:raise RuntimeError('SEAM_NOT_CLOSED_DEGREE_TWO')
                nxt=neighbors[0] if neighbors[0]!=previous else neighbors[1];previous,current=current,nxt
            if current!=start:raise RuntimeError('SEAM_BRANCH')
            loops.append(loop)
        point_values=[edge_points[e] for e in sorted(edge_points)];ownership={};max_other=0.
        for v in ids:
            for g,w in skin['vertexWeights'][v]:
                name=groups[g]
                if name not in bone_names:continue
                ownership[name]=ownership.get(name,0.)+w
                if not name.startswith(limb+'_'):max_other=max(max_other,w)
        limb_rows=[r for r in data['state']['interference'] if r['a'].startswith(limb+'_')]
        skin_tri_ids=sorted(set(r['firstFilteredPair'][1] for r in limb_rows if r.get('body')))
        actual_skin=data['geometry']['Pounce_Skinned_Anatomy_001'];witness_vertices=sorted(set(v for t in skin_tri_ids for v in actual_skin['triangles'][t]))
        original_parts=data['paw'][limb]['actualNamedRigidPawParts'];oldpoints=[v for p in original_parts for v in p['verticesArmatureSource']]
        limbs[limb]={'lowerHeadSource':head,'originalPawHeadSource':tail,'lowerLengthSource':length,'seamPlaneSourcePoint':cut,'seamNormalTowardPawSource':unit,'seamDistanceFromPawSource':.2*length,'seamDistanceFromPawNative':.16*length,'seamLoopCount':len(loops),'seamEdgeCount':len(edge_points),'seamBoundsSource':bounds(point_values),'regionTriangleCount':len(visited),'whollyReplaceableOriginalTriangles':wholly,'cutOriginalTriangles':cut_tris,'originalRegionVertexIndices':ids,'regionBoundsSource':bounds([vertices[v] for v in ids]),'boneWeightTotals':ownership,'maximumNonlimbBoneWeight':max_other,'exactSeamLoops':[ [{'originalEdge':list(e),'intersectionArmatureSource':edge_points[e]} for e in loop] for loop in loops ],'skinFirstWitnessTriangleIndices':skin_tri_ids,'skinFirstWitnessOriginalVertices':witness_vertices,'skinFirstWitnessBoundsWorldSource':bounds([actual_skin['verticesWorldSource'][i] for i in witness_vertices]) if witness_vertices else None,'retiredOldRigidPawBoundsSource':bounds(oldpoints),'retiredOldRigidPawParts':len(original_parts)}
    after={k:sha(p) for k,p in PATHS.items()}
    if before!=after:raise RuntimeError('RECORDED_INPUT_CHANGED')
    result={'status':'RECORDED_ANATOMICAL_ENVELOPE_MEASUREMENT_ONLY','startedUTC':started,'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputBefore':before,'inputAfter':after,'limbs':limbs,'method':'geometric distal half-space connected triangle flood from actual paw-head nearest source skin face, exact existing-edge plane intersections; no vertices changed','seamParameter':.8,'cutOwnership':'prospective retopology definition only; no author/model/native execution','currentPose':'failureWorldSource includes original carrierZ-.018; rest raw source separate','nativeBasis':'.8*(x,z,-y); no pi mount','skeletonCount':len(data['state']['actualAllBones']),'regionSharedOriginalVertices':sorted(set(limbs['FL']['originalRegionVertexIndices'])&set(limbs['FR']['originalRegionVertexIndices'])),'limits':'actual skin seam UV/weight interpolation not authored; volume/motion/support/new seam closure remain unproved'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'measured.json').write_text(json.dumps(result,indent=2,allow_nan=False),encoding='utf8')
    print(json.dumps({'status':result['status'],'limbs':{k:{n:v[n] for n in ['seamLoopCount','seamEdgeCount','regionTriangleCount','seamBoundsSource','regionBoundsSource','boneWeightTotals','maximumNonlimbBoneWeight','skinFirstWitnessBoundsWorldSource','retiredOldRigidPawBoundsSource']} for k,v in limbs.items()},'sourceHashes':before,'outputSHA256':sha(OUT/'measured.json')},indent=2))

if __name__=='__main__':main()
