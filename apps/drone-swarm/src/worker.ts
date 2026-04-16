import { addComponent, addEntity, createWorld, query } from 'bitecs';
import * as Comlink from 'comlink';
import { MAX_DRONES } from './types';

let world: any;
let Position: any;
let Velocity: any;
let DroneState: any;
let droneQuery: any;

const workerApi = {
  /**
   * Initializes the bitECS world with shared buffers from main thread
   */
  init(buffers: {
    position: Float32Array;
    velocity: Float32Array;
    phase: Float32Array;
    mode: Uint8Array;
  }) {
    // In bitECS 0.4.0, we can define maxEntities for better memory allocation
    world = createWorld({ maxEntities: MAX_DRONES });

    console.log(
      `[Worker] Initializing with ${buffers.position.byteLength} bytes of shared memory.`,
    );

    // Map bitECS components to existing SharedArrayBuffers
    Position = {
      x: buffers.position.subarray(0, MAX_DRONES),
      y: buffers.position.subarray(MAX_DRONES, MAX_DRONES * 2),
      z: buffers.position.subarray(MAX_DRONES * 2, MAX_DRONES * 3),
    };

    Velocity = {
      x: buffers.velocity.subarray(0, MAX_DRONES),
      y: buffers.velocity.subarray(MAX_DRONES, MAX_DRONES * 2),
      z: buffers.velocity.subarray(MAX_DRONES * 2, MAX_DRONES * 3),
    };

    DroneState = {
      mode: buffers.mode,
      phase: buffers.phase,
    };

    droneQuery = [Position, Velocity, DroneState];

    // Create entities
    console.log(`[Worker] Spawning ${MAX_DRONES} drones...`);
    for (let i = 0; i < MAX_DRONES; i++) {
      const eid = addEntity(world);
      addComponent(world, eid, Position);
      addComponent(world, eid, Velocity);
      addComponent(world, eid, DroneState);

      // Initial random state
      Position.x[eid] = (Math.random() - 0.5) * 200;
      Position.y[eid] = Math.random() * 100 + 50;
      Position.z[eid] = (Math.random() - 0.5) * 200;

      Velocity.x[eid] = (Math.random() - 0.5) * 2;
      Velocity.y[eid] = (Math.random() - 0.5) * 2;
      Velocity.z[eid] = (Math.random() - 0.5) * 2;

      DroneState.mode[eid] = Math.floor(Math.random() * 3);
      DroneState.phase[eid] = Math.random() * Math.PI * 2;
    }

    return true;
  },

  /**
   * Swarm movement logic
   */
  update(dt: number) {
    if (!world) return;

    // In bitECS 0.4.0, query() returns an iterable
    for (const eid of query(world, droneQuery)) {
      // Chaos movement
      Velocity.x[eid] += (Math.random() - 0.5) * 0.1;
      Velocity.y[eid] += (Math.random() - 0.5) * 0.1;
      Velocity.z[eid] += (Math.random() - 0.5) * 0.1;

      // Update position
      Position.x[eid] += Velocity.x[eid] * dt;
      Position.y[eid] += Velocity.y[eid] * dt;
      Position.z[eid] += Velocity.z[eid] * dt;

      // Simple bounds check
      if (Math.abs(Position.x[eid]) > 100) Velocity.x[eid] *= -1;
      if (Position.y[eid] < 0 || Position.y[eid] > 150) Velocity.y[eid] *= -1;
      if (Math.abs(Position.z[eid]) > 100) Velocity.z[eid] *= -1;

      // Update animation phase
      DroneState.phase[eid] += dt * 5.0;
    }

    return true;
  },
};

Comlink.expose(workerApi);
export type DroneWorkerApi = typeof workerApi;
