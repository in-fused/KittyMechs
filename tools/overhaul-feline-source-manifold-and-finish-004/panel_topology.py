"""Deterministic single-disk surface panel construction; no geometry execution."""

def simple_loop(edges):
    outgoing={}
    incoming={}
    for a,b in edges:
        if a==b or a in outgoing or b in incoming:return None
        outgoing[a]=b;incoming[b]=a
    if len(outgoing)<3 or set(outgoing)!=set(incoming):return None
    first=min(outgoing);loop=[];current=first
    while current not in loop:
        loop.append(current);current=outgoing[current]
    return loop if current==first and len(loop)==len(outgoing) else None

def grow_disk(triangles,selected,seed,maximum=128):
    """Add only edge-adjacent triangles that preserve one simple disk boundary.

    This is the authored panel construction rule, not a retry of solid checks.
    Vertex-only fans never join. All selected IDs and exclusions are recorded.
    """
    selected=set(selected)
    if seed not in selected:raise ValueError('PANEL_SEED_NOT_SELECTED')
    first=tuple(triangles[seed])
    if len(set(first))!=3:raise ValueError('PANEL_SEED_DEGENERATE')
    edges=set(zip(first,first[1:]+first[:1]));used=set(first);accepted={seed}
    if simple_loop(edges) is None:raise ValueError('PANEL_SEED_NOT_DISK')
    changed=True
    while changed and len(accepted)<maximum:
        changed=False
        for index in sorted(selected-accepted):
            tri=tuple(triangles[index])
            if len(set(tri))!=3:continue
            candidate=set(zip(tri,tri[1:]+tri[:1]));shared={(b,a) for a,b in candidate if (b,a) in edges}
            if len(shared) not in (1,2):continue
            if len(shared)==1 and any(v in used for v in set(tri)-{v for e in shared for v in e}):continue
            boundary=(edges-shared)|(candidate-{(b,a) for a,b in shared})
            loop=simple_loop(boundary)
            if loop is None:continue
            edges=boundary;used.update(tri);accepted.add(index);changed=True
            if len(accepted)>=maximum:break
    loop=simple_loop(edges)
    if loop is None:raise ValueError('PANEL_FINAL_BOUNDARY_NOT_SIMPLE')
    incidence={}
    for index in accepted:
        tri=tuple(triangles[index])
        for a,b in zip(tri,tri[1:]+tri[:1]):
            edge=tuple(sorted((a,b)));incidence[edge]=incidence.get(edge,0)+1
    if any(count not in (1,2) for count in incidence.values()):raise ValueError('PANEL_SOURCE_EDGE_INCIDENCE')
    return {'triangles':sorted(accepted),'boundary':loop,'excludedSelectedTriangles':sorted(selected-accepted),'construction':'edge-connected simple disk, not vertex fan','maximum':maximum}
