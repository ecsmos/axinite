import { d } from 'typegpu';

/**
 * Shared types and bitECS schemas for the Drone Swarm.
 * Uses SharedArrayBuffer for zero-copy sync between Worker and GPU.
 */

export const MAX_DRONES = 100_000;

/**
 * TypeGPU Schema for a single Drone state.
 * This is useful for future-proofing and better type safety.
 */
export const DroneSchema = d.struct({
  x: d.f32,
  y: d.f32,
  z: d.f32,
});

/**
 * TypeGPU Schema for the entire swarm.
 * bitecs SoA (Structure of Arrays) means we have separate arrays for X, Y, Z.
 * However, we store them as [X0...Xn, Y0...Yn, Z0...Zn] in a single Float32Array.
 */
export const SwarmPositionBufferSchema = d.arrayOf(d.f32, MAX_DRONES * 3);
export const SwarmPhaseBufferSchema = d.arrayOf(d.f32, MAX_DRONES);

export interface SharedBuffers {
  position: Float32Array; 
  velocity: Float32Array; 
  phase: Float32Array;
  mode: Uint8Array;
}

/**
 * Creates the SharedArrayBuffers used by both ECS and WebGPU.
 */
export function createSharedBuffers(): SharedBuffers {
  const posSAB = new SharedArrayBuffer(MAX_DRONES * 3 * Float32Array.BYTES_PER_ELEMENT);
  const velSAB = new SharedArrayBuffer(MAX_DRONES * 3 * Float32Array.BYTES_PER_ELEMENT);
  const phaseSAB = new SharedArrayBuffer(MAX_DRONES * Float32Array.BYTES_PER_ELEMENT);
  const modeSAB = new SharedArrayBuffer(MAX_DRONES * Uint8Array.BYTES_PER_ELEMENT);

  return {
    position: new Float32Array(posSAB),
    velocity: new Float32Array(velSAB),
    phase: new Float32Array(phaseSAB),
    mode: new Uint8Array(modeSAB),
  };
}

// bitECS Schemas for type reference
export const PositionSchema = { x: 0, y: 0, z: 0 };
export const VelocitySchema = { x: 0, y: 0, z: 0 };
export const DroneStateSchema = { mode: 0, phase: 0 };
