import * as Comlink from 'comlink';
import type {
  AssetLoaderOptions,
  AudioAssetData,
  GltfAssetData,
  TextAssetData,
} from './types';
import type { AssetWorkerApi } from './worker';

/**
 * Main Thread API for @axinite/assets
 * Handles WebAudio decoding and coordination with the asset worker.
 */
export class Assets {
  private worker: Worker;
  private api: Comlink.Remote<AssetWorkerApi>;
  private audioCtx?: AudioContext;
  private cache: Map<string, GltfAssetData | AudioAssetData | TextAssetData>;

  /**
   * Initializes the asset loader.
   * If no workerUrl is provided, it will attempt to find the worker script automatically
   * next to the library file.
   */
  constructor(workerUrl?: string | URL) {
    const defaultUrl = new URL('./worker.mjs', import.meta.url);
    this.worker = new Worker(workerUrl || defaultUrl, { type: 'module' });
    this.api = Comlink.wrap<AssetWorkerApi>(this.worker);
    this.cache = new Map();
  }

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  /**
   * Loads a glTF asset asynchronously through the worker
   */
  async loadGltf(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<GltfAssetData> {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached) return cached as GltfAssetData;

    const data = await this.api.loadGltf(url, options);
    this.cache.set(id, data);
    return data;
  }

  /**
   * Loads a raw audio asset, decodes it into PCM, and shares it via SAB.
   * Returns both the SAB-backed AudioAssetData and a WebAudio AudioBuffer.
   */
  async loadAudio(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<AudioAssetData & { audioBuffer: AudioBuffer }> {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached) return cached as AudioAssetData & { audioBuffer: AudioBuffer };

    // 1. Fetch raw bytes in the worker (keep it off the main thread)
    const { rawBuffer, mimeType } = await this.api.fetchAudioRaw(url, options);

    // 2. Decode the compressed data on the main thread (WebAudio constraint)
    const ctx = this.getAudioCtx();

    // We must copy the SAB data to a regular ArrayBuffer because decodeAudioData
    // does not accept SharedArrayBuffer.
    const bufferCopy = new ArrayBuffer(rawBuffer.byteLength);
    new Uint8Array(bufferCopy).set(new Uint8Array(rawBuffer));
    const audioBuffer = await ctx.decodeAudioData(bufferCopy);

    // 3. Extract PCM channels into new SharedArrayBuffers for bitECS/Worker access
    const channels: SharedArrayBuffer[] = [];
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const pcmData = audioBuffer.getChannelData(i);
      const sab = new SharedArrayBuffer(pcmData.byteLength);
      new Float32Array(sab).set(pcmData);
      channels.push(sab);
    }

    const assetData: AudioAssetData = {
      id,
      type: 'audio',
      channels,
      sampleRate,
      duration,
      length,
      rawBuffer, // Store raw compressed data in SAB as well
      mimeType,
      metadata: {
        decoded: true,
        channels: audioBuffer.numberOfChannels,
        sampleRate,
        duration,
      },
    };

    // 4. Send the fully decoded asset data BACK to the worker to update its cache
    await this.api.cacheDecodedAudio(id, assetData);

    const result = {
      ...assetData,
      audioBuffer,
    };

    this.cache.set(id, result);
    return result;
  }

  /**
   * Loads an MSDF font (metadata + atlas) asynchronously through the worker
   */
  async loadText(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<TextAssetData> {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached) return cached as TextAssetData;

    const data = await this.api.loadText(url, options);
    this.cache.set(id, data);
    return data;
  }

  /**
   * Destroys the worker and cleans up resources
   */
  terminate() {
    this.worker.terminate();
  }
}

// Re-export shared types
export * from './types';
