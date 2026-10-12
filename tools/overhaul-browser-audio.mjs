import {writeFile} from 'node:fs/promises';

/** Observe the game's actual output. No microphone, synthetic event, game-state
 * write or gameplay input API: the extra stream receives existing destination
 * connections while their original speaker connection stays intact. */
export async function installAudioCapture(page){
  await page.addInitScript(()=>{
    const NativeContext=window.AudioContext;
    if(!NativeContext||!window.MediaRecorder)return;
    const mimeType=['audio/webm;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    if(!mimeType)return;
    const originalConnect=AudioNode.prototype.connect,records=[],byContext=new WeakMap();
    AudioNode.prototype.connect=function(...args){
      const result=originalConnect.apply(this,args),record=byContext.get(this.context);
      if(record&&args[0]===this.context.destination){
        originalConnect.call(this,record.destination,args[1]??0,0);record.nodes.add(this);
      }
      return result;
    };
    window.AudioContext=class extends NativeContext{
      constructor(...args){
        super(...args);
        const destination=this.createMediaStreamDestination(),chunks=[];
        const recorder=new MediaRecorder(destination.stream,{mimeType});
        const record={context:this,destination,chunks,recorder,nodes:new Set(),startedWall:Date.now(),mimeType};
        recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
        byContext.set(this,record);records.push(record);recorder.start(1000);
      }
    };
    window.__kittyMechOutputCapture={
      inspect:()=>records.map(r=>({state:r.context.state,sampleRate:r.context.sampleRate,recorder:r.recorder.state,chunks:r.chunks.length})),
      stop:async()=>{
        const captured=[];
        for(const r of records){
          if(r.recorder.state!=='inactive')await new Promise(resolve=>{r.recorder.addEventListener('stop',resolve,{once:true});r.recorder.stop();});
          const blob=new Blob(r.chunks,{type:r.mimeType}),bytes=new Uint8Array(await blob.arrayBuffer());
          let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
          captured.push({startedWall:r.startedWall,endedWall:Date.now(),contextState:r.context.state,sampleRate:r.context.sampleRate,mimeType:r.mimeType,bytes:bytes.length,base64:btoa(binary)});
          byContext.delete(r.context);
          for(const node of r.nodes)try{node.disconnect(r.destination);}catch{/* Already-ended game sources are disconnected. */}
        }
        AudioNode.prototype.connect=originalConnect;window.AudioContext=NativeContext;
        return captured;
      },
    };
  });
}

export async function finishAudioCapture(page,path){
  const captures=await page.evaluate(()=>window.__kittyMechOutputCapture?.stop()??[]),metadata=[];
  for(const [index,capture] of captures.entries()){
    const file=index===0?path:path.replace(/\.webm$/,`-${index}.webm`);
    await writeFile(file,Buffer.from(capture.base64,'base64'));
    const {base64,...receipt}=capture;void base64;metadata.push({...receipt,file});
  }
  return metadata;
}
