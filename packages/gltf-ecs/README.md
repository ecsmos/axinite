# 🧩 @axinite/gltf-ecs

A command-line utility for preparing glTF assets into a "GPU/ECS-friendly" binary format.

## 🚀 Features
- **GLB Optimization**: Meshopt, mesh quantization, KTX2 encoding.
- **SoA Export**: Exports transform and mesh data into binary \`.bit\` format for BitECS.
- **Fast Pipeline**: Automated asset transformation from source files to public distributions.

## 🛠️ Usage
\`\`\`bash
bun run process -i <input.glb> -o <output_dir>
\`\`\`
