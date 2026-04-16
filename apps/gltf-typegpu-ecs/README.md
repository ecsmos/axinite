# 💎 Axinite: GLTF Showcase (Final Project)

The culmination of the Axinite experiments: a full pipeline for glTF assets with GPU compute and ECS.

## 🚀 Key Features
- **Final Portfolio Piece**: Combines all learned concepts.
- **TypeGPU Engine**: Type-safe GPU logic and auto-generated memory layouts.
- **glTF Asset Pipeline**: Uses \`packages/gltf-ecs\` for optimized asset preparation.
- **ECS Integration**: SoA data layout with **bitECS** on the GPU.
- **Compute-to-Render**: Update physics and matrices on the GPU.

## 🏃 Running Locally
\`\`\`bash
# From the root directory
bun dev --filter gltf-typegpu-ecs
\`\`\`
