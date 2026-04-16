import { defineConfig } from 'vite';

export default defineConfig({
  base: '/axinite/webgpu-compute/',
  server: {
    port: 3002,
  },
  build: {
    target: 'esnext',
  },
});
