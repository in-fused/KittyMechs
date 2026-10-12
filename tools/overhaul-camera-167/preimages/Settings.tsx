import { useGameStore, type Quality } from '../state/store';
export function Settings(){
  const settings=useGameStore(s=>s.settings),change=useGameStore(s=>s.setSettings);
  const performance=useGameStore(s=>s.performance),renderer=useGameStore(s=>s.rendererReport);
  return <div className="modal-scrim"><section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="modal-close" aria-label="Close settings" onClick={()=>useGameStore.setState({settingsOpen:false})}>×</button><span className="eyebrow">SYSTEM CONFIGURATION</span><h2 id="settings-title">Tune your experience</h2><p>Settings save automatically on this device.</p>
    <label>Graphics quality<select aria-label="Graphics quality" value={settings.quality} onChange={e=>change({quality:e.target.value as Quality})}><option value="low">Low — lighter hardware / mobile</option><option value="medium">Medium — balanced</option><option value="high">High — richer shadows and world detail</option><option value="ultra">Ultra — maximum resolution and detail</option></select></label>
    <p className="setting-note">Changes resolution, shadows, streaming distance, vegetation, particles and bloom.</p>
    <p className="setting-note">Low limits render resolution to about 1280 × 720 pixels on larger windows, keeping the same screen shape. The image may look softer.</p>
    <div className="renderer-report" role="group" aria-label="Renderer report"><strong>Renderer report</strong>
      <p className="setting-note">{renderer.active&&renderer.sampledAt!==null?<>{performance.fps} FPS · {performance.calls.toLocaleString()} draw calls · {performance.triangles.toLocaleString()} triangles<br/>Render buffer: {renderer.bufferWidth} × {renderer.bufferHeight} pixels</>:renderer.active?'Waiting for the first frame sample.':'Deploy to measure the renderer.'}</p>
      {renderer.active&&<p className="setting-note" style={{overflowWrap:'anywhere'}}>{renderer.classification==='software-reported'?'Software renderer reported':renderer.classification==='hardware-reported'?'Hardware renderer reported':'Renderer type unknown'}: {renderer.renderer??'GPU label unavailable'}<br/>FPS updates once per second; draw counts describe the last completed frame.</p>}
    </div>
    <label>Master volume <output>{Math.round(settings.volume*100)}%</output><input aria-label="Master volume" type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e=>change({volume:Number(e.target.value)})}/></label>
    <label>Look sensitivity <output>{settings.sensitivity.toFixed(1)}</output><input aria-label="Look sensitivity" type="range" min=".2" max="3" step=".1" value={settings.sensitivity} onChange={e=>change({sensitivity:Number(e.target.value)})}/></label>
    {!settings.felinePrototype&&<label>Camera distance <output>{settings.cameraDistance} m</output><input aria-label="Camera distance" type="range" min="6" max="18" step="1" value={settings.cameraDistance} onChange={e=>change({cameraDistance:Number(e.target.value)})}/></label>}
    {settings.felinePrototype&&<label>Feline preview camera distance <output>{settings.felineCameraDistance??6} m</output><input aria-label="Feline preview camera distance" type="range" min="6" max="18" step="1" value={settings.felineCameraDistance??6} onChange={e=>change({felineCameraDistance:Number(e.target.value)})}/></label>}
    <label className="check-setting"><input type="checkbox" checked={settings.reducedFlashes} onChange={e=>change({reducedFlashes:e.target.checked})}/> Reduced flashes and camera shake</label>
    <label className="check-setting"><input type="checkbox" checked={settings.invertY} onChange={e=>change({invertY:e.target.checked})}/> Invert vertical look</label>
    <label className="check-setting"><input aria-label="Pounce feline prototype" aria-describedby="pounce-preview-description" type="checkbox" checked={settings.felinePrototype} onChange={e=>change({felinePrototype:e.target.checked})}/> Pounce feline model preview</label>
    <p id="pounce-preview-description" className="setting-note">Replaces Pounce's body and quadruped/upright animations with the new feline rig. Your controls stay the same and the camera stays third person. Applies only to Pounce; unfinished actions temporarily use the standard model. Switch off and on to restart the preview. During play, press V to level your view.</p>
    <button className="primary" onClick={()=>useGameStore.setState({settingsOpen:false})}>RETURN TO MECH</button>
  </section></div>;
}
