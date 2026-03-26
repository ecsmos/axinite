import * as Comlink from 'comlink';
import type { ComponentData } from './types';

let components: ComponentData;

const workerApi = {
  init(data: ComponentData) {
    components = data;
    console.log('Worker initialized with shared buffers');
  },

  /**
   * Update system: Movement & Boundary checks
   * @param dt Delta time
   * @param entities Uint32Array of entity IDs to process
   */
  update(dt: number, entities: Uint32Array) {
    if (!components) return;

    const { Position, Velocity } = components;

    // Direct iteration for maximum performance
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i];
      
      // Update position
      Position.x[eid] += Velocity.x[eid] * dt;
      Position.y[eid] += Velocity.y[eid] * dt;

      // Simple boundary check (800x600 canvas)
      if (Position.x[eid] < 0) {
        Position.x[eid] = 0;
        Velocity.x[eid] *= -1;
      } else if (Position.x[eid] > 800) {
        Position.x[eid] = 800;
        Velocity.x[eid] *= -1;
      }

      if (Position.y[eid] < 0) {
        Position.y[eid] = 0;
        Velocity.y[eid] *= -1;
      } else if (Position.y[eid] > 600) {
        Position.y[eid] = 600;
        Velocity.y[eid] *= -1;
      }
    }
  },
};

Comlink.expose(workerApi);

export type WorkerApi = typeof workerApi;
