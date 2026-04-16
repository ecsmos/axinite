# Axinite Monorepo 💎

[**Live Portfolio**](https://ecsmos.github.io/axinite/)

Monorepo on \`bun\` + \`turborepo\`, frontends on \`vite\`, formatting/linting via \`biome\`.

Project goal: collect the evolution of WebGPU/TypeGPU infrastructure and package the final showcase as a portfolio.

## 🌟 Portfolio Overview

This repository is structured as a laboratory for high-performance web graphics, showcasing a journey from basic WebGPU rendering to complex GPU compute and ECS-based asset pipelines.

## 🛠️ Tech Stack

- **Core Engine**: [WebGPU](https://gpuweb.github.io/gpuweb/) — Modern low-level graphics API.
- **GPU Logic**: [TypeGPU](https://typegpu.com/) — Type-safe GPU programming and memory management.
- **ECS Engine**: [BitECS](https://github.com/NateTheGreatt/bitECS) — Data-oriented ECS for massive entity simulations.
- **Framework**: [Three.js](https://threejs.org/) — Integration with the modern Three.js WebGPU renderer.
- **Tooling**: [Turbo](https://turbo.build/) + [Bun](https://bun.sh/) — Fast monorepo management.

## 📂 Project Structure

\`\`\`bash
axinite/
├── apps/
│   ├── gltf-typegpu-ecs/  # 💎 Final Portfolio Piece: glTF + GPU Compute + ECS
│   ├── drone-swarm/       # 🛸 100k Drone Swarm (WebGPU + bitECS)
│   ├── webgpu-typegpu/    # ⚡ Type-safe GPU logic with TypeGPU
│   ├── webgpu-bitecs/     # 🧩 ECS on CPU + WebGPU rendering
│   ├── webgpu-compute/    # 🧮 Manual compute pass experiments
│   ├── webgpu-triangle/   # 🔺 Basic WebGPU foundation
│   ├── demo/              # 🎬 Three.js WebGPU integration
│   └── asset-test/        # 📦 Pipeline for runtime asset loading
├── packages/              # Shared packages (gltf-ecs, assets)
└── README.md              # This documentation
\`\`\`

## 🧪 Experiments Journey

### 1. [GLTF Showcase](https://ecsmos.github.io/axinite/gltf-typegpu-ecs/) (Final)
The ultimate showcase combining GPU compute, bitECS, and a custom glTF asset preparation pipeline.
- **Focus**: High-end rendering and complex data management.

### 2. [100k Drone Swarm](https://ecsmos.github.io/axinite/drone-swarm/)
Simulating and rendering 100,000 drones in real-time.
- **Focus**: WebGPU instancing and massive SoA state management.

### 3. [TypeGPU Basics](https://ecsmos.github.io/axinite/webgpu-typegpu/)
Learning the power of type-safe GPU programming.
- **Focus**: Automated memory layouts and type-safe WGSL.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.1.0 or higher)
- A browser with [WebGPU support](https://caniuse.com/webgpu) (Chrome 113+, Edge 113+)

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/ecsmos/axinite.git
cd axinite

# Install dependencies
bun install
\`\`\`

### Running Locally

\`\`\`bash
# Start all projects in development mode
bun dev

# Run a specific experiment
bun dev --filter drone-swarm
\`\`\`

## 📜 License

This project is licensed under the MIT License.
