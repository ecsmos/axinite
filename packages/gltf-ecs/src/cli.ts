#!/usr/bin/env bun

import path from 'node:path';
import { argv } from 'node:process';
import { parseArgs } from 'node:util';
import { GltfProcessor } from './index';

interface CliOptions {
  input: string;
  output: string;
}

function parseCliOptions(): CliOptions {
  const args = argv.slice(2);

  const { values, positionals } = parseArgs({
    args: args,
    options: {
      input: {
        type: 'string',
        short: 'i',
        description: 'Input GLTF/GLB file path',
      },
      output: {
        type: 'string',
        short: 'o',
        description: 'Output directory path (default: ./dist)',
      },
      help: {
        type: 'boolean',
        short: 'h',
        description: 'Show help message',
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const input = values.input || positionals[0];

  const output = values.output || positionals[1] || './dist';

  if (!input) {
    console.error('❌ Error: Input file is required\n');
    printHelp();
    process.exit(1);
  }

  return {
    input: resolvePath(input),
    output: resolvePath(output),
  };
}

function resolvePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════╗
║            🎮 AXINITE GLTF → ECS v1.0            ║
╚══════════════════════════════════════════════════╝

Process GLTF/GLB files and export to ECS binary format.

Usage:
  gltf-ecs [options] <input> [output]

Arguments:
  <input>          Path to input .glb/.gltf file
  [output]         Output directory (default: ./dist)

Options:
  -i, --input      Input file path (alternative to positional argument)
  -o, --output     Output directory path
  -h, --help       Show this help message

Examples:
  # Using positional arguments
  gltf-ecs model.glb ./output

  # Using flags
  gltf-ecs -i model.glb -o ./output

  # Mixed usage
  gltf-ecs -i model.glb ./output

Output:
  📁 output/
  ├── data.glb      Optimized GLB with compressed textures/meshes
  └── model.bit     ECS entity data in binary format
`);
}

async function run(): Promise<void> {
  const startTime = Date.now();

  try {
    let options: CliOptions;
    try {
      options = parseCliOptions();
    } catch (error) {
      console.error('❌ Failed to parse arguments:', error);
      process.exit(1);
    }

    console.log('🚀 AXINITE GLTF → ECS Processor');
    console.log('━'.repeat(40));
    console.log(`📥 Input:  ${options.input}`);
    console.log(`📤 Output: ${options.output}`);
    console.log('');

    const processor = new GltfProcessor();

    console.log('⏳ Initializing processor...');
    await processor.init();
    console.log('✅ Processor initialized\n');

    await processor.process(options);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('━'.repeat(40));
    console.log(`✨ Processing completed successfully!`);
    console.log(`⏱️  Time: ${processingTime}s`);
    console.log(`📁 Output: ${options.output}`);
    console.log('');
    console.log('Generated files:');
    console.log(`  📄 data.glb  - Optimized 3D model`);
    console.log(`  🎯 model.bit - ECS entity data`);
  } catch (error) {
    console.error('');
    console.error('💥 Fatal Error:');
    console.error(
      error instanceof Error ? error.message : 'Unknown error occurred',
    );

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

run();
