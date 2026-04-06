import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import typegpu from 'unplugin-typegpu/vite';

export default defineConfig({
  plugins: [
    typegpu(),
    wasm(),
    topLevelAwait()
  ],
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
