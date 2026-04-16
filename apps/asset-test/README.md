# 📦 Axinite: Assets Test

Testing the runtime asset preparation pipeline and worker-based loading.

## 🚀 Key Features
- **Runtime Asset Loader**: Uses `@axinite/assets` to load and decode assets in a worker.
- **Worker + Comlink**: Offloads heavy tasks from the main thread.
- **WebGPU Ready**: Prepared for WebGPU-based asset consumption.

## 🏃 Running Locally
\`\`\`bash
# From the root directory
bun dev --filter asset-test
\`\`\`
