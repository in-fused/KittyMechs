import { useGameStore, type Quality } from '../state/store';
export function Settings(){
  const settings=useGameStore(s=>s.settings),change=useGameStore(s=>s.setSettings);
  return <div className="modal-scrim"><section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="modal-close" aria-label="Close settings" onClick={()=>useGameStore.setState({settingsOpen:false})}>×</button><span className="eyebrow">SYSTEM CONFIGURATION</span><h2 id="settings-title">Tune your experience</h2><p>Settings save automatically on this device.</p>
    <label>Graphics quality<select aria-label="Graphics quality" value={settings.quality} onChange={e=>change({quality:e.target.value as Quality})}><option value="low">Low — lighter hardware / mobile</option><option value="medium">Medium — balanced</option><option value="high">High — richer shadows and world detail</option><option value="ultra">Ultra — maximum resolution and detail</option></select></label>
    <p className="setting-note">Changes resolution, shadows, streaming distance, vegetation, particles and bloom.</p>
    <label>Master volume <output>{Math.round(settings.volume*100)}%</output><input aria-label="Master volume" type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e=>change({volume:Number(e.target.value)})}/></label>
    <label>Look sensitivity <output>{settings.sensitivity.toFixed(1)}</output><input aria-label="Look sensitivity" type="range" min=".2" max="3" step=".1" value={settings.sensitivity} onChange={e=>change({sensitivity:Number(e.target.value)})}/></label>
    <label>Camera distance <output>{settings.cameraDistance} m</output><input aria-label="Camera distance" type="range" min="6" max="18" step="1" value={settings.cameraDistance} onChange={e=>change({cameraDistance:Number(e.target.value)})}/></label>
    <label className="check-setting"><input type="checkbox" checked={settings.reducedFlashes} onChange={e=>change({reducedFlashes:e.target.checked})}/> Reduced flashes and camera shake</label>
    <label className="check-setting"><input type="checkbox" checked={settings.invertY} onChange={e=>change({invertY:e.target.checked})}/> Invert vertical look</label>
    <button className="primary" onClick={()=>useGameStore.setState({settingsOpen:false})}>RETURN TO MECH</button>
  </section></div>;
}
