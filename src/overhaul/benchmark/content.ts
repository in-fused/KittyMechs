import { AnimationMixer, Box3, BoxGeometry, Color, DirectionalLight, FogExp2, Group, HemisphereLight, InstancedMesh, LoopOnce, Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3, type AnimationAction, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BenchmarkAuthority } from './authority';
import { MATERIALS, type CompiledDistrict } from './district';

interface ActorVisual { root: Group; mixer: AnimationMixer; idle?: AnimationAction; walk?: AnimationAction; uprightIdle?: AnimationAction; uprightWalk?: AnimationAction; transformUp?: AnimationAction; transformDown?: AnimationAction }
export interface ContentOwner { present(alpha: number, dt: number, cameraYaw: number, cameraPitch: number): void; dispose(): void; assets: { url: string; actors: number; clips: string[]; meshesPerActor: number; modelFloorOffset: number } }
export async function createContent(scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer, district: CompiledDistrict, authority: BenchmarkAuthority, modelUrl: string): Promise<ContentOwner> {
  const group = new Group(); group.name = 'shared-benchmark-content'; scene.add(group);
  scene.background = new Color('#839cad'); scene.fog = new FogExp2('#839cad', .004);
  const hemi = new HemisphereLight('#d9edf7', '#59634c', 2.0); group.add(hemi);
  const sun = new DirectionalLight('#fff1db', 3.0); sun.position.set(-35, 70, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 180 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .06; sun.shadow.bias = -.0002; group.add(sun, sun.target);
  const geometry = new BoxGeometry(1, 1, 1), groundGeometry = new PlaneGeometry(250, 250);
  const materials = Object.fromEntries(Object.entries(MATERIALS).map(([id, m]) => [id, new MeshStandardMaterial(m)]));
  const groundMaterial = new MeshStandardMaterial({ color: '#566267', roughness: .94 });
  const ground = new Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const transform = new Matrix4();
  for (const material of Object.keys(MATERIALS)) {
    const parts = district.parts.filter(p => p.material === material);
    const instances = new InstancedMesh(geometry, materials[material], parts.length); instances.name = `structural-${material}`;
    instances.castShadow = true; instances.receiveShadow = true;
    parts.forEach((p, i) => { transform.makeScale(...p.size); transform.setPosition(...p.center); instances.setMatrixAt(i, transform); });
    instances.computeBoundingSphere(); group.add(instances);
  }
  let gltf;
  try { gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(modelUrl); }
  catch (error) { group.removeFromParent(); geometry.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); Object.values(materials).forEach(m => m.dispose()); sun.shadow.dispose(); throw error; }
  const bounds = new Box3().setFromObject(gltf.scene), floorOffset = -bounds.min.y * .8;
  const actors: ActorVisual[] = [];
  let meshesPerActor = 0;
  gltf.scene.traverse(o => { if (o instanceof Mesh) meshesPerActor++; });
  for (let i = 0; i < 8; i++) {
    const root = new Group(), carrier = new Group(), model = clone(gltf.scene);
    carrier.rotation.y = Math.PI; carrier.scale.setScalar(.8); carrier.position.y = floorOffset;
    model.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    carrier.add(model); root.add(carrier); group.add(root);
    const mixer = new AnimationMixer(model);
    const idleClip = gltf.animations.find(c => c.name === 'FelineIdle') ?? gltf.animations[0];
    const walkClip = gltf.animations.find(c => c.name === 'FelineWalk');
    const idle = idleClip ? mixer.clipAction(idleClip).play() : undefined;
    const walk = walkClip ? mixer.clipAction(walkClip).setEffectiveWeight(0).play() : undefined;
    const action = (name: string, transition = false) => {
      const clip = gltf.animations.find(c => c.name === name); if (!clip) return undefined;
      const result = mixer.clipAction(clip).setEffectiveWeight(0).play();
      if (transition) { result.setLoop(LoopOnce, 1); result.clampWhenFinished = true; result.paused = true; }
      return result;
    };
    actors.push({ root, mixer, idle, walk, uprightIdle: action('FelineUprightIdle'), uprightWalk: action('FelineUprightWalk'), transformUp: action('FelineTransformUp', true), transformDown: action('FelineTransformDown', true) });
  }
  const target = new Vector3(), eye = new Vector3();
  return {
    assets: { url: modelUrl, actors: actors.length, clips: gltf.animations.map(c => c.name), meshesPerActor, modelFloorOffset: floorOffset },
    present(alpha, dt, cameraYaw, cameraPitch) {
      const p = authority.current, prev = authority.previous;
      const x = prev.x + (p.x - prev.x) * alpha, y = prev.y + (p.y - prev.y) * alpha, z = prev.z + (p.z - prev.z) * alpha;
      const time = (authority.tick - 1 + alpha) / 60;
      actors.forEach((actor, i) => {
        if (i === 0) { actor.root.position.set(x, y, z); actor.root.rotation.y = p.yaw; }
        else { const t = time * .2 + i * Math.PI * 2 / 7, radius = 5 + i * .3; actor.root.position.set(Math.cos(t) * radius, 0, Math.sin(t) * radius - 5); actor.root.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t)); }
        const weight = i === 0 ? Math.min(1, p.speed / 4) : .65;
        const progress = i === 0 ? Math.max(0, Math.min(1, (time - p.stanceChangedAt) / .7)) : 1;
        const upright = i === 0 && p.stance === 'upright';
        const amount = upright ? progress : i === 0 && progress < 1 ? 1 - progress : 0;
        const transformWeight = progress < 1 ? Math.sin(progress * Math.PI) : 0;
        const baseWeight = 1 - transformWeight;
        actor.idle?.setEffectiveWeight((1 - weight) * (1 - amount) * baseWeight); actor.walk?.setEffectiveWeight(weight * (1 - amount) * baseWeight);
        actor.uprightIdle?.setEffectiveWeight((1 - weight) * amount * baseWeight); actor.uprightWalk?.setEffectiveWeight(weight * amount * baseWeight);
        actor.transformUp?.setEffectiveWeight(upright ? transformWeight : 0); actor.transformDown?.setEffectiveWeight(upright ? 0 : transformWeight);
        const transition = upright ? actor.transformUp : actor.transformDown;
        if (transition && progress < 1) transition.time = progress * transition.getClip().duration;
        actor.mixer.update(dt);
      });
      target.set(x, y + 2, z);
      eye.set(x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * 14, y + 2 + Math.sin(cameraPitch) * 14, z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * 14);
      camera.position.copy(eye); camera.lookAt(target);
      sun.position.set(x - 35, 70, z + 25); sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
      renderer.render(scene, camera);
    },
    dispose() {
      actors.forEach(actor => { actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.mixer.getRoot()); actor.root.traverse(o => { if ('skeleton' in o) (o as import('three').SkinnedMesh).skeleton.dispose(); }); });
      gltf.scene.traverse(o => { if (o instanceof Mesh) { o.geometry.dispose(); for (const material of Array.isArray(o.material) ? o.material : [o.material]) material.dispose(); } });
      group.traverse(o => { if (o instanceof InstancedMesh) o.dispose(); });
      group.removeFromParent(); geometry.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); Object.values(materials).forEach(m => m.dispose()); sun.shadow.dispose();
    },
  };
}
