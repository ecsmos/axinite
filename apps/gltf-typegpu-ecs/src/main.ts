import * as Comlink from 'comlink';
import tgpu, { d, std } from 'typegpu';
import { mat4 } from 'wgpu-matrix';

const COUNT = 1000;

const Vertex = d.struct({
  position: d.vec3f,
  color: d.vec4f,
});

const cubeVertices = [
  // Front face
  { position: d.vec3f(-1, -1, 1), color: d.vec4f(1, 0, 0, 1) },
  { position: d.vec3f(1, -1, 1), color: d.vec4f(1, 0, 0, 1) },
  { position: d.vec3f(1, 1, 1), color: d.vec4f(1, 0, 0, 1) },
  { position: d.vec3f(-1, 1, 1), color: d.vec4f(1, 0, 0, 1) },
  // Back face
  { position: d.vec3f(-1, -1, -1), color: d.vec4f(0, 1, 0, 1) },
  { position: d.vec3f(-1, 1, -1), color: d.vec4f(0, 1, 0, 1) },
  { position: d.vec3f(1, 1, -1), color: d.vec4f(0, 1, 0, 1) },
  { position: d.vec3f(1, -1, -1), color: d.vec4f(0, 1, 0, 1) },
  // Top face
  { position: d.vec3f(-1, 1, -1), color: d.vec4f(0, 0, 1, 1) },
  { position: d.vec3f(-1, 1, 1), color: d.vec4f(0, 0, 1, 1) },
  { position: d.vec3f(1, 1, 1), color: d.vec4f(0, 0, 1, 1) },
  { position: d.vec3f(1, 1, -1), color: d.vec4f(0, 0, 1, 1) },
  // Bottom face
  { position: d.vec3f(-1, -1, -1), color: d.vec4f(1, 1, 0, 1) },
  { position: d.vec3f(1, -1, -1), color: d.vec4f(1, 1, 0, 1) },
  { position: d.vec3f(1, -1, 1), color: d.vec4f(1, 1, 0, 1) },
  { position: d.vec3f(-1, -1, 1), color: d.vec4f(1, 1, 0, 1) },
  // Right face
  { position: d.vec3f(1, -1, -1), color: d.vec4f(1, 0, 1, 1) },
  { position: d.vec3f(1, 1, -1), color: d.vec4f(1, 0, 1, 1) },
  { position: d.vec3f(1, 1, 1), color: d.vec4f(1, 0, 1, 1) },
  { position: d.vec3f(1, -1, 1), color: d.vec4f(1, 0, 1, 1) },
  // Left face
  { position: d.vec3f(-1, -1, -1), color: d.vec4f(0, 1, 1, 1) },
  { position: d.vec3f(-1, -1, 1), color: d.vec4f(0, 1, 1, 1) },
  { position: d.vec3f(-1, 1, 1), color: d.vec4f(0, 1, 1, 1) },
  { position: d.vec3f(-1, 1, -1), color: d.vec4f(0, 1, 1, 1) },
];

const cubeIndices = [
  0,
  1,
  2,
  0,
  2,
  3, // front
  4,
  5,
  6,
  4,
  6,
  7, // back
  8,
  9,
  10,
  8,
  10,
  11, // top
  12,
  13,
  14,
  12,
  14,
  15, // bottom
  16,
  17,
  18,
  16,
  18,
  19, // right
  20,
  21,
  22,
  20,
  22,
  23, // left
];

const Params = d.struct({
  dt: d.f32,
  time: d.f32,
  attractorPos: d.vec3f,
});

const ComputeLayout = tgpu.bindGroupLayout({
  soaData: { storage: d.arrayOf(d.f32), access: 'mutable' },
  matrices: { storage: d.arrayOf(d.mat4x4f), access: 'mutable' },
  camera: { uniform: d.mat4x4f },
  params: { uniform: Params },
});

// SoA offsets
const POS_X = 0;
const POS_Y = 1;
const POS_Z = 2;
const ROT_X = 3;
const ROT_Y = 4;
const ROT_Z = 5;
const VEL_X = 6;
const VEL_Y = 7;
const VEL_Z = 8;

const rotationX = tgpu.fn(
  [d.f32],
  d.mat4x4f,
)((a) => {
  'use gpu';
  const c = std.cos(a);
  const s = std.sin(a);
  return d.mat4x4f(
    d.vec4f(1, 0, 0, 0),
    d.vec4f(0, c, s, 0),
    d.vec4f(0, std.mul(-1, s), c, 0),
    d.vec4f(0, 0, 0, 1),
  );
});
const rotationY = tgpu.fn(
  [d.f32],
  d.mat4x4f,
)((a) => {
  'use gpu';
  const c = std.cos(a);
  const s = std.sin(a);
  return d.mat4x4f(
    d.vec4f(c, 0, std.mul(-1, s), 0),
    d.vec4f(0, 1, 0, 0),
    d.vec4f(s, 0, c, 0),
    d.vec4f(0, 0, 0, 1),
  );
});
const rotationZ = tgpu.fn(
  [d.f32],
  d.mat4x4f,
)((a) => {
  'use gpu';
  const c = std.cos(a);
  const s = std.sin(a);
  return d.mat4x4f(
    d.vec4f(c, s, 0, 0),
    d.vec4f(std.mul(-1, s), c, 0, 0),
    d.vec4f(0, 0, 1, 0),
    d.vec4f(0, 0, 0, 1),
  );
});
const translation = tgpu.fn(
  [d.vec3f],
  d.mat4x4f,
)((t) => {
  'use gpu';
  return d.mat4x4f(
    d.vec4f(1, 0, 0, 0),
    d.vec4f(0, 1, 0, 0),
    d.vec4f(0, 0, 1, 0),
    d.vec4f(t.x, t.y, t.z, 1),
  );
});

const physicsCompute = (idx: number) => {
  'use gpu';
  if (idx >= COUNT) return;

  const params = ComputeLayout.$.params;
  const soa = ComputeLayout.$.soaData;
  const f_idx = d.f32(idx);

  const p = d.vec3f(
    soa[idx + POS_X * COUNT],
    soa[idx + POS_Y * COUNT],
    soa[idx + POS_Z * COUNT],
  );
  let v = d.vec3f(
    soa[idx + VEL_X * COUNT],
    soa[idx + VEL_Y * COUNT],
    soa[idx + VEL_Z * COUNT],
  );
  const r = d.vec3f(
    soa[idx + ROT_X * COUNT],
    soa[idx + ROT_Y * COUNT],
    soa[idx + ROT_Z * COUNT],
  );

  // 1. Bee Physics
  const toAttractor = std.sub(params.attractorPos, p);
  const dist = std.length(toAttractor);
  const dir = std.normalize(toAttractor);

  // --- Шум (хаотичное движение "пчелы") ---
  const noiseTime = params.time * 3.0;
  const noise = d.vec3f(
    std.sin(noiseTime + f_idx * 0.13),
    std.cos(noiseTime * 1.1 + f_idx * 0.17),
    std.sin(noiseTime * 0.9 + f_idx * 0.19),
  );

  // --- Силы ---
  // Притяжение: слабее, чем было, и зависит от дистанции мягко
  const pullStrength = std.min(dist * 2.0, d.f32(25.0));
  const attractionForce = std.mul(dir, pullStrength);

  // Хаотичная сила (рыскание)
  const wanderForce = std.mul(noise, d.f32(15.0));

  // Итоговая сила
  const force = std.add(attractionForce, wanderForce);

  // Применяем ускорение
  v = std.add(v, std.mul(force, params.dt));

  // --- Ограничение скорости (Bees have a speed limit) ---
  const maxSpeed = d.f32(15.0);
  const currentSpeed = std.length(v);
  if (currentSpeed > maxSpeed) {
    v = std.mul(std.normalize(v), maxSpeed);
  }

  // Трение (вязкость воздуха)
  v = std.mul(v, d.f32(0.96));

  const newP = std.add(p, std.mul(v, params.dt));

  // 2. Rotation: Пчелы немного "дрожат" и поворачиваются по скорости
  const newR = d.vec3f(
    r.x + params.dt * 5.0 + noise.x * 0.1,
    r.y + params.dt * 3.0 + noise.y * 0.1,
    r.z,
  );

  // Save back to SoA array
  soa[idx + POS_X * COUNT] = newP.x;
  soa[idx + POS_Y * COUNT] = newP.y;
  soa[idx + POS_Z * COUNT] = newP.z;
  soa[idx + VEL_X * COUNT] = v.x;
  soa[idx + VEL_Y * COUNT] = v.y;
  soa[idx + VEL_Z * COUNT] = v.z;
  soa[idx + ROT_X * COUNT] = newR.x;
  soa[idx + ROT_Y * COUNT] = newR.y;

  // 3. Matrix Generation
  const model = std.mul(
    translation(newP),
    std.mul(rotationZ(newR.z), std.mul(rotationY(newR.y), rotationX(newR.x))),
  );
  ComputeLayout.$.matrices[idx] = std.mul(ComputeLayout.$.camera, model);
};

const RenderLayout = tgpu.bindGroupLayout({
  matrices: { storage: d.arrayOf(d.mat4x4f) },
});

const vertexShader = tgpu.vertexFn({
  in: {
    position: d.vec3f,
    color: d.vec4f,
    instanceIdx: d.builtin.instanceIndex,
  },
  out: {
    canvasPosition: d.builtin.position,
    color: d.vec4f,
  },
})((input) => {
  'use gpu';
  const mvp = RenderLayout.$.matrices[input.instanceIdx];
  return {
    canvasPosition: std.mul(mvp, d.vec4f(input.position, 1)),
    color: input.color,
  };
});

const fragmentShader = tgpu.fragmentFn({
  in: { color: d.vec4f },
  out: d.vec4f,
})((input) => {
  'use gpu';
  return input.color;
});

interface WorkerApi {
  init(sab: SharedArrayBuffer, count: number): Promise<void>;
  update(dt: number): Promise<void>;
}

async function init() {
  const root = await tgpu.init();
  const canvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const sampleCount = 4;

  context.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // --- Worker & SAB Setup ---
  // SoA: 9 arrays (pos.xyz, rot.xyz, vel.xyz)
  const STRIDE = 9;
  const sab = new SharedArrayBuffer(COUNT * STRIDE * 4);
  const sabView = new Float32Array(sab);

  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });
  const workerApi = Comlink.wrap<WorkerApi>(worker);
  await workerApi.init(sab, COUNT);

  // --- WebGPU Resources ---
  const vertexLayout = tgpu.vertexLayout((n: number) => d.arrayOf(Vertex, n));
  const vertexBuffer = root
    .createBuffer(
      vertexLayout.schemaForCount(cubeVertices.length),
      cubeVertices,
    )
    .$usage('vertex');

  const indexBuffer = root
    .createBuffer(d.arrayOf(d.u16, cubeIndices.length), cubeIndices)
    .$usage('index');

  // Map the entire SAB to a single Storage Buffer (Zero-Copy)
  const soaBuffer = root
    .createBuffer(d.arrayOf(d.f32, COUNT * STRIDE), Array.from(sabView))
    .$usage('storage');

  const matricesBuffer = root
    .createBuffer(d.arrayOf(d.mat4x4f, COUNT))
    .$usage('storage');
  const cameraUniform = root.createBuffer(d.mat4x4f).$usage('uniform');
  const paramsBuffer = root.createBuffer(Params).$usage('uniform');

  const computePipeline =
    root['~unstable'].createGuardedComputePipeline(physicsCompute);
  const renderPipeline = root['~unstable']
    .withVertex(vertexShader, {
      position: vertexLayout.attrib.position,
      color: vertexLayout.attrib.color,
    })
    .withFragment(fragmentShader, { format: presentationFormat })
    .withMultisample({ count: sampleCount })
    .withDepthStencil({
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    })
    .createPipeline()
    .withIndexBuffer(indexBuffer);

  const computeBindGroup = root.createBindGroup(ComputeLayout, {
    soaData: soaBuffer,
    matrices: matricesBuffer,
    camera: cameraUniform,
    params: paramsBuffer,
  });

  const renderBindGroup = root.createBindGroup(RenderLayout, {
    matrices: matricesBuffer,
  });

  // --- Camera & Resize ---
  const projection = d.mat4x4f();
  const view = d.mat4x4f();
  const pv = d.mat4x4f();

  let depthTexture: GPUTexture;
  let multisampledTexture: GPUTexture;

  let yaw = 0;
  let pitch = 0;
  let distance = 80;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    depthTexture?.destroy();
    depthTexture = root.device.createTexture({
      size: [width, height, 1],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount,
    });

    multisampledTexture?.destroy();
    multisampledTexture = root.device.createTexture({
      size: [width, height, 1],
      format: presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount,
    });

    const aspect = width / height;
    mat4.perspective(Math.PI / 4, aspect, 0.1, 2000, projection);
  }

  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      yaw -= (e.clientX - lastMouseX) * 0.01;
      pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, pitch + (e.clientY - lastMouseY) * 0.01),
      );
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateAttractor(e.clientX, e.clientY);
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      distance = Math.max(10, Math.min(500, distance + e.deltaY * 0.1));
    },
    { passive: true },
  );

  let attractorPos = [0, 0, 0];
  function updateAttractor(mx: number, my: number) {
    const x = (mx / window.innerWidth) * 2 - 1;
    const y = -(my / window.innerHeight) * 2 + 1;
    // Simple projection to Z=0 for attractor
    attractorPos = [x * 50, y * 50, 0];
  }

  // --- Frame Loop ---
  let lastTime = performance.now();

  function frame(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    workerApi.update(dt); // Still called, though physics is on GPU

    paramsBuffer.write({
      dt,
      time: time / 1000,
      attractorPos: d.vec3f(attractorPos[0], attractorPos[1], attractorPos[2]),
    });

    const camX = distance * Math.sin(yaw) * Math.cos(pitch);
    const camY = distance * Math.sin(pitch);
    const camZ = distance * Math.cos(yaw) * Math.cos(pitch);
    mat4.lookAt([camX, camY, camZ], [0, 0, 0], [0, 1, 0], view);
    mat4.multiply(projection, view, pv);
    cameraUniform.write(pv);

    // Compute pass: Physics + Matrices (SoA)
    computePipeline.with(computeBindGroup).dispatchThreads(COUNT);

    // Render pass
    renderPipeline
      .withColorAttachment({
        view: multisampledTexture.createView(),
        resolveTarget: context.getCurrentTexture().createView(),
        clearValue: [0.02, 0.02, 0.05, 1],
        loadOp: 'clear',
        storeOp: 'store',
      })
      .withDepthStencilAttachment({
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      })
      .with(vertexLayout, vertexBuffer)
      .with(renderBindGroup)
      .drawIndexed(cubeIndices.length, COUNT);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

init();
