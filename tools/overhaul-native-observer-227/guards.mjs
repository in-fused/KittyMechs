export function ready219227(r){
 const row=r.localReadiness,actor=r.actor,pose=actor?.nativePose,sent=r.input?.sent?.findLast(s=>s.localId===row?.localId&&s.generation===row?.generation&&s.input.seq<=actor?.lastInput&&s.input.jumpEpoch===actor?.jumpEpoch&&s.input.forward===0&&s.input.strafe===0&&!s.input.fire&&!s.input.rocket);
 return !!(row&&row.scene.ready&&!row.blocked&&row.scene.localId===row.localId&&row.scene.generation===row.generation&&actor?.id===row.localId&&actor.hp>0&&!actor.downed&&pose?.enabled&&pose.actorId===actor.id&&pose.life===actor.jumpEpoch&&pose.tick===r.tick&&sent&&r.input.at-sent.at<=1000&&r.input.native?.tick===r.tick&&r.input.mountedAt!==null&&r.input.phase==='playing'&&r.transport?.phase==='playing'&&r.camera?.bodySight?.owner===actor.id&&r.camera.frameClock>0&&r.camera.preferredDistance>0&&!r.overlay);
}
export function nativeFault227(r,sha,requireCurrent=false){
 const owner=r.native?.registry?.rows?.find(row=>row.actor===r.actor?.id),d=owner?.diagnostic,winner=r.native?.visuals?.find(v=>v.actor===r.actor?.id)?.winningProvider,visual=r.native?.visuals?.find(v=>v.actor===r.actor?.id);
 if(r.native?.registry?.loadFailures?.length)return 'PRIVATE_NATIVE_LOAD_FAILURE';
 if(d?.fatal)return 'PRIVATE_NATIVE_FATAL_BINDING';
 if(d?.firstFailure&&d.status==='temporary-standard'&&d.mode!=='unsupported-action')return 'SUPPORTED_NATIVE_SOURCE_TASK_FELL_BACK';
 if(!requireCurrent)return null;
 if(!owner||owner.assetSHA256!==sha||owner.generation!==r.localReadiness?.generation||d.actor!==r.actor.id||d.assetSHA256!==sha||d.generation!==owner.generation||d.life!==r.actor.jumpEpoch||!d.actorPresent||d.status!=='source'||d.contactQualified!==false||d.browserClipContract?.expected!==45||d.browserClipContract?.loaded!==45||d.browserClipContract?.passed!==true)return 'CURRENT_NATIVE_OWNER_61_45_CONTRACT_MISSING';
 if(!winner||winner.kind!=='named-native222'||winner.name!==`native222:${r.actor.id}:${sha}`||winner.generation!==owner.generation||winner.frameClock!==d.frameClock||winner.frameClock<0||!winner.effectiveVisible||winner.ancestors.some(a=>!a.visible)||visual.duplicateVisibleRoots)return 'CURRENT_WINNING_VISIBLE_NATIVE_PROVIDER_MISSING';
 return null;
}
