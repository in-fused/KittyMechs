import { type BenchmarkReport, type BenchmarkRuntime } from './runtime';
import './style.css';

const params = new URLSearchParams(location.search);
const candidate = params.get('candidate') === 'three' ? 'three' : 'r3f';
const modelUrl = params.get('model') ?? '/assets/models/Pounce_Quadruped.glb?rev=feline-pounce-art-12';
const root = document.getElementById('benchmark')!;
root.innerHTML = `<main class="viewport" id="view"></main><aside class="panel"><div class="eyebrow">KITTYMECH • ARCHITECTURE LAB</div><h1>${candidate === 'r3f' ? 'R3F repair' : 'Imperative Three'}</h1><nav><a href="?candidate=r3f">R3F repair</a><a href="?candidate=three">Imperative Three</a></nav><p>WASD move · Space jump · R transform stance<br>Drag orbit · Q rotate camera · Eight Pounce rigs</p><div class="actions"><button id="start">Start capture</button><button id="stop">Stop capture</button><button id="route">30s matched route</button><button id="reset">Reset</button><button id="download">Save JSON</button></div><pre id="status">Loading Pounce asset…</pre><p class="note">DPR 1 · 1024 shadows · Same scene and fixed 60 Hz authority. Architecture selection awaits measured ordinary play.</p></aside>`;
const status = document.getElementById('status')!;
let owner: BenchmarkRuntime | null = null, lastReport: BenchmarkReport | null = null, automaticRoute = false;
function stop() { if (!owner) throw new Error('Benchmark has not mounted'); automaticRoute = false; lastReport = owner.stop(); return lastReport; }
const expose = (runtime: BenchmarkRuntime) => {
  owner = runtime;
  window.kittyBenchmark = {
    get ready() { return runtime.ready; },
    get error() { return runtime.error; },
    get lastReport() { return lastReport; },
    start: (label) => { lastReport = null; return runtime.start(label); },
    stop, snapshot: () => runtime.snapshot(), status: () => runtime.status(),
    setInput: command => runtime.setInput(command), setCamera: (yaw, pitch) => runtime.setCamera(yaw, pitch),
    reset: () => runtime.reset(), route: seconds => runtime.route(seconds),
  };
};
const doWhenReady = (action: (runtime: BenchmarkRuntime) => void) => { if (!owner?.ready) return; action(owner); };
document.getElementById('start')!.addEventListener('click', () => doWhenReady(runtime => { automaticRoute = false; lastReport = null; runtime.start(); }));
document.getElementById('stop')!.addEventListener('click', () => doWhenReady(() => { stop(); }));
document.getElementById('route')!.addEventListener('click', () => doWhenReady(runtime => { lastReport = null; runtime.route(30); automaticRoute = true; }));
document.getElementById('reset')!.addEventListener('click', () => doWhenReady(runtime => { automaticRoute = false; runtime.reset(); }));
document.getElementById('download')!.addEventListener('click', () => doWhenReady(runtime => {
  const report = lastReport ?? runtime.snapshot();
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `kitty-${candidate}-${Date.now()}.json`; link.click(); URL.revokeObjectURL(url);
}));
const timer = window.setInterval(() => {
  if (!owner) return;
  const live = owner.status();
  if (automaticRoute && !live.routeActive) stop();
  if (live.error) { status.textContent = `Asset / renderer error: ${live.error}`; return; }
  if (!live.ready) return;
  const report = lastReport;
  if (report) status.textContent = `${report.frames} frames • ${report.durationSeconds.toFixed(1)}s capture\nFPS ${report.fps.toFixed(1)} • p95 ${report.frameIntervalsMs.p95.toFixed(2)}ms\np99 ${report.frameIntervalsMs.p99.toFixed(2)}ms • calls ${report.drawCalls.p50}\nTriangles ${Math.round(report.triangles.p50).toLocaleString()}\n${report.renderer.gpu}\nSave JSON for full samples.`;
  else status.textContent = `${live.capturing ? 'RECORDING' : 'Ready'} • ${live.frames} captured frames\nTick ${live.tick} • ${live.pose.stance} • position ${live.pose.x.toFixed(1)}, ${live.pose.y.toFixed(1)}, ${live.pose.z.toFixed(1)}\n${live.lastFrame ? `Interval ${live.lastFrame.intervalMs.toFixed(2)}ms • calls ${live.lastFrame.calls}\nTriangles ${live.lastFrame.triangles.toLocaleString()}` : 'Waiting for first frame'}\n${live.routeActive ? 'Matched route running' : 'Free movement'}`;
}, 500);
try {
  const adapter = candidate === 'three' ? await import('./candidate-three') : await import('./candidate-r3f');
  const dispose = adapter.mount(document.getElementById('view')!, modelUrl, expose);
  window.addEventListener('pagehide', () => { clearInterval(timer); dispose(); }, { once: true });
} catch (error) { status.textContent = `Unable to initialize renderer: ${error instanceof Error ? error.message : String(error)}`; }

declare global {
  interface Window {
    kittyBenchmark: {
      readonly ready: boolean; readonly error: string | null; readonly lastReport: BenchmarkReport | null;
      start(label?: string): ReturnType<BenchmarkRuntime['start']>; stop(): BenchmarkReport; snapshot(): BenchmarkReport;
      status(): ReturnType<BenchmarkRuntime['status']>; setInput(command: Parameters<BenchmarkRuntime['setInput']>[0]): void;
      setCamera(yaw: number, pitch?: number): void; reset(): void; route(seconds?: number): ReturnType<BenchmarkRuntime['route']>;
    };
  }
}
