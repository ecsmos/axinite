import type { AssetLoaderOptions, AudioAssetData } from '../types';

/**
 * Loader for audio files (mp3, wav, ogg, etc.)
 * Handles fetching raw bytes in the worker.
 * Decoding to PCM occurs on the main thread (WebAudio API requirement).
 */
export class AudioLoader {
  private cache: Map<string, AudioAssetData>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Fetches raw compressed audio bytes
   */
  async fetchRaw(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<{ id: string; rawBuffer: SharedArrayBuffer; mimeType: string }> {
    const id = options.id || url;

    // Check if we have it fully decoded in cache
    const cached = this.cache.get(id);
    if (cached?.rawBuffer) {
      // If we already have decoded data, we return just enough for main thread to use it
      return {
        id,
        rawBuffer: cached.rawBuffer,
        mimeType: cached.mimeType,
      };
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load audio: ${url}`);

    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'audio/mpeg';

    const sab = new SharedArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(sab);
    view.set(new Uint8Array(buffer));

    return {
      id,
      rawBuffer: sab,
      mimeType,
    };
  }

  /**
   * Updates the internal cache with fully decoded PCM data
   * (Called from main thread via worker API)
   */
  setDecoded(id: string, data: AudioAssetData) {
    this.cache.set(id, data);
  }

  /**
   * Gets cached decoded audio data
   */
  getDecoded(id: string): AudioAssetData | undefined {
    return this.cache.get(id);
  }
}
