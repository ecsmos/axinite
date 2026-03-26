import { addComponent, addEntity, asBuffer, createWorld, query } from 'bitecs';
import * as Comlink from 'comlink';
import { createSharedComponentData, MAX_ENTITIES } from './types';
import type { WorkerApi } from './worker';

async function init() {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  appElement.style.cssText =
    'background: #111; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif;';

  appElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #222; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
      <h1 style="margin: 0 0 10px 0; font-size: 24px; color: cyan;">WebGPU-bitECS Monorepo</h1>
      <p style="margin: 0 0 20px 0; color: #888;">CPU-side memory management using bitECS + SharedArrayBuffer + Comlink</p>
      <canvas id="canvas" width="800" height="600" style="background: #000; border: 1px solid #444; border-radius: 4px; display: block;"></canvas>
      <div id="stats" style="color: #0f0; font-family: monospace; margin-top: 15px; font-size: 14px;">Initializing...</div>
    </div>
  `;

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const statsElement = document.getElementById('stats');
  if (!statsElement) return;

  // 1. Initialize Shared Data
  // We use our own SAB-backed buffers that we'll share with the worker
  const sharedData = createSharedComponentData();

  // 2. Initialize Main Thread World
  const world = createWorld();

  const { Position, Velocity } = sharedData;

  // 3. Create Entities
  console.log(`Creating ${MAX_ENTITIES} entities...`);
  for (let i = 0; i < MAX_ENTITIES; i++) {
    const eid = addEntity(world);
    // In bitecs 0.4.0, we add the component objects to the entity
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);

    // Initial state
    Position.x[eid] = Math.random() * 800;
    Position.y[eid] = Math.random() * 600;
    Velocity.x[eid] = (Math.random() - 0.5) * 150;
    Velocity.y[eid] = (Math.random() - 0.5) * 150;
  }

  // 4. Setup Worker with Comlink
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });
  const workerApi = Comlink.wrap<WorkerApi>(worker);

  // Initialize worker with shared buffers
  await workerApi.init(sharedData);

  // 5. Cache the entity list for the worker
  // We use query with asBuffer to get a Uint32Array (SAB-backed if available, or just a copy)
  const entities = query(world, [Position, Velocity], asBuffer) as Uint32Array;

  // 6. Main Loop
  let lastTime = performance.now();
  let frames = 0;
  let lastFpsTime = lastTime;
  let fps = 0;

  function loop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    frames++;
    if (now - lastFpsTime > 1000) {
      fps = frames;
      frames = 0;
      lastFpsTime = now;
    }

    // Process ECS update in WORKER
    // Since we're using SharedArrayBuffer, the worker writes directly to the same memory
    workerApi.update(dt, entities).then(() => {
      if (!ctx || !statsElement) return;
      // Render in MAIN thread (reading from SharedArrayBuffer)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0ff';

      // Draw a subset for performance
      const drawCount = Math.min(entities.length, 5000);
      for (let i = 0; i < drawCount; i++) {
        const eid = entities[i];
        ctx.fillRect(Position.x[eid], Position.y[eid], 2, 2);
      }

      statsElement.innerText = `Total Entities: ${MAX_ENTITIES} | Drawing: 5000 | Worker CPU: OK | FPS: ${fps}`;

      requestAnimationFrame(loop);
    });
  }

  requestAnimationFrame(loop);
}

init();
