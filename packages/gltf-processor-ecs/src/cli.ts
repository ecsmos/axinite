#!/usr/bin/env bun

import path from 'node:path';
import { argv } from 'node:process';
import { parseArgs } from 'node:util';
import { GltfProcessor } from './index';

const { values, positionals } = parseArgs({
  args: argv,
  options: {
    input: { type: 'string', short: 'i' },
    output: { type: 'string', short: 'o' },
    quality: { type: 'string', short: 'q', default: '80' },
    effort: { type: 'string', short: 'e', default: '4' },
    size: { type: 'string', short: 's', default: '2048' },
  },
  strict: true,
  allowPositionals: true,
});

async function run() {
  // Bun.argv[0] is bun, [1] is script path, so positionals start from 2
  const input = values.input || positionals[2];
  const output = values.output || positionals[3] || './dist';
  const quality = parseInt(values.quality as string, 10);
  const effort = parseInt(values.effort as string, 10);
  const size = parseInt(values.size as string, 10);

  if (!input) {
    console.log('AXINITE GLTF -> ECS Processor');
    console.log('Usage:');
    console.log(
      '  bun src/cli.ts -i <input.glb> -o <output_dir> [-q 80] [-e 4] [-s 2048]',
    );
    process.exit(1);
  }

  const processor = new GltfProcessor();
  await processor.init();

  try {
    await processor.process({
      input: path.isAbsolute(input)
        ? input
        : path.resolve(process.cwd(), input),
      output: path.isAbsolute(output)
        ? output
        : path.resolve(process.cwd(), output),
      quality,
      effort,
      size,
    });
  } catch (err) {
    console.error('Error processing file:', err);
    process.exit(1);
  }
}

run();
