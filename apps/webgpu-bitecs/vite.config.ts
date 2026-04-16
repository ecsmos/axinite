import { defineConfig } from 'vite';

export default defineConfig({
  base: '/axinite/webgpu-bitecs/',
  server: {
    port: 3004,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
});
