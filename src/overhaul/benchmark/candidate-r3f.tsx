import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { BenchmarkRuntime } from './runtime';

function Driver({ modelUrl, expose }: { modelUrl: string; expose: (runtime: BenchmarkRuntime) => void }) {
  const { gl, scene, camera } = useThree(), owner = useRef<BenchmarkRuntime | null>(null);
  useEffect(() => {
    const runtime = new BenchmarkRuntime('r3f', gl, scene, camera as PerspectiveCamera, modelUrl); owner.current = runtime;
    expose(runtime); void runtime.initialize();
    return () => { owner.current = null; runtime.dispose(); };
  }, [gl, scene, camera, modelUrl, expose]);
  // Explicit render ownership prevents double drawing, and keeps snapshot,
  // animation, camera and completed-frame metrics in the same order as Three.
  useFrame(() => owner.current?.frame(performance.now()), 1);
  return null;
}
export function mount(host: HTMLElement, modelUrl: string, expose: (runtime: BenchmarkRuntime) => void): () => void {
  const root = createRoot(host);
  root.render(<Canvas dpr={1} shadows camera={{ fov: 62, near: .1, far: 850 }} gl={{ antialias: true, powerPreference: 'high-performance' }}><Driver modelUrl={modelUrl} expose={expose}/></Canvas>);
  return () => root.unmount();
}
