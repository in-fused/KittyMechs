"""ONE passive view job: immutable failed source, no geometry/pose/export/save."""
import bpy, pathlib, hashlib, json, datetime, traceback
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'.sites-runtime/overhaul-20261010/complete-pounce-failed-master-views001'
MASTER=ROOT/'assets/source/overhaul-pounce-complete-assembly-001/Pounce_CompleteAssembly_001.blend'
RAW=ROOT/'assets/source/overhaul-pounce-complete-assembly-001/Pounce_CompleteAssembly_001.raw.glb'
EXPECTED={str(MASTER):'13e4d09f7de269cb5df894f311ddb38b803aae64a2ac8b21a0dcf043823f7b7c',str(RAW):'b7b4726a61e10569486b07aa646067506c1c17fb4dad23e00f2c4cdaf029698f'}
VIEWS=[('full.png',(5,-6,3.8),(0,.6,1.15),5.9),('paw.png',(-2,-3.1,1.5),(-.73,-1.18,.20),1.1),('sole.png',(-1.5,-2.1,-1.2),(-.73,-1.18,.10),.85)]
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def write(name,data):(OUT/name).write_text(json.dumps(data,indent=2,allow_nan=False),encoding='utf8')
START=utc();completed=[];failure=None;before={};status='PASSIVE_PRESENTATION_FAILURE_STOP'
OUT.mkdir(parents=True,exist_ok=False)
try:
    before={p:sha(p) for p in EXPECTED}
    if before!=EXPECTED:raise RuntimeError('PROTECTED_INPUT_SHA_MISMATCH')
    scene=bpy.context.scene
    rigs=[o for o in bpy.data.objects if o.type=='ARMATURE']
    if len(rigs)!=1 or len(rigs[0].pose.bones)!=57:raise RuntimeError('SAVED_57_BONE_STATE_MISSING')
    write('saved-state.json',{'armature':rigs[0].name,'matrixWorld':[list(r) for r in rigs[0].matrix_world],'bones':{b.name:[list(r) for r in b.matrix] for b in rigs[0].pose.bones},'renderMeshes':[{'name':o.name,'hideRender':o.hide_render,'hideViewport':o.hide_viewport,'visibleCurrentViewLayer':o.visible_get()} for o in bpy.data.objects if o.type=='MESH'],'sourceQualification':'FAILED_UNCHANGED'})
    # Only ephemeral renderer/world/camera/lights. Do not alter source objects/materials/pose.
    scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('PassiveReviewWorld');world.use_nodes=True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.028,.036,.05,1)
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35;scene.world=world
    for name,loc,power,size in [('PassiveKey',(-4,-4,6),1700,5),('PassiveRim',(4,3,5),2100,4),('PassiveFill',(3,-4,3),850,4)]:
        light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
        obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,1.2))-obj.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.cameras.new('PassiveReviewCamera');obj=bpy.data.objects.new('PassiveReviewCamera',camera);scene.collection.objects.link(obj);scene.camera=obj
    for name,location,target,scale in VIEWS:
        obj.location=location;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
        camera.type='ORTHO';camera.ortho_scale=scale;scene.render.filepath=str(OUT/name)
        bpy.ops.render.render(write_still=True)
        completed.append({'path':str(OUT/name),'sha256':sha(OUT/name),'cameraLocationSource':location,'targetSource':target,'orthoScaleSource':scale,'closedUtc':utc()})
        write('completed-views.json',completed)
    status='PASSIVE_THREE_VIEW_OBSERVATION_ONLY'
except Exception as e:
    failure={'exception':type(e).__name__,'message':str(e),'traceback':traceback.format_exc()}
finally:
    after={p:sha(p) for p in EXPECTED}
    write('receipt.json',{'startedUtc':START,'closedUtc':utc(),'status':status,'failure':failure,'completed':completed,'protectedBefore':before,'protectedAfter':after,'expected':EXPECTED,'hashesMatch':before==after==EXPECTED,'geometryPoseMaterialsUnchangedInMemoryByScript':True,'sourceMasterSaved':False,'exportAuditAuthorReruns':0,'sourceBindClearanceMotionNativeArtGate1':'UNQUALIFIED_OR_UNOBSERVED'})
if failure:raise RuntimeError(failure['message'])
