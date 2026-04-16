(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`// Layout of Particle struct in WGSL (Manual Alignment Required):
// | Field    | Type   | Align | Size | Offset |
// |----------|--------|-------|------|--------|
// | pos      | vec2f  | 8     | 8    | 0      |
// | velocity | vec2f  | 8     | 8    | 8      |
// | color    | vec4f  | 16    | 16   | 16     |
// | size     | f32    | 4     | 4    | 32     |
// | PADDING  | -      | -     | 12   | 36     | <-- Required to reach total size of 48 (multiple of 16)
// Total Size: 48 bytes

struct Particle {
  pos      : vec2f,
  velocity : vec2f,
  color    : vec4f,
  size     : f32,
}

// Storage buffer for a list of particles
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn update(
  @builtin(global_invocation_id) global_id : vec3u
) {
  let index = global_id.x;
  
  // Guard against out-of-bounds
  if (index >= arrayLength(&particles)) {
    return;
  }

  // Basic "physics" simulation
  particles[index].pos += particles[index].velocity;
  
  // Shrink over time
  particles[index].size *= 0.99;

  // Change color slightly based on position
  particles[index].color.r = (particles[index].pos.x + 1.0) / 2.0;
}
`,t=12,n=1e3,r=(e,t=`info`)=>{let n=document.getElementById(`output`);if(n){let r=document.createElement(`span`);r.className=t,r.innerText=`[${new Date().toLocaleTimeString()}] ${e}\n`,n.appendChild(r)}};async function i(){if(r(`Initializing WebGPU...`,`info`),!navigator.gpu){r(`WebGPU not supported.`,`error`);return}let i=await navigator.gpu.requestAdapter();if(!i){r(`No GPU Adapter.`,`error`);return}let a=await i.requestDevice(),o=new Float32Array(n*t);for(let e=0;e<n;e++){let n=e*t;o[n+0]=Math.random()*2-1,o[n+1]=Math.random()*2-1,o[n+2]=(Math.random()-.5)*.01,o[n+3]=(Math.random()-.5)*.01,o[n+4]=1,o[n+5]=1,o[n+6]=0,o[n+7]=1,o[n+8]=Math.random()*.05+.01}r(`Created buffer for ${n} particles (${o.byteLength} bytes).`,`info`);let s=a.createBuffer({label:`Particle Storage Buffer`,size:o.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});a.queue.writeBuffer(s,0,o);let c=a.createShaderModule({label:`Compute Shader Module`,code:e}),l=a.createComputePipeline({label:`Compute Pipeline`,layout:`auto`,compute:{module:c,entryPoint:`update`}}),u=a.createBindGroup({label:`Compute Bind Group`,layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:s}}]}),d=a.createCommandEncoder(),f=d.beginComputePass();f.setPipeline(l),f.setBindGroup(0,u);let p=Math.ceil(n/64);f.dispatchWorkgroups(p),f.end();let m=a.createBuffer({label:`Staging Buffer`,size:o.byteLength,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});d.copyBufferToBuffer(s,0,m,0,o.byteLength),a.queue.submit([d.finish()]),r(`Submitted compute commands with ${p} workgroups.`,`info`),await m.mapAsync(GPUMapMode.READ);let h=new Float32Array(m.getMappedRange());r(`Compute results for Particle 0:`,`success`),r(`  Old Pos: (${o[0].toFixed(4)}, ${o[1].toFixed(4)})`,`info`),r(`  New Pos: (${h[0].toFixed(4)}, ${h[1].toFixed(4)})`,`success`),r(`  New Color (R): ${h[4].toFixed(4)}`,`success`),r(`  New Size: ${h[8].toFixed(4)}`,`warning`),m.unmap(),r(`Compute finished successfully.`,`success`),r(`
PROBLEM HIGHLIGHTED:`,`warning`),r(`1. We had to manually insert 12 bytes of padding (3 floats) per particle.`,`warning`),r(`2. We had to manually calculate 'PARTICLE_FLOAT_SIZE = 12'.`,`warning`),r(`3. If WGSL struct changes, all TypeScript buffer offsets will BREAK.`,`error`),r(`TypeGPU solves this by generating these buffers automatically from a schema!`,`success`)}document.getElementById(`run`)?.addEventListener(`click`,i);