import tgpu, { d } from 'typegpu';

// 1. Define the Particle schema in TypeScript.
// TypeGPU handles all WGSL memory alignment (std140/std430) automatically.
const Particle = d.struct({
  pos: d.vec2f, // 8 bytes
  velocity: d.vec2f, // 8 bytes
  color: d.vec4f, // 16 bytes
  size: d.f32, // 4 bytes
  // NO MANUAL PADDING NEEDED! TypeGPU knows that size needs padding in a struct array.
});

// 2. Infer TypeScript type from the schema for easy usage in our code.
type ParticleType = d.Infer<typeof Particle>;

const PARTICLE_COUNT = 1000;

const logOutput = (
  text: string,
  type: 'info' | 'success' | 'highlight' = 'info',
) => {
  const el = document.getElementById('output');
  if (el) {
    const div = document.createElement('div');
    div.className = type;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    el.appendChild(div);
  }
};

async function runCompute() {
  logOutput('Initializing TypeGPU root...', 'info');

  // Initialize TypeGPU (wrapper around WebGPU)
  const root = await tgpu.init();
  if (!root) {
    logOutput(
      'TypeGPU failed to initialize (WebGPU not supported?).',
      'highlight',
    );
    return;
  }

  // 3. Create a data-driven storage buffer.
  // TypeGPU manages the layout automatically.
  const initialData: ParticleType[] = Array.from(
    { length: PARTICLE_COUNT },
    () => ({
      pos: d.vec2f(Math.random() * 2 - 1, Math.random() * 2 - 1),
      velocity: d.vec2f(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
      ),
      color: d.vec4f(1, 1, 0, 1),
      size: Math.random() * 0.05 + 0.01,
    }),
  );

  const particleBuffer = root
    .createBuffer(d.arrayOf(Particle, PARTICLE_COUNT), initialData)
    .$usage('storage');

  logOutput(
    `Created storage buffer for ${PARTICLE_COUNT} particles automatically.`,
    'info',
  );

  const particles = particleBuffer.as('mutable');

  // 4. Define the compute logic directly in TypeScript!
  // TypeGPU will translate this into optimized WGSL code.
  const computeFn = (index: number) => {
    'use gpu'; // Special directive to tell TypeGPU this function runs on GPU

    // Automatic bounds checking is handled when we use dispatchThreads
    const p = particles.$[index];

    // Natural TypeScript-like syntax for GPU math
    // We update the properties of 'p' directly. Since 'p' is a reference
    // to the buffer element, these changes are reflected in the buffer.
    p.pos = p.pos.add(p.velocity);
    p.size = p.size * 0.99;

    // Accessing components with .r or .x works as expected
    p.color.r = (p.pos.x + 1.0) / 2.0;
  };

  // 5. Create and dispatch the compute task
  logOutput('Dispatching TypeGPU compute task...', 'info');

  // TypeGPU automatically creates the pipeline, bind groups, and shader code.
  // The 'guarded' version handles bounds checking automatically.
  const pipeline = root['~unstable'].createGuardedComputePipeline(computeFn);

  pipeline.dispatchThreads(PARTICLE_COUNT);

  // 6. Read results back easily
  logOutput('Reading results back from GPU...', 'info');

  const results = await particleBuffer.read();

  logOutput(`Compute results for Particle 0:`, 'success');
  logOutput(
    `  Old Pos: (${initialData[0].pos.x.toFixed(4)}, ${initialData[0].pos.y.toFixed(4)})`,
    'info',
  );
  logOutput(
    `  New Pos: (${results[0].pos.x.toFixed(4)}, ${results[0].pos.y.toFixed(4)})`,
    'success',
  );
  logOutput(`  New Color (R): ${results[0].color.r.toFixed(4)}`, 'success');
  logOutput(`  New Size: ${results[0].size.toFixed(4)}`, 'highlight');

  logOutput('\nADVANTAGES SHOWN:', 'highlight');
  logOutput('1. ZERO manual padding (no more counting bytes!).', 'success');
  logOutput(
    '2. Shaders written in TypeScript with full IDE support.',
    'success',
  );
  logOutput(
    '3. Automatic buffer layout matching between CPU and GPU.',
    'success',
  );
  logOutput(
    '4. High-level vector operations (add, mul) like in GLSL/WGSL.',
    'success',
  );
}

document.getElementById('run')?.addEventListener('click', runCompute);
