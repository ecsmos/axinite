import { defineConfig } from 'vite';

export default defineConfig({
  base: '/axinite/webgpu-triangle/',
  server: {
    port: 3001,
  },
  build: {
    target: 'esnext',
  },
});
