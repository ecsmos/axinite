import typegpu from 'unplugin-typegpu/vite';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  base: '/axinite/gltf-typegpu-ecs/',
  plugins: [typegpu({}), wasm(), topLevelAwait()],
  server: {
    port: 3007,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
});
