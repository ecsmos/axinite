import shaderCode from './shader.wgsl?raw';

/**
 * MANUAL MEMORY MANAGEMENT CHALLENGE:
 * WGSL Struct Alignment Rules (std140-like):
 * - vec2f (8 bytes) must be aligned to 8-byte boundaries.
 * - vec4f (16 bytes) must be aligned to 16-byte boundaries.
 * - Structs are aligned to the largest alignment of its members (here, 16).
 * - Total struct size must be a multiple of its alignment (here, 16).
 * 
 * TypeScript ArrayBuffer doesn't know about these rules automatically!
 * We must manually calculate offsets or use padding.
 */

interface Particle {
  pos: [number, number];      // 8 bytes (offset 0)
  velocity: [number, number]; // 8 bytes (offset 8)
  color: [number, number, number, number]; // 16 bytes (offset 16)
  size: number;               // 4 bytes (offset 32)
  // --- Manual Padding Required here! ---
  // Offset 36 to 48 (12 bytes) must be empty to align to 16 bytes.
}

// Particle size in Float32 elements:
// (0-7): pos(2), velocity(2), color(4)
// (8): size(1)
// (9-11): PADDING(3)
const PARTICLE_FLOAT_SIZE = 12; // 48 bytes total
const PARTICLE_COUNT = 1000;

const logOutput = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const el = document.getElementById('output');
  if (el) {
    const span = document.createElement('span');
    span.className = type;
    span.innerText = `[${new Date().toLocaleTimeString()}] ${text}\n`;
    el.appendChild(span);
  }
};

async function runCompute() {
  logOutput("Initializing WebGPU...", "info");
  
  if (!navigator.gpu) {
    logOutput("WebGPU not supported.", "error");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    logOutput("No GPU Adapter.", "error");
    return;
  }

  const device = await adapter.requestDevice();

  // Create manual buffer data (Float32Array)
  const bufferData = new Float32Array(PARTICLE_COUNT * PARTICLE_FLOAT_SIZE);
  
  // Fill initial data
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const offset = i * PARTICLE_FLOAT_SIZE;
    
    // pos
    bufferData[offset + 0] = Math.random() * 2 - 1; // x
    bufferData[offset + 1] = Math.random() * 2 - 1; // y
    
    // velocity
    bufferData[offset + 2] = (Math.random() - 0.5) * 0.01; // vx
    bufferData[offset + 3] = (Math.random() - 0.5) * 0.01; // vy
    
    // color (RGBA)
    bufferData[offset + 4] = 1.0; // r
    bufferData[offset + 5] = 1.0; // g
    bufferData[offset + 6] = 0.0; // b
    bufferData[offset + 7] = 1.0; // a
    
    // size
    bufferData[offset + 8] = Math.random() * 0.05 + 0.01;
    
    // PADDING: offset 9, 10, 11 are left as 0.0 (uninitialized)
    // CRITICAL: If we skip these 3 floats, our indexing for the NEXT particle will be wrong!
  }

  logOutput(`Created buffer for ${PARTICLE_COUNT} particles (${bufferData.byteLength} bytes).`, "info");

  // Create the GPU storage buffer
  const particleBuffer = device.createBuffer({
    label: 'Particle Storage Buffer',
    size: bufferData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  // Upload data to GPU
  device.queue.writeBuffer(particleBuffer, 0, bufferData);

  // Set up the compute pipeline
  const shaderModule = device.createShaderModule({
    label: 'Compute Shader Module',
    code: shaderCode,
  });

  const pipeline = device.createComputePipeline({
    label: 'Compute Pipeline',
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'update',
    },
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    label: 'Compute Bind Group',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: particleBuffer },
      },
    ],
  });

  // Run the compute shader
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  
  const workgroupCount = Math.ceil(PARTICLE_COUNT / 64);
  passEncoder.dispatchWorkgroups(workgroupCount);
  passEncoder.end();

  // Create a staging buffer to read back results
  const stagingBuffer = device.createBuffer({
    label: 'Staging Buffer',
    size: bufferData.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // Copy results from GPU back to staging buffer
  commandEncoder.copyBufferToBuffer(
    particleBuffer, 0, 
    stagingBuffer, 0, 
    bufferData.byteLength
  );

  device.queue.submit([commandEncoder.finish()]);
  logOutput(`Submitted compute commands with ${workgroupCount} workgroups.`, "info");

  // Map buffer to read it in CPU
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const resultData = new Float32Array(stagingBuffer.getMappedRange());
  
  // Check first particle results
  logOutput(`Compute results for Particle 0:`, "success");
  logOutput(`  Old Pos: (${bufferData[0].toFixed(4)}, ${bufferData[1].toFixed(4)})`, "info");
  logOutput(`  New Pos: (${resultData[0].toFixed(4)}, ${resultData[1].toFixed(4)})`, "success");
  logOutput(`  New Color (R): ${resultData[4].toFixed(4)}`, "success");
  logOutput(`  New Size: ${resultData[8].toFixed(4)}`, "warning");

  stagingBuffer.unmap();
  logOutput("Compute finished successfully.", "success");
  logOutput("\nPROBLEM HIGHLIGHTED:", "warning");
  logOutput("1. We had to manually insert 12 bytes of padding (3 floats) per particle.", "warning");
  logOutput("2. We had to manually calculate 'PARTICLE_FLOAT_SIZE = 12'.", "warning");
  logOutput("3. If WGSL struct changes, all TypeScript buffer offsets will BREAK.", "error");
  logOutput("TypeGPU solves this by generating these buffers automatically from a schema!", "success");
}

document.getElementById('run')?.addEventListener('click', runCompute);
