import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { BenchmarkAuthority, emptyInput, type InputCommand } from './authority';
import { createContent, type ContentOwner } from './content';
import { compileDistrict } from './district';

export type Candidate = 'r3f' | 'three';
export const BENCHMARK_REVISION = 'benchmark-v3-latched-commands';
interface FrameSample { intervalMs: number; updateMs: number; renderCpuMs: number; calls: number; triangles: number }
interface Capture { label: string; startedAt: string; wallStarted: number; samples: FrameSample[]; hiddenFrames: number; droppedSteps: number; startTick: number }
const quantile = (values: number[], q: number) => values.length ? values[Math.min(values.length - 1, Math.floor((values.length - 1) * q))] : 0;
function distribution(values: number[]) {
  values.sort((a, b) => a - b);
  return { mean: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0, p50: quantile(values, .5), p95: quantile(values, .95), p99: quantile(values, .99), max: values.at(-1) ?? 0 };
}
export function configureRenderer(renderer: WebGLRenderer) {
  renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.outputColorSpace = SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.domElement.setAttribute('aria-label', 'Architecture benchmark playable district');
}
export class BenchmarkRuntime {
  readonly district = compileDistrict();
  readonly authority = new BenchmarkAuthority(this.district);
  readonly input = emptyInput();
  ready = false;
  error: string | null = null;
  private content: ContentOwner | null = null;
  private accumulator = 0;
  private previousAt = 0;
  private cameraYaw = 0;
  private cameraPitch = .35;
  private capture: Capture | null = null;
  private routeUntilTick = 0;
  private routeStartTick = 0;
  private removeListeners: (() => void) | null = null;
  private disposed = false;
  private lastFrame: FrameSample | null = null;
  private pendingJump = false;
  private pendingTransform = false;
  private stepInput = emptyInput();
  private controls = { keyDownEvents: 0, jumpIntents: 0, transformIntents: 0, consumedJumpIntents: 0, consumedTransformIntents: 0, resets: 0 };
  private stanceTransitions: { tick: number; from: 'quad' | 'upright'; to: 'quad' | 'upright' }[] = [];
  private webgpu: { exposed: boolean; adapter: boolean | null } = { exposed: 'gpu' in navigator, adapter: null };
  constructor(readonly candidate: Candidate, readonly renderer: WebGLRenderer, readonly scene: Scene, readonly camera: PerspectiveCamera, readonly modelUrl: string) { configureRenderer(renderer); }
  async initialize() {
    try {
      const content = await createContent(this.scene, this.camera, this.renderer, this.district, this.authority, this.modelUrl);
      if (this.disposed) { content.dispose(); return; }
      this.content = content; this.ready = true; this.installInput();
      // Capability observation only; a third renderer needs a measured benefit.
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      if (gpu) void gpu.requestAdapter().then(adapter => { this.webgpu.adapter = !!adapter; }).catch(() => { this.webgpu.adapter = false; });
    } catch (error) { this.error = error instanceof Error ? error.message : String(error); }
  }
  frame(now: number) {
    const rawDt = this.previousAt ? (now - this.previousAt) / 1000 : 0; this.previousAt = now;
    if (!this.ready || !this.content) return;
    if (document.hidden) { if (this.capture) this.capture.hiddenFrames++; this.accumulator = 0; return; }
    const dt = Math.min(rawDt, .25), updateStarted = performance.now();
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= this.authority.fixedStep && steps < 8) {
      if (this.routeUntilTick > this.authority.tick) {
        const elapsed = (this.authority.tick - this.routeStartTick) / 60;
        this.cameraYaw = 0;
        Object.assign(this.input, { forward: elapsed % 16 < 8, back: elapsed % 16 >= 8, left: false, right: false, jump: elapsed % 4 < .1, transform: elapsed % 8 >= 4 && elapsed % 8 < 4.1 });
      } else if (this.routeUntilTick) { this.routeUntilTick = 0; Object.assign(this.input, emptyInput()); }
      // A key press can begin and end between two fixed ticks. Hold levels and
      // latched one-shot intents cross the same boundary for both adapters.
      Object.assign(this.stepInput, this.input);
      this.stepInput.jump ||= this.pendingJump; this.stepInput.transform ||= this.pendingTransform;
      if (this.pendingJump) this.controls.consumedJumpIntents++;
      if (this.pendingTransform) this.controls.consumedTransformIntents++;
      this.pendingJump = false; this.pendingTransform = false;
      const oldStance = this.authority.current.stance;
      this.authority.step(this.stepInput, this.cameraYaw);
      if (oldStance !== this.authority.current.stance && this.stanceTransitions.length < 128) this.stanceTransitions.push({ tick: this.authority.tick, from: oldStance, to: this.authority.current.stance });
      this.accumulator -= this.authority.fixedStep; steps++;
    }
    if (this.accumulator >= this.authority.fixedStep) {
      const dropped = Math.floor(this.accumulator / this.authority.fixedStep);
      if (this.capture) this.capture.droppedSteps += dropped;
      this.accumulator %= this.authority.fixedStep;
    }
    const updateMs = performance.now() - updateStarted, renderStarted = performance.now();
    this.renderer.info.reset();
    this.content.present(this.accumulator / this.authority.fixedStep, dt, this.cameraYaw, this.cameraPitch);
    const info = this.renderer.info;
    this.lastFrame = { intervalMs: rawDt * 1000, updateMs, renderCpuMs: performance.now() - renderStarted, calls: info.render.calls, triangles: info.render.triangles };
    if (this.capture && rawDt > 0 && this.capture.samples.length < 36000) this.capture.samples.push(this.lastFrame);
  }
  start(label = 'ordinary-play') {
    if (!this.ready) throw new Error(this.error ?? 'Benchmark assets are still loading');
    this.capture = { label, startedAt: new Date().toISOString(), wallStarted: performance.now(), samples: [], hiddenFrames: 0, droppedSteps: 0, startTick: this.authority.tick };
    return { candidate: this.candidate, label, startTick: this.authority.tick };
  }
  stop() { const report = this.snapshot(); this.capture = null; return report; }
  snapshot() {
    const capture = this.capture, samples = capture?.samples ?? [], intervals = samples.map(s => s.intervalMs), info = this.renderer.info;
    const gl = this.renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
    const frameIntervals = distribution(intervals), rendererCpu = distribution(samples.map(s => s.renderCpuMs));
    return {
      schema: 'kitty-benchmark-v1', harnessRevision: BENCHMARK_REVISION, candidate: this.candidate, ready: this.ready, error: this.error,
      label: capture?.label ?? null, startedAt: capture?.startedAt ?? null, durationSeconds: capture ? (performance.now() - capture.wallStarted) / 1000 : 0,
      frames: samples.length, fps: frameIntervals.mean ? 1000 / frameIntervals.mean : 0,
      frameIntervalsMs: frameIntervals, updateCpuMs: distribution(samples.map(s => s.updateMs)), renderCpuMs: rendererCpu,
      over16_7Ms: samples.filter(s => s.intervalMs > 16.7).length, over33_3Ms: samples.filter(s => s.intervalMs > 33.3).length,
      hiddenFrames: capture?.hiddenFrames ?? 0, droppedAuthoritySteps: capture?.droppedSteps ?? 0,
      drawCalls: distribution(samples.map(s => s.calls)), triangles: distribution(samples.map(s => s.triangles)),
      renderer: { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0, width: this.renderer.domElement.width, height: this.renderer.domElement.height, dpr: this.renderer.getPixelRatio(), gpu: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string, vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) as string : gl.getParameter(gl.VENDOR) as string },
      config: { districtRevision: this.district.revision, structuralParts: this.district.parts.length, colliderBoxes: this.district.colliders.length, fixedHz: 60, shadows: true, shadowMap: 1024, antialias: true, postprocessing: false },
      assets: this.content?.assets ?? null, webgpu: { ...this.webgpu, implementation: 'not evaluated; capability observation only' },
      authority: { tick: this.authority.tick, captureStartTick: capture?.startTick ?? null, pose: { ...this.authority.current } },
      controls: { ...this.controls, held: { ...this.input }, consumed: { ...this.stepInput }, stanceTransitions: this.stanceTransitions.map(t => ({ ...t })) },
      lastFrame: this.lastFrame, samples: samples.map(s => ({ ...s })),
    };
  }
  setInput(command: Partial<InputCommand>) {
    if (command.jump && !this.input.jump) { this.pendingJump = true; this.controls.jumpIntents++; }
    if (command.transform && !this.input.transform) { this.pendingTransform = true; this.controls.transformIntents++; }
    Object.assign(this.input, command);
  }
  reset() { this.authority.reset(); this.accumulator = 0; this.previousAt = 0; this.routeUntilTick = 0; this.cameraYaw = 0; this.cameraPitch = .35; this.pendingJump = false; this.pendingTransform = false; this.controls.resets++; this.stanceTransitions = []; Object.assign(this.input, emptyInput()); }
  route(seconds = 30) { this.reset(); this.routeStartTick = this.authority.tick; this.routeUntilTick = this.authority.tick + Math.round(Math.max(1, Math.min(300, seconds)) * 60); return this.start('matched-route'); }
  setCamera(yaw: number, pitch = this.cameraPitch) { if (Number.isFinite(yaw)) this.cameraYaw = yaw; if (Number.isFinite(pitch)) this.cameraPitch = Math.max(.08, Math.min(1.15, pitch)); }
  get routeActive() { return this.routeUntilTick > this.authority.tick; }
  status() { return { harnessRevision: BENCHMARK_REVISION, ready: this.ready, error: this.error, capturing: !!this.capture, frames: this.capture?.samples.length ?? 0, tick: this.authority.tick, pose: { ...this.authority.current }, input: { ...this.input }, controls: { ...this.controls, pendingJump: this.pendingJump, pendingTransform: this.pendingTransform, acceptedStanceTransitions: this.stanceTransitions.length }, lastFrame: this.lastFrame, routeActive: this.routeActive }; }
  private installInput() {
    const keys: Record<string, keyof InputCommand> = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', Space: 'jump', KeyR: 'transform' };
    let dragging = false;
    const onKey = (event: KeyboardEvent) => {
      const key = keys[event.code];
      if (key) { event.preventDefault(); if (event.type === 'keydown') this.controls.keyDownEvents++; this.setInput({ [key]: event.type === 'keydown' }); this.routeUntilTick = 0; }
      if (event.code === 'KeyQ' && event.type === 'keydown' && !event.repeat) { this.cameraYaw += Math.PI / 2; this.routeUntilTick = 0; }
    };
    const onBlur = () => { Object.assign(this.input, emptyInput()); this.pendingJump = false; this.pendingTransform = false; dragging = false; };
    const onDown = (event: PointerEvent) => { if (event.button === 0) { dragging = true; this.renderer.domElement.setPointerCapture(event.pointerId); } };
    const onUp = () => { dragging = false; };
    const onMove = (event: PointerEvent) => { if (dragging) this.setCamera(this.cameraYaw - event.movementX * .006, this.cameraPitch + event.movementY * .004); };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur);
    const canvas = this.renderer.domElement; canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointermove', onMove);
    this.removeListeners = () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointermove', onMove); };
  }
  dispose() { this.disposed = true; this.ready = false; this.removeListeners?.(); this.content?.dispose(); this.content = null; this.renderer.info.autoReset = true; }
}
export type BenchmarkReport = ReturnType<BenchmarkRuntime['snapshot']>;
