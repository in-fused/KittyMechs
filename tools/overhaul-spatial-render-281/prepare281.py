from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
source=r/'src/game/world/overhaulDistrictArt.tsx';target=f/'overhaulDistrictArt281.tsx'
assert not target.exists()
original=source.read_text(encoding='utf-8')
text=original.replace("import {isRainlineExtraction039Block}","import {spatialPlacements281,refreshInstanceBounds281} from '../../../tools/overhaul-spatial-render-281/spatial281';\nimport {isRainlineExtraction039Block}",1)
old='''        result.push({key:object.name,geometry,material:object.material,placements:group,mesh:null});'''
new='''        for(const cell of spatialPlacements281(group))result.push({key:object.name+':'+cell.key,geometry,material:object.material,placements:cell.placements,mesh:null});'''
assert text.count(old)==1;text=text.replace(old,new)
old='''    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;'''
new=old+'\n    refreshInstanceBounds281(mesh);'
assert text.count(old)==1;text=text.replace(old,new)
old='''  useEffect(()=>()=>{for(const batch of batches)batch.geometry.dispose();},[batches]);'''
new='''  useEffect(()=>()=>{for(const geometry of new Set(batches.map(batch=>batch.geometry)))geometry.dispose();},[batches]);'''
assert text.count(old)==1;text=text.replace(old,new)
assert text.count('frustumCulled={false}')==1;text=text.replace('frustumCulled={false}','frustumCulled={true}')
target.write_text(text,encoding='utf-8')
def row(p):
    b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(f/'preimage281.json').write_text(json.dumps({'writer':'CLOSED','source':row(source),'canonical':'src/game/world/overhaulDistrictArt.tsx','candidate':row(target),'scope':'Private candidate spatial render batching; native/simulation/structural ownership unchanged; performance and actual destruction visual culling unverified'},indent=2),encoding='utf-8')
print(json.dumps(row(target)))
