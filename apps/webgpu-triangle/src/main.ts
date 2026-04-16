import shaderCode from './shader.wgsl?raw';

/**
 * Main initialization function for the WebGPU application
 */
async function init() {
  // Check if WebGPU is supported by the browser
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported on this browser.');
  }

  // Request a GPU adapter
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No appropriate GPUAdapter found.');
  }

  // Request a GPU device from the adapter
  const device = await adapter.requestDevice();

  // Get the canvas element and its WebGPU context
  const canvas = document.querySelector('#c') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found.');
  }

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('WebGPU context not found.');
  }

  // Configure the canvas context
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // Create a shader module from the imported WGSL code
  const shaderModule = device.createShaderModule({
    label: 'Triangle Shader',
    code: shaderCode,
  });

  // Create the render pipeline
  const pipeline = device.createRenderPipeline({
    label: 'Triangle Render Pipeline',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  /**
   * Main render loop
   */
  function startRender(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
  ) {
    function render() {
      // Create a command encoder and get the current texture view
      const commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();

      // Define the render pass descriptor
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      };

      // Begin the render pass and execute commands
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.draw(3);
      passEncoder.end();

      // Submit the command buffer to the GPU queue
      device.queue.submit([commandEncoder.finish()]);

      // Schedule the next frame
      requestAnimationFrame(render);
    }
    render();
  }

  // Handle canvas resizing to maintain correct aspect ratio and resolution
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(
        1,
        Math.min(width, device.limits.maxTextureDimension2D),
      );
      canvas.height = Math.max(
        1,
        Math.min(height, device.limits.maxTextureDimension2D),
      );
    }
  });
  observer.observe(canvas);

  // Start the render loop
  startRender(device, context, pipeline);
}

// Global error handling for the initialization process
init().catch((err) => {
  console.error(err);
  const info = document.querySelector('#info');
  if (info) {
    info.textContent = `WebGPU Error: ${err.message}`;
    const div = document.createElement('div');
    div.textContent =
      'Please check if WebGPU is enabled in your browser settings.';
    info.parentElement?.appendChild(div);
  }
});
