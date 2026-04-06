import * as Comlink from 'comlink';
import {
  createWorld,
  addEntity,
  addComponent,
  type World,
} from 'bitecs';

interface ComponentSoA {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
}

let world: World;
const Position: ComponentSoA = { x: new Float32Array(), y: new Float32Array(), z: new Float32Array() };
const Rotation: ComponentSoA = { x: new Float32Array(), y: new Float32Array(), z: new Float32Array() };
const Velocity: ComponentSoA = { x: new Float32Array(), y: new Float32Array(), z: new Float32Array() };

const api = {
  init(sab: SharedArrayBuffer, count: number) {
    world = createWorld();
    
    // SoA Layout in SAB: 
    // [pos.x... (count)], [pos.y... (count)], [pos.z... (count)],
    // [rot.x... (count)], [rot.y... (count)], [rot.z... (count)],
    // [vel.x... (count)], [vel.y... (count)], [vel.z... (count)]
    const bytesPerArray = count * 4;

    Position.x = new Float32Array(sab, bytesPerArray * 0, count);
    Position.y = new Float32Array(sab, bytesPerArray * 1, count);
    Position.z = new Float32Array(sab, bytesPerArray * 2, count);
    
    Rotation.x = new Float32Array(sab, bytesPerArray * 3, count);
    Rotation.y = new Float32Array(sab, bytesPerArray * 4, count);
    Rotation.z = new Float32Array(sab, bytesPerArray * 5, count);

    Velocity.x = new Float32Array(sab, bytesPerArray * 6, count);
    Velocity.y = new Float32Array(sab, bytesPerArray * 7, count);
    Velocity.z = new Float32Array(sab, bytesPerArray * 8, count);

    for (let i = 0; i < count; i++) {
      const eid = addEntity(world);
      addComponent(world, eid, Position);
      addComponent(world, eid, Rotation);
      addComponent(world, eid, Velocity);
      
      Position.x[eid] = (Math.random() - 0.5) * 60;
      Position.y[eid] = (Math.random() - 0.5) * 60;
      Position.z[eid] = (Math.random() - 0.5) * 60;
      
      Rotation.x[eid] = Math.random() * Math.PI * 2;
      Rotation.y[eid] = Math.random() * Math.PI * 2;
      Rotation.z[eid] = Math.random() * Math.PI * 2;

      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Velocity.z[eid] = 0;
    }
  },

  update(_dt: number) {
    // Physics is now on GPU via Compute Shader
  }
};

Comlink.expose(api);
