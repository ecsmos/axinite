import { Assets } from '@axinite/assets';

// 1. Initialize Assets
const assets = new Assets();

async function runTests() {
  console.log('[AssetTest] Starting tests...');
  console.log('[AssetTest] crossOriginIsolated:', window.crossOriginIsolated);
  console.log('[AssetTest] has SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');

  // --- Font Test ---
  const fontStatus = document.getElementById('font-status')!;
  const fontCanvas = document.getElementById(
    'font-canvas',
  ) as HTMLCanvasElement;
  const ctx = fontCanvas.getContext('2d')!;

  try {
    fontStatus.textContent = 'Loading Font...';
    // Test with a common font from a CDN or local
    // Using a known URL for Inter (from GitHub)
    const fontUrl =
      'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf';

    console.log('[AssetTest] Loading font:', fontUrl);
    const fontData = await assets.loadText(fontUrl, {
      id: 'Inter-Test',
      fontSize: 64,
      charset: 'ABCDEFGHIJKLMN abcdefghijklmn 1234567890',
    });

    console.log('[AssetTest] Font loaded:', fontData);

    // Draw the generated atlas to the canvas
    fontCanvas.width = fontData.atlas.width;
    fontCanvas.height = fontData.atlas.height;
    ctx.drawImage(fontData.atlas, 0, 0);

    fontStatus.className = 'status success';
    fontStatus.textContent = `Success: ${fontData.metadata.family}`;
  } catch (err: any) {
    console.error('[AssetTest] Font failed:', err);
    fontStatus.className = 'status error';
    fontStatus.textContent = `Error: ${err.message}`;
  }

  // --- GLTF Test ---
  const gltfStatus = document.getElementById('gltf-status')!;
  const gltfInfo = document.getElementById('gltf-info')!;
  try {
    gltfStatus.textContent = 'Loading GLTF...';
    // Use a test model from Khronos (BoxAnimated for skins/animations)
    const gltfUrl =
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb';

    console.log('[AssetTest] Loading GLTF:', gltfUrl);
    const gltfData = await assets.loadGltf(gltfUrl);
    console.log('[AssetTest] GLTF loaded:', gltfData);

    gltfInfo.innerHTML = `
            <b>Nodes:</b> ${gltfData.nodes.length}<br>
            <b>Geometries:</b> ${Object.keys(gltfData.geometries).length}<br>
            <b>Materials:</b> ${gltfData.materials.length}<br>
            <b>Textures:</b> ${gltfData.textures.length}<br>
            <b>Animations:</b> ${gltfData.animations.length}<br>
            <b>Skins:</b> ${gltfData.skins.length}
        `;
    gltfStatus.className = 'status success';
    gltfStatus.textContent = 'Success';
  } catch (err: any) {
    console.error('[AssetTest] GLTF failed:', err);
    gltfStatus.className = 'status error';
    gltfStatus.textContent = `Error: ${err.message}`;
  }

  // --- Audio Test ---
  const audioStatus = document.getElementById('audio-status')!;
  const audioInfo = document.getElementById('audio-info')!;
  const playButton = document.getElementById('play-audio') as HTMLButtonElement;
  try {
    audioStatus.textContent = 'Loading Audio...';
    // Use an MDN sample mp3
    const audioUrl =
      'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3';

    console.log('[AssetTest] Loading Audio:', audioUrl);
    const audioData = await assets.loadAudio(audioUrl);
    console.log('[AssetTest] Audio loaded:', audioData);

    audioInfo.innerHTML = `
            <b>Channels:</b> ${audioData.channels.length}<br>
            <b>Sample Rate:</b> ${audioData.sampleRate} Hz<br>
            <b>Duration:</b> ${audioData.duration.toFixed(2)}s<br>
            <b>PCM Memory:</b> ${(audioData.channels.reduce((sum, ch) => sum + ch.byteLength, 0) / 1024).toFixed(2)} KB
        `;
    audioStatus.className = 'status success';
    audioStatus.textContent = 'Success';

    // Allow testing the buffer playback
    playButton.disabled = false;
    playButton.onclick = async () => {
      console.log('[AssetTest] Playing audio directly from AudioBuffer...');
      const ctx = new AudioContext();
      const source = ctx.createBufferSource();
      source.buffer = audioData.audioBuffer;
      source.connect(ctx.destination);
      source.start();
    };
  } catch (err: any) {
    console.error('[AssetTest] Audio failed:', err);
    audioStatus.className = 'status error';
    audioStatus.textContent = `Error: ${err.message}`;
  }
}

// Start tests when ready
window.addEventListener('load', runTests);
