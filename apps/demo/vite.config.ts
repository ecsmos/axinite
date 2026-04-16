import { defineConfig } from 'vite';

export default defineConfig({
  base: '/axinite/demo/',
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
