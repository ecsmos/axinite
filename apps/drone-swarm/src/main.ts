import * as Comlink from 'comlink';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TSL from 'three/tsl';
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer,
} from 'three/webgpu';
import tgpu from 'typegpu';
import { createSharedBuffers, MAX_DRONES } from './types';
import type { DroneWorkerApi } from './worker';

async function init() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.addEventListener(
    'click',
    async () => {
      overlay.style.display = 'none';
      await startSwarm();
    },
    { once: true },
  );
}

async function startSwarm() {
  // 0. Initialize TypeGPU
  await tgpu.init();

  // 1. Setup Three.js WebGPU Renderer
  const container = document.getElementById('app');
  if (!container) return;

  const renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  );
  camera.position.set(300, 200, 300);
  camera.lookAt(0, 50, 0);

  // Add OrbitControls for user interaction
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 5;
  controls.maxDistance = 1500;

  // Add a grid for orientation
  const grid = new THREE.GridHelper(400, 40, 0x444444, 0x222222);
  scene.add(grid);

  // 2. Initialize Geometry
  const geometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);

  // 3. Initialize Shared Data & Worker
  const shared = createSharedBuffers();
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });
  const workerApi = Comlink.wrap<DroneWorkerApi>(worker);
  await workerApi.init(shared);

  // 4. Create the "Buffer Bridge" using Storage Buffers
  const posAttribute = new StorageInstancedBufferAttribute(shared.position, 1);
  const phaseAttribute = new StorageInstancedBufferAttribute(shared.phase, 1);
  const modeAttribute = new StorageInstancedBufferAttribute(shared.mode, 1);

  // 5. Build Material with TSL
  const material = new MeshBasicNodeMaterial();

  const count = TSL.uint(MAX_DRONES);
  const instancePos = TSL.vec3(
    TSL.storage(posAttribute, 'float', MAX_DRONES * 3).element(
      TSL.instanceIndex,
    ),
    TSL.storage(posAttribute, 'float', MAX_DRONES * 3).element(
      TSL.instanceIndex.add(count),
    ),
    TSL.storage(posAttribute, 'float', MAX_DRONES * 3).element(
      TSL.instanceIndex.add(count.mul(2)),
    ),
  );
  const instancePhase = TSL.storage(
    phaseAttribute,
    'float',
    MAX_DRONES,
  ).element(TSL.instanceIndex);
  const instanceMode = TSL.storage(modeAttribute, 'uint', MAX_DRONES).element(
    TSL.instanceIndex,
  );

  const tsl = TSL as any;
  const localPos =
    tsl.positionLocal || tsl.positionGeometry || tsl.attribute('position');

  // Custom wiggle that uses unique phase for each drone
  const uniqueTime = TSL.time.add(instancePhase);
  material.positionNode = localPos
    .add(instancePos)
    .add(TSL.vec3(0, TSL.sin(uniqueTime).mul(1.0), 0));

  // Unique colors based on mode
  const cyan = TSL.color(0x00ffff);
  const magenta = TSL.color(0xff00ff);
  const yellow = TSL.color(0xffff00);

  const baseColor = tsl.select(
    instanceMode.equal(0),
    cyan,
    tsl.select(instanceMode.equal(1), magenta, yellow),
  );

  // VITAL FIX: WGSL sin() only accepts floats.
  // We must explicitly cast instanceIndex (u32) to float (f32) before calling sin().
  const indexFloat = TSL.float(TSL.instanceIndex);

  const varR = TSL.sin(indexFloat.mul(1234.567)).mul(0.2);
  const varG = TSL.sin(indexFloat.mul(5678.901)).mul(0.2);
  const varB = TSL.sin(indexFloat.mul(9012.345)).mul(0.2);

  const finalBaseColor = baseColor.add(TSL.vec3(varR, varG, varB));

  // Unique blinking phase and speed for each drone
  const blinkSeed = TSL.sin(indexFloat.mul(4321.123));
  const blinkSpeed = blinkSeed.mul(2.0).add(3.0);
  const blink = TSL.oscSine(
    TSL.time.mul(blinkSpeed).add(instancePhase.mul(10.0)),
  );

  material.colorNode = finalBaseColor.mul(blink);

  // 6. Spawn the Mesh
  const mesh = new THREE.InstancedMesh(geometry, material, MAX_DRONES);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // 7. Loop
  const fpsEl = document.getElementById('fps');
  let lastTime = performance.now();
  let frames = 0;
  let lastFpsUpdate = lastTime;
  let isUpdating = false;

  renderer.setAnimationLoop(async () => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Update controls
    controls.update();

    if (!isUpdating) {
      isUpdating = true;
      workerApi.update(dt).then(() => {
        isUpdating = false;
        posAttribute.needsUpdate = true;
      });
    }

    renderer.render(scene, camera);

    frames++;
    if (now - lastFpsUpdate > 1000) {
      if (fpsEl) fpsEl.textContent = frames.toString();
      frames = 0;
      lastFpsUpdate = now;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
