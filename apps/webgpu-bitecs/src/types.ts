export const MAX_ENTITIES = 10000;

export interface ComponentData {
  Position: {
    x: Float32Array;
    y: Float32Array;
  };
  Velocity: {
    x: Float32Array;
    y: Float32Array;
  };
}

export function createSharedComponentData(): ComponentData {
  // Use SharedArrayBuffer for the data
  const posXSAB = new SharedArrayBuffer(
    MAX_ENTITIES * Float32Array.BYTES_PER_ELEMENT,
  );
  const posYSAB = new SharedArrayBuffer(
    MAX_ENTITIES * Float32Array.BYTES_PER_ELEMENT,
  );
  const velXSAB = new SharedArrayBuffer(
    MAX_ENTITIES * Float32Array.BYTES_PER_ELEMENT,
  );
  const velYSAB = new SharedArrayBuffer(
    MAX_ENTITIES * Float32Array.BYTES_PER_ELEMENT,
  );

  return {
    Position: {
      x: new Float32Array(posXSAB),
      y: new Float32Array(posYSAB),
    },
    Velocity: {
      x: new Float32Array(velXSAB),
      y: new Float32Array(velYSAB),
    },
  };
}
