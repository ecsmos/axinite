import * as THREE from 'three/webgpu';

async function init() {
  const canvas = document.querySelector('#c') as HTMLCanvasElement;
  if (!canvas) return;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 3;

  // Renderer
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Important: WebGPURenderer needs initialization
  await renderer.init();

  // Geometry
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshNormalMaterial();
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Animation
  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
}

init().catch((err) => {
  console.error('Failed to initialize WebGPU renderer:', err);
  const info = document.createElement('div');
  info.style.color = 'white';
  info.style.position = 'absolute';
  info.style.top = '10px';
  info.style.left = '10px';
  info.textContent = `WebGPU not supported or initialization failed: ${err.message}`;
  document.body.appendChild(info);
});
