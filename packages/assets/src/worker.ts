import * as Comlink from 'comlink';
import { AudioLoader } from './loaders/audio';
import { FontLoader } from './loaders/font';
import { GltfLoader } from './loaders/gltf';
import type {
  AssetLoaderOptions,
  AudioAssetData,
  GltfAssetData,
  TextAssetData,
} from './types';

/**
 * Worker implementation for @axinite/assets
 */
const gltfLoader = new GltfLoader();
const audioLoader = new AudioLoader();
const fontLoader = new FontLoader();

const api = {
  /**
   * Loads a glTF asset in the worker
   */
  async loadGltf(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<GltfAssetData> {
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
  async fetchAudioRaw(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<{ id: string; rawBuffer: SharedArrayBuffer; mimeType: string }> {
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
  async cacheDecodedAudio(id: string, data: AudioAssetData) {
    audioLoader.setDecoded(id, data);
  },

  /**
   * Loads an MSDF font (either .ttf or pre-generated .json) in the worker
   */
  async loadText(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<TextAssetData> {
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
    // TODO: implement clearCache in GltfLoader
  },
};

// Expose the API to the main thread
Comlink.expose(api);

export type AssetWorkerApi = typeof api;
