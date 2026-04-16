import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: true,
  onSuccess: async () => {
    // Copy WASM file from node_modules to dist
    const wasmSrc = path.resolve(
      __dirname,
      'node_modules/msdfgen-wasm/wasm/msdfgen.wasm',
    );
    const wasmDest = path.resolve(__dirname, 'dist/msdfgen.wasm');

    if (fs.existsSync(wasmSrc)) {
      fs.copyFileSync(wasmSrc, wasmDest);
      console.log('✅ Copied msdfgen.wasm to dist/');
    } else {
      console.warn('⚠️ Could not find msdfgen.wasm in node_modules at', wasmSrc);
    }
  },
});
