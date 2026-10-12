import { useState } from 'react';
import { MAPS } from '../../shared/maps';
import { CHASSIS, MECHS } from '../../shared/config';
import { useGameStore } from '../state/store';
import { connectServer, deployTraining, getInvite, hostPeer, joinPeer } from '../game/network';
import { audio } from '../game/audio';
export function Hangar(){
  const state=useGameStore(),invite=getInvite();
  const selectedMech=MECHS[state.chassis];
  const theaterImage=state.seed===1926?'ember':state.seed===4107?'frostline':'rainline';
  const servedByArena=Boolean(document.querySelector('meta[name="kittymech-arena"]'));
  const dedicatedAvailable=servedByArena||Boolean(import.meta.env.VITE_ARENA_URL)||['localhost','127.0.0.1'].includes(location.hostname)||/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(location.hostname);
  const [joinOpen,setJoinOpen]=useState(Boolean(invite.peer||invite.room)),[address,setAddress]=useState(invite.peer??invite.room??'');
  const launch=(action:()=>void)=>{void audio.unlock();action();};
  const join=()=>{
    let value=address.trim(),peer=invite.peer;
    try{const url=new URL(value);peer=url.searchParams.get('peer')??undefined;value=url.searchParams.get('room')??value;}catch{if(value.length>12)peer=value;}
    launch(()=>{if(peer)void joinPeer(peer);else connectServer(false,value);});
  };
  return <section className="hangar">
    <div className="menu-art"><video autoPlay muted loop playsInline poster="/assets/art/rainline-key-art.webp" src="/assets/art/rainline-menu.mp4"/><div className="art-shade"/></div>
    <header className="brand"><CatMark/><div><strong>KITTYMECH</strong><span>RAINLINE EXPEDITIONS</span></div></header>
    <button className="settings-link" aria-label="Open settings" onClick={()=>useGameStore.setState({settingsOpen:true})}>⚙ <span>SETTINGS</span></button>
    <div className="menu-intro"><span className="eyebrow">TINY PILOT. FORMIDABLE MACHINE.</span><h1>Nine lives.<br/><em>Heavy metal.</em></h1><p>Take the paws of a feline war machine.<br/>Bring your squad. Reclaim the wild.</p><div className="build-tag"><i/> BROWSER-NATIVE · PLAYABLE PROTOTYPE</div></div>
    <div className="deploy-panel">
      <div className="section-heading"><span className="eyebrow">01 / CHOOSE YOUR CHASSIS</span><span>NEURAL LINK READY</span></div>
      <div className="chassis-choices">
        {CHASSIS.map(chassis=><button key={chassis} aria-label={`Select ${MECHS[chassis].name}`} className={`chassis-card ${state.chassis===chassis?'selected':''}`} aria-pressed={state.chassis===chassis} onClick={()=>useGameStore.setState({chassis})}><img className="chassis-render" src={`/assets/art/chassis-${chassis}.webp`} alt=""/><span className="card-corner">{state.chassis===chassis?'●':'○'}</span><strong>{MECHS[chassis].name}</strong><span>{MECHS[chassis].role}</span><small>{MECHS[chassis].health} ARMOR · {MECHS[chassis].speed} m/s</small></button>)}
      </div>
      <div className="chassis-brief" aria-live="polite"><span>{selectedMech.abilityName.toUpperCase()} <small>SHIFT · {selectedMech.abilityCooldown}s</small></span><p>{selectedMech.description}</p></div>
      <label className="pilot-name"><span>PILOT CALLSIGN</span><input maxLength={20} value={state.name} aria-label="Pilot callsign" onChange={e=>useGameStore.setState({name:e.target.value})}/></label>
      <div className="section-heading"><span className="eyebrow">02 / DEPLOYMENT RULES</span></div>
      <div className="mode-choices" role="group" aria-label="Game mode">{(['coop','pvp','pvpve'] as const).map(mode=><button key={mode} aria-pressed={state.mode===mode} className={state.mode===mode?'active':''} onClick={()=>useGameStore.setState({mode})}>{mode==='coop'?'CO-OP':mode==='pvp'?'PVP':'PVPVE'}</button>)}</div>
      <p className="mode-note">{state.mode==='coop'?'Restore the relays, defeat sentinels and extract together.':state.mode==='pvp'?'Pilot versus pilot. First to ten eliminations wins.':'Rival pilots. Hostile sentinels. Race to secure the storm core.'}</p>
      <label className="map-select"><span className="eyebrow">03 / SELECT THEATER</span><select aria-label="Select theater" value={state.seed} onChange={e=>useGameStore.setState({seed:Number(e.target.value)})}>{MAPS.map(m=><option key={m.seed} value={m.seed}>{m.name}</option>)}</select><small>{MAPS.find(m=>m.seed===state.seed)?.subtitle}</small></label>
      <figure className="theater-preview"><img src={`/assets/art/theater-${theaterImage}.webp`} alt={`${MAPS.find(m=>m.seed===state.seed)?.name} concept illustration`}/><figcaption><span>{state.seed===1926?'TERRACED BOWL · SWITCHBACK ROUTES':state.seed===4107?'RIDGE STATION · CROSSING CAUSEWAYS':'DOCK DISTRICT · CARGO ALLEYS'}</span><small>THEATER CONCEPT</small></figcaption></figure>
      {joinOpen?<div className="join-panel"><span className="eyebrow">{invite.peer||invite.room?'YOUR SQUAD IS WAITING':'JOIN AN EXPEDITION'}</span><label><span>Invite link or arena code</span><input aria-label="Invite link or arena code" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&address.trim())join();}} placeholder="Paste your friend's invite"/></label><button className="primary" disabled={!address.trim()} onClick={join}>JOIN SQUAD <span>↗</span></button><button className="quiet" onClick={()=>setJoinOpen(false)}>Back to deployment</button></div>:<div className="deployment-actions"><button className="primary" onClick={()=>launch(()=>{if(servedByArena||import.meta.env.VITE_ARENA_URL)connectServer(true);else void hostPeer();})}>HOST SQUAD <span>↗</span></button><div className="secondary-actions"><button onClick={()=>launch(deployTraining)}>DEPLOY SOLO</button><button onClick={()=>setJoinOpen(true)}>JOIN INVITE</button></div><p className="invite-note">Up to 8 pilots. Host an arena, then copy its invite link.</p></div>}
      {dedicatedAvailable&&<details className="server-options"><summary>Hosting options / LAN</summary><button className="quiet" onClick={()=>launch(()=>void hostPeer())}>Host browser invite</button><button className="quiet" onClick={()=>launch(()=>connectServer(true))}>Host on arena server</button><p>Browser invites keep the host tab active. Server arenas stay live while their server is running.</p></details>}
    </div>
    <footer className="hangar-footer"><span>WASD MOVE · MOUSE / IJKL AIM · SPACE JUMP · SHIFT ABILITY</span><span>WEBGL 2 / BUILT FOR THE BROWSER</span></footer>
  </section>;
}
export function CatMark(){return <svg className="cat-mark" viewBox="0 0 50 50" aria-hidden="true"><path d="M9 36V11l12 9h8l12-9v25L25 45Z" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="m16 29 6 2m12-2-6 2m-5 6h4" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>;}
