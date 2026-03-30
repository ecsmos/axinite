import path from 'node:path';
import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  flatten,
  prune,
  quantize,
  resample,
  textureCompress,
  uninstance,
  weld,
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import fs from 'fs-extra';
import sharp from 'sharp';

export interface EcsManifest {
  resources: {
    meshes: unknown[];
    materials: unknown[];
    textures: unknown[];
    animations: unknown[];
  };
  entities: unknown[];
}

export interface ProcessorOptions {
  input: string;
  output: string;
  quality?: number;
  effort?: number;
  size?: number;
}

export class GltfProcessor {
  private io: NodeIO;

  constructor() {
    this.io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  }

  async init(): Promise<void> {
    this.io.registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });
  }

  async process(options: ProcessorOptions): Promise<void> {
    const { input, output, quality = 80, effort = 4, size = 2048 } = options;

    await fs.ensureDir(output);
    const document = await this.io.read(input);

    console.log(`Processing ${input}...`);

    // 1. Transform Pipeline
    await document.transform(
      flatten(),
      uninstance(),
      weld(),
      dedup(),
      resample(),
      prune(),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [size, size],
        quality: quality,
        effort: effort,
      }),
      quantize({
        quantizePosition: 14,
        quantizeTexcoord: 12,
        quantizeColor: 8,
        quantizeNormal: 10,
      }),
    );

    // 2. Resource & Entity Mapping
    const manifest = this.generateManifest(document, output);

    // 3. Export Files
    await fs.writeJson(path.join(output, 'manifest.json'), manifest, {
      spaces: 2,
    });

    // Export the main data buffer
    const glbBuffer = await this.io.writeBinary(document);
    await fs.writeFile(path.join(output, 'data.glb'), glbBuffer);

    console.log(`Successfully exported to ${output}`);
  }

  private generateManifest(document: Document, outputDir: string): EcsManifest {
    const root = document.getRoot();

    const manifest: EcsManifest = {
      resources: {
        meshes: [],
        materials: [],
        textures: [],
        animations: [],
      },
      entities: [],
    };

    const textures = root.listTextures();
    const materials = root.listMaterials();
    const meshes = root.listMeshes();
    const animations = root.listAnimations();

    const nodes = root.listNodes();

    // Texture resources
    textures.forEach((tex, idx) => {
      const buffer = tex.getImage();
      if (buffer) {
        const fileName = `tex_${idx}.webp`;
        fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(buffer));
        manifest.resources.textures.push({
          id: idx,
          name: tex.getName(),
          uri: fileName,
          mimeType: tex.getMimeType() || 'image/webp',
        });
      }
    });

    // Material resources
    materials.forEach((mat, idx) => {
      const baseColorTexture = mat.getBaseColorTexture();

      manifest.resources.materials.push({
        id: idx,
        name: mat.getName(),
        baseColorFactor: mat.getBaseColorFactor(),
        roughnessFactor: mat.getRoughnessFactor(),
        metallicFactor: mat.getMetallicFactor(),
        baseColorTexture: baseColorTexture
          ? textures.indexOf(baseColorTexture)
          : -1,
      });
    });

    // Mesh resources
    meshes.forEach((mesh, idx) => {
      const primitives = mesh.listPrimitives().map((prim) => {
        const attributes: Record<string, unknown> = {};

        prim.listSemantics().forEach((semantic) => {
          const accessor = prim.getAttribute(semantic);
          if (accessor) {
            attributes[semantic] = {
              type: accessor.getType(),
              componentType: accessor.getComponentType(),
              normalized: accessor.getNormalized(),
              count: accessor.getCount(),
              byteLength: accessor.getByteLength(),
            };
          }
        });

        const indices = prim.getIndices();
        const material = prim.getMaterial();

        return {
          attributes,
          indices: indices
            ? {
                count: indices.getCount(),
                componentType: indices.getComponentType(),
              }
            : null,
          materialId: material ? materials.indexOf(material) : -1,
        };
      });

      manifest.resources.meshes.push({
        id: idx,
        name: mesh.getName(),
        primitives,
      });
    });

    // Animation resources
    animations.forEach((anim, idx) => {
      const channels = anim.listChannels().map((channel) => {
        const sampler = channel.getSampler();

        const input = sampler?.getInput();
        const output = sampler?.getOutput();

        return {
          target: channel.getTargetNode()?.getName() ?? 'unknown',
          path: channel.getTargetPath() ?? 'translation',
          interpolation: sampler?.getInterpolation() ?? 'LINEAR',
          times: {
            count: input?.getCount() ?? 0,
            byteLength: input?.getByteLength() ?? 0,
            componentType: input?.getComponentType() ?? 5126,
          },
          values: {
            count: output?.getCount() ?? 0,
            byteLength: output?.getByteLength() ?? 0,
            type: output?.getType() ?? 'VEC3',
          },
        };
      });

      manifest.resources.animations.push({
        id: idx,
        name: anim.getName(),
        channels,
      });
    });

    // Entities from nodes
    nodes.forEach((node, idx) => {
      const mesh = node.getMesh();
      if (mesh) {
        manifest.entities.push({
          entityId: idx,
          name: node.getName(),
          meshId: meshes.indexOf(mesh),
          translation: node.getTranslation(),
          rotation: node.getRotation(),
          scale: node.getScale(),
        });
      }
    });

    return manifest;
  }
}
