"""Actual two-body preparation/support exchange, overriding the archived014 recipe.
No search/retry: one declared phase path; first gate failure stops.
"""
def restore_actual004_actions():
    allowed=json.loads((ROOT/'tools/overhaul-pounce-wholebody-source-018/actual004-capability-allowlist.json').read_text(encoding='utf-8-sig'))
    if len(allowed)!=43 or 'FelineTransformDown' not in allowed:raise RuntimeError('EXACT_ACTUAL004_CAPABILITY_ALLOWLIST')
    RIG.animation_data_clear();RIG.animation_data_create()
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    with bpy.data.libraries.load(str(ORIGINAL004/'Pounce_IdentityAnimation004.blend'),link=False) as (source,dest):
        if any(n not in source.actions for n in allowed):raise RuntimeError('ACTUAL004_ACTION_MISSING')
        dest.actions=allowed
    for action,identity in zip(dest.actions,allowed):
        if action is None:raise RuntimeError('ACTUAL004_ACTION_IMPORT_FAILED:'+identity)
        archive=identity.startswith('FelinePair');action.name=('Source004__'+identity) if archive else identity;action.use_fake_user=True
        ACTIONS.append({'name':action.name,'capabilityIdentity':identity,'complete':True,'origin':'exact actual004 action; paired originals archived with explicit identity, not new choreography qualification'})
    write('inherited-capability-identities.json',[{'identity':r['capabilityIdentity'],'actualAction':r['name']} for r in ACTIONS])

def bounds(parts):
    values=[v for p in parts for v in p['verticesWorldSource']]
    if not values or not all(math.isfinite(x) for v in values for x in v):raise RuntimeError('NONFINITE_WHOLE_BODY_GEOMETRY')
    return {'min':[min(v[i] for v in values) for i in range(3)],'max':[max(v[i] for v in values) for i in range(3)]}

def cross_guard(attacker,victim,claw_contact):
    # Include both visible tails/head/core/limbs at EVERY current sample.
    # Only requested physical fore-claw contact is excluded; no tail exception.
    parts=[p for p in attacker if not (claw_contact and p['owner'].startswith(('FL_claw_','FR_claw_')))];a,ao=combined(parts);b,bo=combined(victim);hits=a.overlap(b)
    return {'count':len(hits),'candidates':[{'attacker':ao[x],'victim':bo[y],'attackerCombinedTriangle':x,'victimCombinedTriangle':y} for x,y in hits],'scope':'conservative triangle surface candidates, not penetration volume; no omitted tail'}

def role_actions(beat,duration):
    result={}
    for role in ('Attacker','Victim'):
        name='FelinePair'+beat+role;a=bpy.data.actions.new(name);result[role]=a;ACTIONS.append({'name':name,'duration':duration,'complete':False,'sourceHz':HZ,'assembly':'both actual source bodies same clock','nativeAdmission':'UNKNOWN'})
    return result

def complete_roles(actions):
    for a in actions.values():next(r for r in ACTIONS if r['name']==a.name)['complete']=True

def emit_sample(beat,actions,index,root_y,world_feet,planted,tail,impact,bob,global_clock,phase,claw_withdraw=0):
    global CURRENT,PHASE_CONTEXT
    PHASE_CONTEXT={'beat':beat,'clockSeconds':global_clock,'frame':1+index*2,'phase':phase,'requestedAttackerRootWorldSource':rows(Matrix.Translation((0,root_y,-.018))),'requestedVictimRootWorldSource':rows(Matrix.Translation((0,0,-.018))),'tailAnticipation':tail,'contactProgress':impact}
    frame=1+index*2;bpy.context.scene.frame_set(frame)
    # Actual victim remains on its four source-ground feet. Tail anticipates
    # before approach, returns only once bodies have separated again.
    RIG.matrix_world=Matrix.Translation((0,0,-.018));RIG.animation_data.action=actions['Victim'];vstate=commit_pose(bob=-.18*tail,tail_yaw=tail);key(frame);copy_victim(RIG.matrix_world);vg=geometry_for(VICTIM);tree,owners=combined(core_parts(vg))
    root=Matrix.Translation((0,root_y,-.018));targets={};contacts=[]
    if impact>0:
        for limb in ('FL','FR'):
            endpoint,witness=contact_target(tree,owners,limb,root,.08*impact);ground=root.inverted()@world_feet[limb];target=ground.lerp(endpoint,ease(impact));target.z+=.22*math.sin(math.pi*impact)**2
            withdrawal=claw_withdraw if limb=='FL' else 0
            if withdrawal:target+=Vector(witness['normalWorldSource'])*withdrawal
            witness['releasedWithdrawalSource']=withdrawal;targets[limb]=target;contacts.append(witness)
    local_feet={l:root.inverted()@p for l,p in world_feet.items()};RIG.matrix_world=root;RIG.animation_data.action=actions['Attacker'];astate=commit_pose(bob=bob,fore_targets=targets,floor_targets=local_feet,claw_extension=.08*impact);key(frame);ag=geometry_for(RIG)
    CURRENT={'beat':beat,'clockSeconds':global_clock,'localActionSeconds':index/HZ,'frame':frame,'phase':phase,'impact':impact,'tailAnticipation':tail,'attackerRootWorldSource':rows(root),'victimRootWorldSource':rows(VICTIM.matrix_world),'attacker':astate,'victim':vstate,'plantedAttackerLimbs':list(planted),'swingAttackerLimbs':[l for l in ('FL','FR','HL','HR') if l not in planted],'requestedActualVictimContacts':contacts,'attackerWholeBodyBounds':bounds(ag),'victimWholeBodyBounds':bounds(vg),'qualification':'CURRENT_SOURCE_REQUEST_NOT_YET_ADMITTED'}
    write('current-pair-request.json',CURRENT)
    CURRENT['actualFloorAttacker']=source_floor(ag,beat+'/attacker');CURRENT['actualFloorVictim']=source_floor(vg,beat+'/victim');CURRENT['actualSupportingPadsAttacker']=pad_support(RIG,planted);CURRENT['actualSupportingPadsVictim']=pad_support(VICTIM,('FL','FR','HL','HR'))
    if impact==1:
        correspondence=[]
        for c in contacts:
            mesh=next(p for p in ag if p['object']==c['clawObject']);point=Vector(mesh['verticesWorldSource'][c['clawVertex']]);expected=Vector(c['surfaceWorldSource'])+Vector(c['normalWorldSource'])*c['releasedWithdrawalSource'];correspondence.append({'clawObject':c['clawObject'],'actualClawWorldSource':list(point),'actualVictimSurfaceWorldSource':c['surfaceWorldSource'],'expectedReleasedOrContactWorldSource':list(expected),'actualSurfaceDistanceSource':(point-Vector(c['surfaceWorldSource'])).length,'releasedWithdrawalSource':c['releasedWithdrawalSource'],'pointResidualSource':(point-expected).length})
        CURRENT['actualClawSurfaceCorrespondence']=correspondence
        if len(correspondence)!=2 or any(c['pointResidualSource']>2e-5 for c in correspondence):raise RuntimeError('ACTUAL_CLAW_SURFACE_MISMATCH')
    CURRENT['wholeBodyCrossCandidates']=cross_guard(ag,vg,impact==1)
    if CURRENT['wholeBodyCrossCandidates']['count']:raise RuntimeError('CROSS_BODY_NONCLAW_SURFACE_CANDIDATES:'+str(CURRENT['wholeBodyCrossCandidates']['candidates'][:4]))
    CURRENT['qualification']='MEASURED_SOURCE_ASSEMBLY_ONLY_NOT_NATIVE_OR_PIN_LOAD';PAIR.append(CURRENT)

def walk_phase(beat,start_y,end_y,tail,feet,clock):
    # Four declared diagonal support exchanges. A foot is held in WORLD while
    # loaded, lifted only after explicit release, then replanted at next root.
    # No endpoint clamps, world-root warp, or implicit sliding support.
    per_step=10;actions=role_actions(beat,4*per_step/HZ)
    for step in range(4):
        first=start_y+(end_y-start_y)*step/4;last=start_y+(end_y-start_y)*(step+1)/4;swing=('FL','HR') if step%2==0 else ('FR','HL');loaded=tuple(l for l in ('FL','FR','HL','HR') if l not in swing);old={l:p.copy() for l,p in feet.items()};end={l:REST[l+'_paw'].translation+Vector((0,last,-.018)) for l in swing}
        for j in range(per_step+1):
            f=j/per_step;u=ease(f);root_y=first+(last-first)*u;current={l:p.copy() for l,p in feet.items()}
            for l in swing:current[l]=old[l].lerp(end[l],u);current[l].z+=.17*math.sin(math.pi*f)**2
            planted=('FL','FR','HL','HR') if j in (0,per_step) else loaded
            emit_sample(beat,actions,step*per_step+j,root_y,current,planted,tail,0,0,clock+(step*per_step+j)/HZ,{'kind':'DIAGONAL_SUPPORT_EXCHANGE','step':step,'released':list(swing),'loaded':list(loaded),'swingProgress':f,'worldTargets':{l:list(p) for l,p in current.items()}})
        for l in swing:feet[l]=end[l]
    complete_roles(actions);return clock+4*per_step/HZ

def paired_actions():
    global CURRENT,GROUND_BOUNDS
    clear_pose();RIG.matrix_world=Matrix.Translation((0,0,-.018));commit_pose();attacker_rest=geometry_for(RIG);copy_victim(RIG.matrix_world);victim_rest=geometry_for(VICTIM)
    # Initial separating plane accounts for actual FULL rest bodies, tails too.
    # Buffer is measured fore-claw depth, a declared approach geometry envelope.
    claw_values=[p['offset'].y for l in ('FL','FR') for p in claw_offsets(l,0)];buffer=max(claw_values)-min(claw_values)
    initial_y=bounds(victim_rest)['max'][1]-bounds(attacker_rest)['min'][1]+buffer
    commit_pose(bob=-.18,tail_yaw=1);copy_victim(RIG.matrix_world);prepared=geometry_for(VICTIM)
    contact_y=bounds(prepared)['max'][1]-bounds(attacker_rest)['min'][1]+buffer
    if contact_y>=initial_y:raise RuntimeError('TAIL_PREPARATION_DOES_NOT_OPEN_APPROACH')
    # One actual finite diagnostic plane is sized ONCE from the declared two
    # body path envelopes, not from a failed support query or native map edit.
    ab=bounds(attacker_rest);vb=bounds(victim_rest);pb=bounds(prepared);GROUND_BOUNDS=(min(ab['min'][0],vb['min'][0],pb['min'][0])-1,max(ab['max'][0],vb['max'][0],pb['max'][0])+1,min(vb['min'][1],pb['min'][1],ab['min'][1]+contact_y)-1,max(vb['max'][1],pb['max'][1],ab['max'][1]+initial_y)+1)
    xmin,xmax,ymin,ymax=GROUND_BOUNDS;ground=bpy.data.objects['018AuthorGround'];corners=[(xmin,ymin,0),(xmax,ymin,0),(xmax,ymax,0),(xmin,ymax,0)]
    for vertex,point in zip(ground.data.vertices,corners):vertex.co=point
    ground.data.update();write('actual-author-ground.json',{'object':ground.name,'verticesSceneWorldSource':corners,'facet':[0,1,2,3],'pathEnvelopeDerivedBounds':list(GROUND_BOUNDS),'nativeSupport':'UNKNOWN; source geometric plane only'})
    write('pair-root-design.json',{'initialRootSourceY':initial_y,'contactRootSourceY':contact_y,'actualInitialVictimBounds':bounds(victim_rest),'actualPreparedVictimBounds':bounds(prepared),'actualAttackerRestBounds':bounds(attacker_rest),'actualForeClawDepthBuffer':buffer,'method':'whole visible bodies including tails; geometric separating plane before actual reach; fixed declared support exchange, no search/retry','nativeContact':'UNKNOWN'})
    feet={l:REST[l+'_paw'].translation+Vector((0,initial_y,-.018)) for l in ('FL','FR','HL','HR')};clock=0
    prepare=role_actions('Prepare',.6)
    for i in range(19):emit_sample('Prepare',prepare,i,initial_y,feet,('FL','FR','HL','HR'),ease(i/18),0,0,clock+i/HZ,{'kind':'VICTIM_TAIL_ANTICIPATION_ATTACKER_FOUR_PLANTED'})
    complete_roles(prepare);clock+=.6;clock=walk_phase('Approach',initial_y,contact_y,1,feet,clock)
    for beat,count in [('Impact',18),('Pin',24),('Claw',8),('Release',18)]:
        actions=role_actions(beat,count/HZ)
        for i in range(count+1):
            f=i/count;impact=ease(f) if beat=='Impact' else 1-ease(f) if beat=='Release' else 1;planted=('FL','FR','HL','HR') if impact==0 else ('HL','HR');withdraw=buffer*.60*math.sin(math.pi*f)**2 if beat=='Claw' else 0;emit_sample(beat,actions,i,contact_y,feet,planted,1,impact,-.04*impact,clock+i/HZ,{'kind':'FORE_RELEASE_VICTIM_CONTACT_REPLANT','foreProgress':impact,'hindWorldFixed':True,'leftClawReleaseRecontactSource':withdraw,'rightClawMaintainsSourceContact':beat=='Claw'},withdraw)
        complete_roles(actions);clock+=count/HZ
    clock=walk_phase('Escape',contact_y,initial_y,1,feet,clock);recover=role_actions('TailRecover',.6)
    for i in range(19):emit_sample('TailRecover',recover,i,initial_y,feet,('FL','FR','HL','HR'),1-ease(i/18),0,0,clock+i/HZ,{'kind':'TAIL_RETURN_AFTER_FULL_BODY_SEPARATION'})
    complete_roles(recover);return contact_y
