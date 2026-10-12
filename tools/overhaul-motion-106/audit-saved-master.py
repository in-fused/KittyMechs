"""Root ONE <=60s read-only reopen audit. Never saves Blender or exports assets."""
from pathlib import Path
import ast, bpy, hashlib, json, math, traceback, datetime
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'assets/source/overhaul-pounce-motion-106'
MASTER=HERE/'Pounce_Motion106.blend';before=hashlib.sha256(MASTER.read_bytes()).hexdigest();error=None;witness={}
def extract(path,names):
 text=path.read_text(encoding='utf8');tree=ast.parse(text);found={n.name:ast.get_source_segment(text,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names}
 assert set(found)==set(names);return '\n\n'.join(found[n] for n in names)
try:
 inventory=json.loads((HERE/'export-inventory.json').read_text());assert before==inventory['savedMasterSHA256']
 bpy.ops.wm.open_mainfile(filepath=str(MASTER));rigs=[o for o in bpy.data.objects if o.type=='ARMATURE'];assert len(rigs)==1 and len(rigs[0].data.bones)==57
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-art-detail-034/author.py',['fingerprint']),'retained034-fingerprint','exec'))
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-gait-058/author.py',['scalar','materials']),'retained058-materials','exec'))
 preserved=json.loads((ROOT/'assets/source/overhaul-pounce-gait-058/geometry-material-preservation.json').read_text())
 actual=fingerprint();assert actual==preserved['before'];assert json.loads(json.dumps(materials(),allow_nan=False))==preserved['materialBefore']
 records=json.loads((HERE/'authored-motion-records.json').read_text());old=json.loads((ROOT/'src/game/entities/identity57Runtime058EManifest.json').read_text())
 names=set(old['clips'])|{'FelineTransitionBase106','FelineTransitionArc106'};assert set(a.name for a in bpy.data.actions)==names and len(names)==45
 checked=[]
 for rec in records:
  action=bpy.data.actions[rec['name']];curves=list(action.fcurves) if hasattr(action,'fcurves') else []
  if not curves:
   for layer in action.layers:
    for strip in layer.strips:
     for slot in action.slots:
      bag=strip.channelbag(slot)
      if bag:curves.extend(bag.fcurves)
  assert len(curves)==570,('EXACT57_TRS_CURVES',action.name,len(curves))
  expected=list(range(1,rec['frames']+1))
  for curve in curves:
   keys=list(curve.keyframe_points);assert [p.co.x for p in keys]==expected
   assert all(math.isfinite(p.co.y) for p in keys)
  checked.append({'name':action.name,'curves':len(curves),'keysPerCurve':rec['frames'],'startFrame':1,'endFrame':rec['frames']})
 witness={'savedMasterSHA256':before,'fingerprint':actual,'geometryRestWeightsUVExact':True,'materialsExact':True,'jointCount':57,'actionCount':45,'selectedAuthoredKeys':checked,'visualQualityApproved':False}
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:
 after=hashlib.sha256(MASTER.read_bytes()).hexdigest()
 if before!=after:error={'message':'READONLY_MASTER_CHANGED'}
 output=HERE/'saved-master-audit.json';assert not output.exists(),'FRESH_AUDIT_RECEIPT_REQUIRED'
 output.write_text(json.dumps({'writer':'CLOSED','closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FIRST_SAVED_AUDIT_FAILURE_STOP' if error else 'SAVED_MASTER_REOPENED_READONLY','error':error,'masterUnchanged':before==after,'witness':witness},indent=2)+'\n',encoding='utf8')
if error:raise RuntimeError(error['message'])
print(json.dumps(witness))
