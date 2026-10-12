import { lazy, Suspense } from 'react';
import { useGameStore } from '../state/store';
import { Hangar } from '../ui/Hangar';
import { Hud } from '../ui/Hud';
import { Settings } from '../ui/Settings';
import { leaveGame } from '../game/network';
const Game=lazy(()=>import('../game/GameCanvas').then(m=>({default:m.GameCanvas})));
export function App(){
  const phase=useGameStore(s=>s.phase),settingsOpen=useGameStore(s=>s.settingsOpen),error=useGameStore(s=>s.error);
  return <main className="app">
    {phase==='hangar'?<Hangar/>:<>
      {phase==='loading'?<div className="connection-screen"><span className="eyebrow">KITTYMECH / NETWORK UPLINK</span><h1>Connecting your squad</h1><p>{useGameStore.getState().connection}</p><button className="quiet" onClick={leaveGame}>Return to hangar</button></div>:<Suspense fallback={<div className="loading-overlay"><h2>Initializing battlefield…</h2><button className="quiet" onClick={leaveGame}>Cancel deployment</button></div>}><Game/></Suspense>}
      {phase!=='loading'&&<Hud/>}
    </>}
    {settingsOpen&&<Settings/>}
    {error&&<div className="error-dialog" role="alert"><span className="eyebrow">UPLINK INTERRUPTED</span><p>{error}</p><button onClick={leaveGame}>Return to hangar</button></div>}
  </main>;
}
