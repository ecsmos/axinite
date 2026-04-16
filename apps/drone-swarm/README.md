# 🛸 Axinite: 100k Drone Swarm

A high-performance simulation of 100,000 drones using **bitECS** and **WebGPU**.

## 🚀 Key Features
- **100,000 Entities**: Managed efficiently with **bitECS** (SoA layout).
- **WebGPU Instancing**: Rendering massive amounts of objects in a single draw call.
- **SharedArrayBuffer**: Real-time state updates across workers.
- **GPU Compute**: Update drone physics on the GPU for maximum throughput.

## 🏃 Running Locally
\`\`\`bash
# From the root directory
bun dev --filter drone-swarm
\`\`\`
