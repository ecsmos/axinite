import typegpu from 'unplugin-typegpu/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [typegpu({})],
  server: {
    port: 3003,
  },
  build: {
    target: 'esnext',
  },
});
