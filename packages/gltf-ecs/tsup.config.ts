import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: true,
  async onSuccess() {
    const srcWasm = path.resolve('src/basis_encoder.wasm');
    const distWasm = path.resolve('dist/basis_encoder.wasm');
    if (fs.existsSync(srcWasm)) {
      fs.copyFileSync(srcWasm, distWasm);
      console.log('✅ Copied basis_encoder.wasm to dist/');
    }
  },
});
