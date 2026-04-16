declare module 'three/tsl' {
  const instanceIndex: any;
  const time: any;
  const storage: any;
  const vec3: any;
  const sin: any;
  const color: any;
  const oscSine: any;
  const mix: any;
  const range: any;
  const uniform: any;
  const instancedBufferAttribute: any;
  const normalWorld: any;
  const vec4: any;
  const uint: any;
  export {
    instanceIndex,
    time,
    storage,
    vec3,
    sin,
    color,
    oscSine,
    mix,
    range,
    uniform,
    instancedBufferAttribute,
    normalWorld,
    vec4,
    uint,
  };
}

declare module 'three/webgpu' {
  export * from 'three';
  export const WebGPURenderer: any;
  export const MeshBasicNodeMaterial: any;
  export const StorageInstancedBufferAttribute: any;
}
