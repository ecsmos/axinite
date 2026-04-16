import {
  type Accessor,
  type Document,
  PropertyType,
  WebIO,
} from '@gltf-transform/core';
import { dedup, flatten, instance, prune } from '@gltf-transform/functions';
import type {
  AssetLoaderOptions,
  GltfAnimationChannel,
  GltfAnimationData,
  GltfAssetData,
  GltfGeometryData,
  GltfMaterialData,
  GltfNodeData,
  GltfSkinData,
} from '../types';

/**
 * Loader for glTF assets using gltf-transform
 */
export class GltfLoader {
  private io: WebIO;
  private cache: Map<string, GltfAssetData>;

  constructor() {
    this.io = new WebIO();
    this.cache = new Map();
  }

  /**
   * Loads a glTF file and processes it for ECS/WebGPU
   */
  async load(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<GltfAssetData> {
    const assetId = options.id || url;

    // 1. Check cache
    if (this.cache.has(assetId)) {
      return this.cache.get(assetId)!;
    }

    // 2. Fetch and read glTF
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const doc = await this.io.readBinary(new Uint8Array(buffer));

    // 3. Process the document
    if (options.process !== false) {
      await doc.transform(
        flatten(), // Flattens scene graph
        prune(), // Remove unused properties
        dedup(), // Deduplicate properties (materials, accessors, etc.)
        instance(), // Add EXT_mesh_gpu_instancing if possible
      );
    }

    // 4. Extract data into SAB-backed buffers
    const assetData = await this.extractAssetData(doc, assetId);

    // 5. Store in cache
    this.cache.set(assetId, assetData);

    return assetData;
  }

  /**
   * Extracts hierarchy, geometry, and textures into efficient transferrable structures
   */
  private async extractAssetData(
    doc: Document,
    id: string,
  ): Promise<GltfAssetData> {
    const root = doc.getRoot();

    // Maps to keep track of indices
    const allNodes = root.listNodes();
    const nodeToIndex = new Map(allNodes.map((node, i) => [node, i]));

    const allMeshes = root.listMeshes();
    const meshToIndex = new Map(allMeshes.map((mesh, i) => [mesh, i]));

    const allSkins = root.listSkins();
    const skinToIndex = new Map(allSkins.map((skin, i) => [skin, i]));

    const allTextures = root.listTextures();
    const textureToIndex = new Map(allTextures.map((tex, i) => [tex, i]));

    const allMaterials = root.listMaterials();

    // --- 1. Hierarchy & Node Data ---
    const parentIndices = new Int32Array(allNodes.length);
    const nodes: GltfNodeData[] = allNodes.map((node, i) => {
      // Find parent index
      const parent = node
        .listParents()
        .find((p) => p.propertyType === PropertyType.NODE);
      parentIndices[i] = parent ? (nodeToIndex.get(parent as any) ?? -1) : -1;

      return {
        name: node.getName() || `node_${i}`,
        translation: Array.from(node.getTranslation()),
        rotation: Array.from(node.getRotation()),
        scale: Array.from(node.getScale()),
        meshIndex: meshToIndex.get(node.getMesh()!) ?? -1,
        skinIndex: skinToIndex.get(node.getSkin()!) ?? -1,
      };
    });

    // --- 2. Geometry (SharedArrayBuffer) ---
    const geometries: Record<string, GltfGeometryData> = {};
    for (const mesh of allMeshes) {
      const prims = mesh.listPrimitives();
      if (prims.length === 0) continue;

      // Currently, we take the first primitive.
      // Multi-primitive meshes should ideally be handled by splitting into separate nodes in bitECS.
      const prim = prims[0];
      const geometryData: GltfGeometryData = { attributes: {} };

      // Vertex Attributes (POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0, etc.)
      for (const semantic of prim.listSemantics()) {
        const accessor = prim.getAttribute(semantic)!;
        geometryData.attributes[semantic] = this.accessorToSAB(accessor);
      }

      // Indices
      const indices = prim.getIndices();
      if (indices) {
        geometryData.indices = this.accessorToSAB(indices);
      }

      geometries[mesh.getName() || `mesh_${allMeshes.indexOf(mesh)}`] =
        geometryData;
    }

    // --- 3. Materials ---
    const materials: GltfMaterialData[] = allMaterials.map((mat, i) => ({
      name: mat.getName() || `material_${i}`,
      baseColorFactor: Array.from(mat.getBaseColorFactor()),
      emissiveFactor: Array.from(mat.getEmissiveFactor()),
      metallicFactor: mat.getMetallicFactor(),
      roughnessFactor: mat.getRoughnessFactor(),
      baseColorTextureIndex:
        textureToIndex.get(mat.getBaseColorTexture()!) ?? -1,
      metallicRoughnessTextureIndex:
        textureToIndex.get(mat.getMetallicRoughnessTexture()!) ?? -1,
      normalTextureIndex: textureToIndex.get(mat.getNormalTexture()!) ?? -1,
      emissiveTextureIndex: textureToIndex.get(mat.getEmissiveTexture()!) ?? -1,
    }));

    // --- 4. Textures (ImageBitmap) ---
    const textures: ImageBitmap[] = [];
    for (const tex of allTextures) {
      const image = tex.getImage();
      if (image) {
        const mimeType = tex.getMimeType();
        const blob = new Blob([image], { type: mimeType });
        const bitmap = await createImageBitmap(blob);
        textures.push(bitmap);
      }
    }

    // --- 5. Animations ---
    const animations: GltfAnimationData[] = root
      .listAnimations()
      .map((anim, i) => {
        const channels: GltfAnimationChannel[] = anim
          .listChannels()
          .map((channel) => {
            const targetNode = channel.getTargetNode();
            const sampler = channel.getSampler()!;

            return {
              targetNodeIndex: targetNode
                ? (nodeToIndex.get(targetNode) ?? -1)
                : -1,
              targetProperty: channel.getTargetPath() as any,
              interpolation: sampler.getInterpolation() as any,
              input: this.accessorToSAB(sampler.getInput()!),
              output: this.accessorToSAB(sampler.getOutput()!),
            };
          })
          .filter((c) => c.targetNodeIndex !== -1);

        return {
          name: anim.getName() || `animation_${i}`,
          channels,
        };
      });

    // --- 6. Skins ---
    const skins: GltfSkinData[] = allSkins.map((skin, i) => ({
      name: skin.getName() || `skin_${i}`,
      jointIndices: skin
        .listJoints()
        .map((joint) => nodeToIndex.get(joint) ?? -1),
      inverseBindMatrices: this.accessorToSAB(skin.getInverseBindMatrices()!),
    }));

    return {
      id,
      type: 'gltf',
      metadata: {},
      nodes,
      hierarchy: parentIndices,
      geometries,
      materials,
      textures,
      animations,
      skins,
    };
  }

  /**
   * Copies accessor data into a new SharedArrayBuffer
   */
  private accessorToSAB(accessor: Accessor): SharedArrayBuffer {
    const array = accessor.getArray()!;
    const sab = new SharedArrayBuffer(array.byteLength);
    const view = new (array.constructor as any)(sab);
    view.set(array);
    return sab;
  }
}
