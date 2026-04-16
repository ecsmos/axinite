// src/worker.ts
import * as Comlink from "comlink";

// src/loaders/audio.ts
var AudioLoader = class {
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Fetches raw compressed audio bytes
   */
  async fetchRaw(url, options = {}) {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached?.rawBuffer) {
      return {
        id,
        rawBuffer: cached.rawBuffer,
        mimeType: cached.mimeType
      };
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load audio: ${url}`);
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") || "audio/mpeg";
    const sab = new SharedArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(sab);
    view.set(new Uint8Array(buffer));
    return {
      id,
      rawBuffer: sab,
      mimeType
    };
  }
  /**
   * Updates the internal cache with fully decoded PCM data
   * (Called from main thread via worker API)
   */
  setDecoded(id, data) {
    this.cache.set(id, data);
  }
  /**
   * Gets cached decoded audio data
   */
  getDecoded(id) {
    return this.cache.get(id);
  }
};

// src/loaders/font.ts
import { Msdfgen } from "msdfgen-wasm";
import opentype from "opentype.js";
var FontLoader = class {
  cache;
  msdfgen = null;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  async initMsdfgen() {
    if (!this.msdfgen) {
      const response = await fetch(new URL("./msdfgen.wasm", import.meta.url));
      const wasmBuffer = await response.arrayBuffer();
      this.msdfgen = await Msdfgen.create(wasmBuffer);
    }
  }
  /**
   * Loads a .ttf/.otf file or a .json BMFont.
   * If it's a binary font file, it generates the MSDF atlas on the fly.
   */
  async load(url, options = {}) {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }
    const isBinary = url.endsWith(".ttf") || url.endsWith(".otf") || url.endsWith(".woff");
    if (isBinary) {
      return this.generateFromBinary(url, options);
    } else {
      return this.loadFromJson(url, options);
    }
  }
  async generateFromBinary(url, options) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const font = opentype.parse(arrayBuffer);
    await this.initMsdfgen();
    if (!this.msdfgen) throw new Error("Msdfgen failed to initialize");
    const charset = options.charset || " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
    const fontSize = options.fontSize || 32;
    this.msdfgen.loadFont(new Uint8Array(arrayBuffer));
    const glyphCodes = Array.from(charset).map((c) => c.charCodeAt(0));
    this.msdfgen.loadGlyphs(glyphCodes);
    const bins = this.msdfgen.packGlyphs(
      {
        size: fontSize,
        range: 4
      },
      {
        maxWidth: 512,
        maxHeight: 512,
        padding: 1
      }
    );
    const result = bins[0];
    if (!result) throw new Error("Failed to pack glyphs into an atlas");
    const atlasBytes = this.msdfgen.createAtlasImage(result);
    const atlasBlob = new Blob([atlasBytes], { type: "image/png" });
    const atlasBitmap = await createImageBitmap(atlasBlob);
    const fontJson = {
      info: {
        face: font.names.fontFamily.en,
        size: fontSize,
        msdf: {
          range: 4,
          // Critical for MSDF shaders
          fieldType: "msdf"
        }
      },
      common: {
        lineHeight: fontSize,
        base: fontSize * 0.8,
        scaleW: result.width,
        scaleH: result.height,
        pages: 1,
        packed: 0
      },
      pages: ["atlas.png"],
      chars: result.rects.map((rect) => ({
        id: rect.glyph.unicode,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        // Normalized UVs for easier shader usage
        u: rect.x / result.width,
        v: rect.y / result.height,
        uw: rect.width / result.width,
        vh: rect.height / result.height,
        xoffset: rect.msdfData.xTranslate,
        yoffset: rect.msdfData.yTranslate,
        xadvance: rect.glyph.advance,
        page: 0,
        chnl: 15
      }))
    };
    const assetData = {
      id: options.id || url,
      type: "text",
      metadata: {
        family: font.names.fontFamily.en,
        size: fontSize,
        isGenerated: true
      },
      font: fontJson,
      atlas: atlasBitmap
    };
    this.cache.set(assetData.id, assetData);
    return assetData;
  }
  async loadFromJson(url, options) {
    const response = await fetch(url);
    const fontJson = await response.json();
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    const atlasUrl = baseUrl + fontJson.pages[0];
    const atlasResponse = await fetch(atlasUrl);
    const atlasBlob = await atlasResponse.blob();
    const atlasBitmap = await createImageBitmap(atlasBlob);
    const assetData = {
      id: options.id || url,
      type: "text",
      metadata: { family: fontJson.info.face, size: fontJson.info.size },
      font: fontJson,
      atlas: atlasBitmap
    };
    this.cache.set(assetData.id, assetData);
    return assetData;
  }
};

// src/loaders/gltf.ts
import {
  PropertyType,
  WebIO
} from "@gltf-transform/core";
import { dedup, flatten, instance, prune } from "@gltf-transform/functions";
var GltfLoader = class {
  io;
  cache;
  constructor() {
    this.io = new WebIO();
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Loads a glTF file and processes it for ECS/WebGPU
   */
  async load(url, options = {}) {
    const assetId = options.id || url;
    if (this.cache.has(assetId)) {
      return this.cache.get(assetId);
    }
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const doc = await this.io.readBinary(new Uint8Array(buffer));
    if (options.process !== false) {
      await doc.transform(
        flatten(),
        // Flattens scene graph
        prune(),
        // Remove unused properties
        dedup(),
        // Deduplicate properties (materials, accessors, etc.)
        instance()
        // Add EXT_mesh_gpu_instancing if possible
      );
    }
    const assetData = await this.extractAssetData(doc, assetId);
    this.cache.set(assetId, assetData);
    return assetData;
  }
  /**
   * Extracts hierarchy, geometry, and textures into efficient transferrable structures
   */
  async extractAssetData(doc, id) {
    const root = doc.getRoot();
    const allNodes = root.listNodes();
    const nodeToIndex = new Map(allNodes.map((node, i) => [node, i]));
    const allMeshes = root.listMeshes();
    const meshToIndex = new Map(allMeshes.map((mesh, i) => [mesh, i]));
    const allSkins = root.listSkins();
    const skinToIndex = new Map(allSkins.map((skin, i) => [skin, i]));
    const allTextures = root.listTextures();
    const textureToIndex = new Map(allTextures.map((tex, i) => [tex, i]));
    const allMaterials = root.listMaterials();
    const parentIndices = new Int32Array(allNodes.length);
    const nodes = allNodes.map((node, i) => {
      const parent = node.listParents().find((p) => p.propertyType === PropertyType.NODE);
      parentIndices[i] = parent ? nodeToIndex.get(parent) ?? -1 : -1;
      return {
        name: node.getName() || `node_${i}`,
        translation: Array.from(node.getTranslation()),
        rotation: Array.from(node.getRotation()),
        scale: Array.from(node.getScale()),
        meshIndex: meshToIndex.get(node.getMesh()) ?? -1,
        skinIndex: skinToIndex.get(node.getSkin()) ?? -1
      };
    });
    const geometries = {};
    for (const mesh of allMeshes) {
      const prims = mesh.listPrimitives();
      if (prims.length === 0) continue;
      const prim = prims[0];
      const geometryData = { attributes: {} };
      for (const semantic of prim.listSemantics()) {
        const accessor = prim.getAttribute(semantic);
        geometryData.attributes[semantic] = this.accessorToSAB(accessor);
      }
      const indices = prim.getIndices();
      if (indices) {
        geometryData.indices = this.accessorToSAB(indices);
      }
      geometries[mesh.getName() || `mesh_${allMeshes.indexOf(mesh)}`] = geometryData;
    }
    const materials = allMaterials.map((mat, i) => ({
      name: mat.getName() || `material_${i}`,
      baseColorFactor: Array.from(mat.getBaseColorFactor()),
      emissiveFactor: Array.from(mat.getEmissiveFactor()),
      metallicFactor: mat.getMetallicFactor(),
      roughnessFactor: mat.getRoughnessFactor(),
      baseColorTextureIndex: textureToIndex.get(mat.getBaseColorTexture()) ?? -1,
      metallicRoughnessTextureIndex: textureToIndex.get(mat.getMetallicRoughnessTexture()) ?? -1,
      normalTextureIndex: textureToIndex.get(mat.getNormalTexture()) ?? -1,
      emissiveTextureIndex: textureToIndex.get(mat.getEmissiveTexture()) ?? -1
    }));
    const textures = [];
    for (const tex of allTextures) {
      const image = tex.getImage();
      if (image) {
        const mimeType = tex.getMimeType();
        const blob = new Blob([image], { type: mimeType });
        const bitmap = await createImageBitmap(blob);
        textures.push(bitmap);
      }
    }
    const animations = root.listAnimations().map((anim, i) => {
      const channels = anim.listChannels().map((channel) => {
        const targetNode = channel.getTargetNode();
        const sampler = channel.getSampler();
        return {
          targetNodeIndex: targetNode ? nodeToIndex.get(targetNode) ?? -1 : -1,
          targetProperty: channel.getTargetPath(),
          interpolation: sampler.getInterpolation(),
          input: this.accessorToSAB(sampler.getInput()),
          output: this.accessorToSAB(sampler.getOutput())
        };
      }).filter((c) => c.targetNodeIndex !== -1);
      return {
        name: anim.getName() || `animation_${i}`,
        channels
      };
    });
    const skins = allSkins.map((skin, i) => ({
      name: skin.getName() || `skin_${i}`,
      jointIndices: skin.listJoints().map((joint) => nodeToIndex.get(joint) ?? -1),
      inverseBindMatrices: this.accessorToSAB(skin.getInverseBindMatrices())
    }));
    return {
      id,
      type: "gltf",
      metadata: {},
      nodes,
      hierarchy: parentIndices,
      geometries,
      materials,
      textures,
      animations,
      skins
    };
  }
  /**
   * Copies accessor data into a new SharedArrayBuffer
   */
  accessorToSAB(accessor) {
    const array = accessor.getArray();
    const sab = new SharedArrayBuffer(array.byteLength);
    const view = new array.constructor(sab);
    view.set(array);
    return sab;
  }
};

// src/worker.ts
var gltfLoader = new GltfLoader();
var audioLoader = new AudioLoader();
var fontLoader = new FontLoader();
var api = {
  /**
   * Loads a glTF asset in the worker
   */
  async loadGltf(url, options = {}) {
    try {
      return await gltfLoader.load(url, options);
    } catch (error) {
      console.error(`[AssetWorker] Failed to load glTF: ${url}`, error);
      throw error;
    }
  },
  /**
   * Fetches raw audio bytes in the worker
   */
  async fetchAudioRaw(url, options = {}) {
    try {
      const result = await audioLoader.fetchRaw(url, options);
      return result;
    } catch (error) {
      console.error(`[AssetWorker] Failed to fetch raw Audio: ${url}`, error);
      throw error;
    }
  },
  /**
   * Stores decoded audio data back into the worker cache
   */
  async cacheDecodedAudio(id, data) {
    audioLoader.setDecoded(id, data);
  },
  /**
   * Loads an MSDF font (either .ttf or pre-generated .json) in the worker
   */
  async loadText(url, options = {}) {
    try {
      return await fontLoader.load(url, options);
    } catch (error) {
      console.error(`[AssetWorker] Failed to load Font: ${url}`, error);
      throw error;
    }
  },
  /**
   * Clears the internal cache
   */
  async clearCache() {
  }
};
Comlink.expose(api);
