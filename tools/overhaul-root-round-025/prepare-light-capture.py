from pathlib import Path
root=Path(__file__).resolve().parents[2]
text=(root/'tools/overhaul-runtime-art-player-024.mjs').read_text(encoding='utf-8-sig')
def change(old,new):
    global text
    assert text.count(old)==1,old
    text=text.replace(old,new)
change("import {installAudioCapture,finishAudioCapture} from './overhaul-browser-audio.mjs';\n",'')
change("runtime-art-player-024'","runtime-art-player-028'")
change("browser.newContext({viewport,recordVideo:{dir:output,size:{width:960,height:600}}}),browser.newContext({viewport,recordVideo:{dir:output,size:{width:960,height:600}}})","browser.newContext({viewport,recordVideo:{dir:output,size:{width:960,height:600}}}),browser.newContext({viewport})")
change(";await installAudioCapture(host);",";")
change("const shot=async name=>{await host.screenshot({path:resolve(output,name+'-host.png')});await guest.screenshot({path:resolve(output,name+'-guest.png')});};","const shot=async name=>{evidence.ui.push({omittedActiveScreenshot:name});};")
change("evidence.audio=await finishAudioCapture(host,resolve(output,'actual-game-output.webm')).catch(e=>({failure:String(e)}));evidence.videos=await Promise.all([host.video().path(),guest.video().path()]);","evidence.audio={captured:false};evidence.videos=[await host.video().path()];")
change("const evidence={startUTC", "const nativeHistory=[];\nconst evidence={nativeHistory,visualPolicy:'One host video960x600, canvas1440x900; no audio/guestvideo/active screenshots. Preserved native history prevents comparing current authority grounded with delayed presentation. Not a matched performance experiment.',startUTC")
change("successor024 correct numeric navigation uses actual camera movementYaw", "fresh028 light visual observation, numeric navigation uses actual camera movementYaw")
change("for(const [p,name] of [[host,'host'],[guest,'guest']]){p.setDefaultTimeout", "for(const [p,name] of [[host,'host'],[guest,'guest']]){p.on('websocket',ws=>ws.on('framereceived',frame=>{try{const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(name==='host'&&msg.type==='snapshot'){if(nativeHistory.length>=4000)throw Error('Native history cap');for(const a of msg.state.actors.filter(a=>a.name==='PreviewHost'))nativeHistory.push({wallUTC:new Date().toISOString(),tick:msg.state.tick,time:msg.state.time,actor:a.id,life:a.jumpEpoch,processed:a.jumpProcessed,grounded:a.grounded,position:{...a.position},velocity:{...a.velocity}});}}catch(error){evidence.errors.push({name,channel:'native-history',message:String(error)});}}));p.setDefaultTimeout")
change("s=>!s.a.grounded&&s.r.prototype.diagnostics.some(d=>d.actor===s.a.id&&d.mode==='air')", "s=>s.r.prototype.diagnostics.some(d=>d.actor===s.a.id&&d.mode==='air'&&nativeHistory.some(n=>n.actor===s.a.id&&n.life===s.a.jumpEpoch&&n.processed>0&&!n.grounded&&Math.abs(n.time-d.renderTime)<=.06))")
change("s=>s.a.grounded,5000);await sample('actual upright landing')", "s=>s.a.grounded&&nativeHistory.some(n=>n.actor===s.a.id&&n.life===s.a.jumpEpoch&&n.processed>0&&!n.grounded),5000);await sample('actual upright landing after retained native takeoff')")
change("const guard=()=>{if(Date.now()-start>180000)", "const guard=()=>{if(Date.now()-start>110000)")
change("Cumulative180s bound STOP", "Cumulative110s bound STOP")
target=root/'tools/overhaul-runtime-art-player-028.mjs'
assert not target.exists()
target.write_text(text,encoding='utf-8')
print('Prepared one distinct lightweight observation; UNRUN')
