# Axinite Monorepo

Monorepo on `bun` + `turborepo`, frontends on `vite`, formatting/linting via `biome`.

Project goal: collect the evolution of WebGPU/TypeGPU infrastructure and package the final showcase as a portfolio.

## Final Project (result): `apps/gltf-typegpu-ecs`

This is the showcase where the focus is on:

- WebGPU rendering and GPU compute.
- TypeGPU (GPU logic composed in TypeScript with auto-generated memory layouts).
- ECS ideas on `bitecs` (SoA layout, SharedArrayBuffer, Comlink).
- A glTF asset preparation pipeline into a “GPU/ECS-friendly” format via `packages/gltf-ecs`.

Run the target showcase:

```bash
bun install
cd apps/gltf-typegpu-ecs
bun dev
```

After startup, open `http://localhost:3007/`.

> Port `3007` is configured in `apps/gltf-typegpu-ecs/vite.config.ts`.

### Need a “special” browser

To make everything work, you need a browser with WebGPU support and with the required experimental features available/enabled.

Minimum requirements:

- WebGPU enabled (often easiest with Chromium-based browsers where an experimental WebGPU flag is enabled).
- `secure context` (usually `https://` or `http://localhost`).
- For `SharedArrayBuffer`, you need cross-origin isolation. In `apps/gltf-typegpu-ecs/vite.config.ts` the headers `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` are set, so local development should work “out of the box”.

## What `apps/gltf-typegpu-ecs` shows

In its current stage, the showcase demonstrates a “GPU compute + SoA/ECS data” pipeline:

- `SharedArrayBuffer` and SoA layout (position/rotation/velocity) are created in `src/worker.ts` and passed to the main thread via `Comlink`.
- The main thread runs the `TypeGPU` compute pipeline (`physicsCompute`) and the render pipeline.
- The GPU computes updates and matrices for instanced objects (currently it instances a set of cubes with COUNT=1000).
- Camera controls: mouse (drag/yaw/pitch) + wheel (distance).

## Repository evolution (how we got to the final showcase)

Below is the “experiments story” from which the final project was assembled.

1. `apps/webgpu-triangle` — a basic WebGPU renderer (starting point).
2. `apps/webgpu-compute` — compute pass: a manual example of managing buffer layout/offsets.
3. `apps/webgpu-typegpu` — the same idea, but on TypeGPU: auto memory schemas and computation “from TS”.
4. `apps/webgpu-bitecs` — CPU-side ECS on `bitecs` + worker/`SharedArrayBuffer`/Comlink.
5. `apps/drone-swarm` — moving the ECS/data idea into a WebGPU rendering setup (instancing + Storage buffers via `three/webgpu`).
6. `apps/asset-test` — asset infrastructure: loading/decoding via `packages/assets` (worker + Comlink).
7. `apps/gltf-typegpu-ecs` — the final showcase: GPU compute + SoA/ECS data + (key) glTF asset preparation pipeline into `data.bit`.

## Core packages powering the portfolio

### `packages/gltf-ecs` — console utility for asset preparation

Pipeline component:

- reads `.glb/.gltf`,
- optimizes the document (meshopt/quantize/ktx2 and more),
- exports ECS-SoA data into the binary `data.bit`,
- writes an optimized `model.glb` into the output in parallel.

CLI (bin): `gltf-ecs`.

### `packages/assets` — runtime asset loader

`@axinite/assets` is a browser-side asset library (worker + Comlink) that provides:

- `loadText(url)` to load text,
- `loadGltf(url)` to load glTF,
- `loadAudio(url)` to decode audio and return SAB-backed data (when applicable).

## Prepare assets via console: `GLB -> model.glb + data.bit`

Binary outputs are consumed by the project as:

- `apps/gltf-typegpu-ecs/public/assets/model.glb` (optimized glTF GLB)
- `apps/gltf-typegpu-ecs/public/assets/data.bit` (ECS entity data, SoA)

Current input sources (as an example) live in:

- `apps/gltf-typegpu-ecs/src/tokyo.glb`

Example: rebuild assets (overwrite `public/assets` for the showcase):

```bash
# Option A: invoke the bin directly (often via bunx)
# Example: tokyo.glb -> public/assets/{model.glb,data.bit}
bunx gltf-ecs -i ./apps/gltf-typegpu-ecs/src/tokyo.glb -o ./apps/gltf-typegpu-ecs/public/assets

# Option B: explicitly run the CLI from the package (works reliably in the monorepo)
cd packages/gltf-ecs

bun run process -- -i ../../apps/gltf-typegpu-ecs/src/tokyo.glb -o ../../apps/gltf-typegpu-ecs/public/assets
```

What `gltf-ecs` does:

- first runs GLTF document transforms (flatten/uninstance/weld/tangents, etc.),
- then encodes textures into KTX2 (via `ktx2-encoder` with supercompression/UASTC settings),
- does quantize/reorder/meshopt (minimization and better data placement),
- exports ECS-SoA:
  - `Transform` (position/rotation/scale),
  - `Mesh` (linking the node to the mesh index),
- writes:
  - `model.glb` into the output,
  - `data.bit` into the output.

> Note: generating `data.bit` relies on `bitecs/serialization` and the current ECS component schema in `packages/gltf-ecs/src/index.ts`.

## What to consider a “successful” result

For the final `apps/gltf-typegpu-ecs` showcase you typically get two things:

- The WebGPU pass starts in the browser with the right flags.
- The asset pipeline can generate the binary files that later can be picked up by the GPU/ECS parts of the project.

## Quick dev workflow in the monorepo

Common commands:

```bash
bun install
bun lint
bun format
bun build
```

Run tasks for a specific application:

- `cd apps/<app-name> && bun dev`
- for the CLI asset: see `GLB -> model.glb + data.bit`
