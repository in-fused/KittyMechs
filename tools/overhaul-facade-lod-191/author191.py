from pathlib import Path
s=Path('tools/overhaul-city-lod-186/compare186.mts').read_text()
s=s.replace("import {MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';","import {MeshoptDecoder} from 'meshoptimizer';\nimport {panelIndices191} from './panel-source191';")
s=s.replace("tools/overhaul-city-lod-186","tools/overhaul-facade-lod-191").replace('await Promise.all([MeshoptDecoder.ready,MeshoptSimplifier.ready]);','await MeshoptDecoder.ready;')
start=s.index(' const [out,error]=MeshoptSimplifier.simplifyWithAttributes(')
end=s.index(' g.dispose();',start)
s=s[:start]+''' const panel=panelIndices191(g,scale),out=Uint32Array.from(panel.indices);const newBox=new Box3();for(const i of out){if(i>=position.count)throw Error('191_INDEX_RANGE');newBox.expandByPoint(new Vector3(position.getX(i),position.getY(i),position.getZ(i)));}if(!newBox.equals(box))throw Error('191_EXTREMA_CHANGED');
 catalog.materials[material][key]=Array.from(out);rows.push({material,key,originalTriangles:indices.length/3,candidateTriangles:out.length/3,instances:ps.length,extremaExact:true,sourceAttributesUntouched:attributes,components:panel.records});
 for(const p of ps){const worldBox=box.clone().applyMatrix4(p.matrix);for(const view of views){const d=worldBox.distanceToPoint(view.camera);if(d>=90){view.farOriginal+=indices.length/3;view.farCandidate+=out.length/3;view.farInstances++;}else view.nearTriangles+=indices.length/3;}}
'''+s[end:]
s=s.replace('indices186.json','indices191.json').replace('compare186.json','compare191.json').replace("errorWorld:.015,","worldThicknessMax:.08,worldSpanMax:1.2,")
s=s.replace("Real compiled geometry/index-only conservative simplification; saved-camera AABB eligibility, not actual GPU or pixel quality","Actual authored source planar caps; uncertain/large/nonplanar components retained, saved-camera AABB eligibility not actual GPU/pixels")
s=s.replace('186_','191_')
Path('tools/overhaul-facade-lod-191/compare191.mts').write_text(s)
