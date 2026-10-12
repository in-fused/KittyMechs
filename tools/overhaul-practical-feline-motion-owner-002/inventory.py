import json, pathlib, struct, hashlib
root=pathlib.Path(__file__).resolve().parents[2]
paths=['public/assets/models/'+n+'_Quadruped.glb' for n in ['Pounce','Bastion','Lynx','Caracal']]+['public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb']
assets=[]
for path in paths:
    data=(root/path).read_bytes()
    magic,version,length=struct.unpack_from('<III',data)
    assert magic==0x46546c67 and version==2 and length==len(data)
    jlength,jtype=struct.unpack_from('<II',data,12)
    assert jtype==0x4e4f534a
    doc=json.loads(data[20:20+jlength]);nodes=doc.get('nodes',[]);parents={child:i for i,n in enumerate(nodes) for child in n.get('children',[])}
    skins=[]
    for skin in doc.get('skins',[]):
        skins.append({'joints':[{'index':i,'name':nodes[i].get('name'),'parent':nodes[parents[i]].get('name') if i in parents else None,'translation':nodes[i].get('translation',[0,0,0]),'rotation':nodes[i].get('rotation',[0,0,0,1]),'scale':nodes[i].get('scale',[1,1,1]),'matrix':nodes[i].get('matrix')} for i in skin['joints']], 'inverseBindAccessor':skin.get('inverseBindMatrices')})
    animations=[]
    for a in doc.get('animations',[]):
        channels=[];duration=0
        for channel in a['channels']:
            sampler=a['samplers'][channel['sampler']];accessor=doc['accessors'][sampler['input']]
            assert accessor.get('max') and accessor.get('min'), 'time bounds missing'
            duration=max(duration,accessor['max'][0]);target=channel['target'];index=target['node']
            channels.append({'node':nodes[index].get('name'),'path':target['path'],'interpolation':sampler.get('interpolation','LINEAR'),'keys':accessor['count'],'minTime':accessor['min'][0],'maxTime':accessor['max'][0]})
        animations.append({'name':a.get('name'),'duration':duration,'tracks':channels})
    assets.append({'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'skins':skins,'animations':animations})
result={'contract':'ACTUAL_GLB_JSON_ONLY_NO_GEOMETRY_OR_NATIVE_EXECUTION','pairSource':'Candidate002 explicitly uses public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb, the actual pair-clip source; normal Pounce has no pair clips','assets':assets}
out=root/'.sites-runtime/overhaul-20261010/overhaul-practical-feline-motion-owner-002/actual-asset-inventory.json';out.write_text(json.dumps(result,indent=2),encoding='utf8')
for asset in assets:
    print(asset['path'], len(asset['skins'][0]['joints']),[(a['name'],round(a['duration'],4),len(a['tracks'])) for a in asset['animations']])
base=['Idle','Walk','Trot','Gallop','Air','UprightIdle','UprightWalk','UprightAir','TransformUp','TransformDown','Grab','Cling','Climb','Mantle','TurnLeft','TurnRight','UprightWalkLong','UprightStride','UprightTurnLeft','UprightTurnRight']
profiles=[]
for asset in assets:
    available={a['name']:a for a in asset['animations']};v3='overhaul/' in asset['path'];rig=asset['skins'][0]['joints'];expected=sorted(t['node']+'.'+{'translation':'position','rotation':'quaternion','scale':'scale'}[t['path']] for t in asset['animations'][0]['tracks'])
    clips={}
    for a in asset['animations']:
        layout=sorted(t['node']+'.'+{'translation':'position','rotation':'quaternion','scale':'scale'}[t['path']] for t in a['tracks'])
        clips[a['name']]={'duration':a['duration'],'trackCount':len(a['tracks']),'trackLayout':None if layout==expected else layout}
    names=['Feline'+n for n in base];names[6]=None # superseded by actual Long/Stride/Turn locomotion
    if v3:names[10]=None
    reactions=[[('FelineUpright' if up else 'Feline')+n for n in ['Pulse','Missile','Ability','Hit','Death']] for up in [False,True]]
    if v3:reactions[0][2]=reactions[1][2]=None
    profiles.append({'path':asset['path'],'sha256':asset['sha256'],'kind':'overhaul-pounce-v3' if v3 else 'legacy-'+asset['path'].split('/')[-1].split('_')[0].lower(),'base':names,'reactions':reactions,'references':['FelineCombatBase','FelineUprightCombatBase'],'grab':'bounded-air-to-cling' if v3 else 'authored-grab','grabDuration':.3,'ability':'authority-strike-pair-world-effect' if v3 else 'authored-combat-overlay','pairSource':'public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb','pairCapability':'authority-pounce-only','rig':[{'name':n['name'],'parent':n['parent'],'translation':n['translation'],'rotation':n['rotation'],'scale':n['scale']} for n in rig],'trackLayout':expected,'clips':clips})
(root/'src/game/entities/practicalFelineAssetProfiles002.json').write_text(json.dumps({'schema':2,'provenance':'Actual GLB JSON inventories; semantic assignments are new candidate choreography, not source acceptance','profiles':profiles},indent=2),encoding='utf8')
