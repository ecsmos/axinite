import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3005,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    fs: {
      allow: ['../..'],
    },
  },
  optimizeDeps: {
    exclude: ['@axinite/assets'],
  },
});
