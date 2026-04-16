import { Msdfgen } from 'msdfgen-wasm';
import opentype from 'opentype.js';
import type { AssetLoaderOptions, TextAssetData } from '../types';

/**
 * Advanced Font Loader that can generate MSDF assets from raw TTF/OTF files.
 * This runs entirely in the worker, keeping the main thread free.
 */
export class FontLoader {
  private cache: Map<string, TextAssetData>;
  private msdfgen: Msdfgen | null = null;

  constructor() {
    this.cache = new Map();
  }

  private async initMsdfgen() {
    if (!this.msdfgen) {
      // Load msdfgen WASM. It should be placed next to the worker.
      const response = await fetch(new URL('./msdfgen.wasm', import.meta.url));
      const wasmBuffer = await response.arrayBuffer();
      this.msdfgen = await Msdfgen.create(wasmBuffer);
    }
  }

  /**
   * Loads a .ttf/.otf file or a .json BMFont.
   * If it's a binary font file, it generates the MSDF atlas on the fly.
   */
  async load(
    url: string,
    options: AssetLoaderOptions = {},
  ): Promise<TextAssetData> {
    const id = options.id || url;
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const isBinary =
      url.endsWith('.ttf') || url.endsWith('.otf') || url.endsWith('.woff');

    if (isBinary) {
      return this.generateFromBinary(url, options);
    } else {
      // Fallback to the previous JSON loader logic
      return this.loadFromJson(url, options);
    }
  }

  private async generateFromBinary(
    url: string,
    options: AssetLoaderOptions,
  ): Promise<TextAssetData> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const font = opentype.parse(arrayBuffer);

    await this.initMsdfgen();
    if (!this.msdfgen) throw new Error('Msdfgen failed to initialize');

    const charset =
      options.charset ||
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
    const fontSize = options.fontSize || 32;

    // 1. Load font into msdfgen
    this.msdfgen.loadFont(new Uint8Array(arrayBuffer));

    // 2. Generate and Pack Glyphs
    const glyphCodes = Array.from(charset).map((c) => c.charCodeAt(0));
    this.msdfgen.loadGlyphs(glyphCodes);

    const bins = this.msdfgen.packGlyphs(
      {
        size: fontSize,
        range: 4,
      },
      {
        maxWidth: 512,
        maxHeight: 512,
        padding: 1,
      },
    );

    const result = bins[0];
    if (!result) throw new Error('Failed to pack glyphs into an atlas');

    // 3. Create ImageBitmap from the generated pixels
    const atlasBytes = this.msdfgen.createAtlasImage(result);
    const atlasBlob = new Blob([atlasBytes], { type: 'image/png' });
    const atlasBitmap = await createImageBitmap(atlasBlob);

    // 4. Construct BMFont-compatible JSON
    const fontJson = {
      info: {
        face: font.names.fontFamily.en,
        size: fontSize,
        msdf: {
          range: 4, // Critical for MSDF shaders
          fieldType: 'msdf',
        },
      },
      common: {
        lineHeight: fontSize,
        base: fontSize * 0.8,
        scaleW: result.width,
        scaleH: result.height,
        pages: 1,
        packed: 0,
      },
      pages: ['atlas.png'],
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
        chnl: 15,
      })),
    };

    const assetData: TextAssetData = {
      id: options.id || url,
      type: 'text',
      metadata: {
        family: font.names.fontFamily.en,
        size: fontSize,
        isGenerated: true,
      },
      font: fontJson,
      atlas: atlasBitmap,
    };

    this.cache.set(assetData.id, assetData);
    return assetData;
  }

  private async loadFromJson(
    url: string,
    options: AssetLoaderOptions,
  ): Promise<TextAssetData> {
    // Standard loading logic for pre-generated BMFonts
    const response = await fetch(url);
    const fontJson = await response.json();
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    const atlasUrl = baseUrl + fontJson.pages[0];

    const atlasResponse = await fetch(atlasUrl);
    const atlasBlob = await atlasResponse.blob();
    const atlasBitmap = await createImageBitmap(atlasBlob);

    const assetData: TextAssetData = {
      id: options.id || url,
      type: 'text',
      metadata: { family: fontJson.info.face, size: fontJson.info.size },
      font: fontJson,
      atlas: atlasBitmap,
    };

    this.cache.set(assetData.id, assetData);
    return assetData;
  }
}
