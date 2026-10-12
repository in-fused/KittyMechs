import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { BenchmarkRuntime } from './runtime';

export function mount(host: HTMLElement, modelUrl: string, expose: (runtime: BenchmarkRuntime) => void): () => void {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const scene = new Scene(), camera = new PerspectiveCamera(62, 1, .1, 850);
  const runtime = new BenchmarkRuntime('three', renderer, scene, camera, modelUrl);
  host.append(renderer.domElement); expose(runtime); void runtime.initialize();
  const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  renderer.setAnimationLoop(() => runtime.frame(performance.now()));
  return () => { observer.disconnect(); renderer.setAnimationLoop(null); runtime.dispose(); renderer.dispose(); renderer.domElement.remove(); };
}
