# 🧩 WebGPU + bitECS + Comlink

An exploration of data-oriented ECS patterns on the CPU with WebGPU rendering.

## 🚀 Key Features
- **bitECS & SoA**: Efficient entity management with Structure-of-Arrays data.
- **Worker Thread**: Running the ECS logic on a separate thread.
- **Comlink & SAB**: Syncing state with the main thread via SharedArrayBuffer.
- **WebGPU Pipeline**: Rendering ECS data directly from the GPU.

## 🏃 Running Locally
\`\`\`bash
# From the root directory
bun dev --filter webgpu-bitecs
\`\`\`
