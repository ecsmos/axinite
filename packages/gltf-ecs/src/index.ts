import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  flatten,
  meshopt,
  prune,
  quantize,
  reorder,
  resample,
  tangents,
  uninstance,
  weld,
} from '@gltf-transform/functions';
import { addComponent, addEntity, createWorld } from 'bitecs';
import { createSoASerializer, f32, i32 } from 'bitecs/serialization';
import draco3d from 'draco3dgltf';
import fs from 'fs-extra';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { generateTangents } from 'mikktspace';
import sharp from 'sharp';

export const Transform = {
  px: f32([]),
  py: f32([]),
  pz: f32([]),
  rx: f32([]),
  ry: f32([]),
  rz: f32([]),
  rw: f32([]),
  sx: f32([]),
  sy: f32([]),
  sz: f32([]),
};

export const Mesh = {
  meshId: i32([]),
};

export interface ProcessorOptions {
  input: string;
  output: string;
}

export class GltfProcessor {
  private io: NodeIO;
  private initialized: boolean = false;

  constructor() {
    this.io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  }

  async init(): Promise<void> {
    this.io.registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });

    this.initialized = true;
  }

  async process(options: ProcessorOptions): Promise<void> {
    if (!this.initialized) {
      throw new Error('Call init() first!');
    }

    this.validateOptions(options);

    const { input, output } = options;

    try {
      await this.validateInputFile(input);

      await fs.ensureDir(output);

      console.log(`Processing ${input}...`);

      let document: Document;
      try {
        document = await this.io.read(input);
      } catch (error) {
        console.error(`Failed to read GLTF/GLB file: ${input}`);
        throw new Error(
          `Failed to read input file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      console.log('Transforming document...');

      await document.transform(
        uninstance(),
        flatten(),
        dedup(),
        weld(),
        tangents({ generateTangents }),
        resample(),
        prune(),
        ktx2({
          slots: /^(normalTexture|occlusionTexture|metallicRoughnessTexture)$/,
          isUASTC: true,
          uastcLDRQualityLevel: 1,
          enableRDO: true,
          rdoQualityLevel: 1,
          needSupercompression: true,
          wasmUrl: path.join(__dirname, 'basis_encoder.wasm'),
          imageDecoder: this.decodeImage.bind(this),
        }),
        ktx2({
          slots:
            /^(?!normalTexture|occlusionTexture|metallicRoughnessTexture).*$/,
          isUASTC: false,
          qualityLevel: 128,
          compressionLevel: 1,
          wasmUrl: path.join(__dirname, 'basis_encoder.wasm'),
          imageDecoder: this.decodeImage.bind(this),
        }),
        quantize({
          quantizePosition: 14,
          quantizeTexcoord: 12,
          quantizeColor: 8,
          quantizeNormal: 10,
        }),
        reorder({ encoder: MeshoptEncoder }),
        meshopt({ encoder: MeshoptEncoder }),
      );

      console.log('Exporting bitecs data...');

      try {
        await this.exportBitecsData(document, output);
      } catch (error) {
        console.error('Failed to export bitecs data:', error);
        throw new Error(
          `Bitecs export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      console.log('Writing GLB...');

      try {
        const glbBuffer = await this.io.writeBinary(document);
        await fs.writeFile(path.join(output, 'model.glb'), glbBuffer);
      } catch (error) {
        console.error('Failed to write GLB file:', error);
        throw new Error(
          `GLB export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      console.log(`Successfully exported to ${output}`);
    } catch (error) {
      console.error(`Error processing ${input}:`, error);
      throw error;
    }
  }

  private validateOptions(options: ProcessorOptions): void {
    if (!options.input) {
      throw new Error('Input path is required');
    }
    if (!options.output) {
      throw new Error('Output path is required');
    }
  }

  private async validateInputFile(inputPath: string): Promise<void> {
    const exists = await fs.pathExists(inputPath);
    if (!exists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const stats = await fs.stat(inputPath);
    if (!stats.isFile()) {
      throw new Error(`Input path is not a file: ${inputPath}`);
    }
  }

  private async decodeImage(buffer: Uint8Array): Promise<{
    width: number;
    height: number;
    data: Uint8Array;
  }> {
    console.log('Decoding image...');

    try {
      const { data, info } = await sharp(buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      return {
        width: info.width,
        height: info.height,
        data: new Uint8Array(data),
      };
    } catch (error) {
      console.error('Failed to decode image:', error);
      throw new Error(
        `Image decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async exportBitecsData(
    document: Document,
    outputDir: string,
  ): Promise<void> {
    const world = createWorld();
    const serialize = createSoASerializer([Transform, Mesh]);

    const entityIds: number[] = [];
    const root = document.getRoot();

    const meshes = root.listMeshes();
    const nodes = root.listNodes();

    nodes.forEach((node) => {
      const mesh = node.getMesh();
      const meshId = mesh ? meshes.indexOf(mesh) : -1;

      const eid = addEntity(world);
      addComponent(world, eid, Transform);
      addComponent(world, eid, Mesh);

      const [px, py, pz] = node.getTranslation();
      const [rx, ry, rz, rw] = node.getRotation();
      const [sx, sy, sz] = node.getScale();

      Transform.px[eid] = px;
      Transform.py[eid] = py;
      Transform.pz[eid] = pz;

      Transform.rx[eid] = rx;
      Transform.ry[eid] = ry;
      Transform.rz[eid] = rz;
      Transform.rw[eid] = rw;

      Transform.sx[eid] = sx;
      Transform.sy[eid] = sy;
      Transform.sz[eid] = sz;

      Mesh.meshId[eid] = meshId;

      entityIds.push(eid);
    });

    const buffer = serialize(entityIds);

    const outputPath = path.join(outputDir, 'data.bit');
    await fs.writeFile(outputPath, Buffer.from(buffer));
  }
}
