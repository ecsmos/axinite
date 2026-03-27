/**
 * Shared types for @axinite/assets
 */

export interface AssetData {
  id: string;
  type: AssetType;
  metadata: Record<string, any>;
}

export type AssetType = 'gltf' | 'video' | 'audio' | 'text';

export interface AudioAssetData extends AssetData {
  type: 'audio';
  /**
   * PCM data per channel, each stored in a SharedArrayBuffer (Float32Array).
   * This allows bitECS/Worker to read raw samples for analysis or custom processing.
   */
  channels: SharedArrayBuffer[];
  sampleRate: number;
  duration: number;
  length: number;
  /**
   * The original compressed buffer (optional, kept for reference or re-decoding)
   */
  rawBuffer?: SharedArrayBuffer;
  mimeType: string;
}

/**
 * bitECS Component Schema for Audio Sources
 */
export const AudioComponentSchema = {
  assetIndex: 'uint32', // Index into an array of loaded assets
  playing: 'uint8',
  loop: 'uint8',
  volume: 'float32',
  currentTime: 'float32',
  playbackRate: 'float32',
  panning: 'float32', // -1 to 1 for stereo, or distance for 3D
};

export interface TextAssetData extends AssetData {
  type: 'text';
  font: any; // BMFont JSON metadata
  atlas: ImageBitmap; // MSDF Atlas texture
}

export interface GltfAssetData extends AssetData {
  type: 'gltf';
  nodes: GltfNodeData[]; // Full node hierarchy with initial TRS
  hierarchy: Int32Array; // parentIndices
  geometries: Record<string, GltfGeometryData>;
  materials: GltfMaterialData[];
  textures: ImageBitmap[];
  animations: GltfAnimationData[];
  skins: GltfSkinData[];
}

export interface GltfNodeData {
  name: string;
  translation: number[]; // [x, y, z]
  rotation: number[]; // [x, y, z, w]
  scale: number[]; // [x, y, z]
  meshIndex: number;
  skinIndex: number;
}

export interface GltfSkinData {
  name: string;
  jointIndices: number[]; // Indices into the global 'nodes' array
  inverseBindMatrices: SharedArrayBuffer; // Float32Array data
}

export interface GltfGeometryData {
  attributes: Record<string, SharedArrayBuffer>;
  indices?: SharedArrayBuffer;
}

export interface GltfMaterialData {
  name: string;
  baseColorFactor: number[]; // [r, g, b, a]
  emissiveFactor: number[]; // [r, g, b]
  metallicFactor: number;
  roughnessFactor: number;
  baseColorTextureIndex: number;
  metallicRoughnessTextureIndex: number;
  normalTextureIndex: number;
  emissiveTextureIndex: number;
}

export interface GltfAnimationData {
  name: string;
  channels: GltfAnimationChannel[];
}

export interface GltfAnimationChannel {
  targetNodeIndex: number;
  targetProperty: 'translation' | 'rotation' | 'scale' | 'weights';
  interpolation: 'LINEAR' | 'STEP' | 'CUBICSPLINE';
  input: SharedArrayBuffer; // Times (seconds)
  output: SharedArrayBuffer; // Values (vec3/vec4/scalar)
}

export interface AssetLoaderOptions {
  id?: string;
  process?: boolean; // Whether to apply gltf-transform optimizations
  charset?: string; // Characters to include in font generation (default: ASCII 32-126)
  fontSize?: number; // Base font size for MSDF generation
}
