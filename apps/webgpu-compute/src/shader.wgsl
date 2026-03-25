// Layout of Particle struct in WGSL (Manual Alignment Required):
// | Field    | Type   | Align | Size | Offset |
// |----------|--------|-------|------|--------|
// | pos      | vec2f  | 8     | 8    | 0      |
// | velocity | vec2f  | 8     | 8    | 8      |
// | color    | vec4f  | 16    | 16   | 16     |
// | size     | f32    | 4     | 4    | 32     |
// | PADDING  | -      | -     | 12   | 36     | <-- Required to reach total size of 48 (multiple of 16)
// Total Size: 48 bytes

struct Particle {
  pos      : vec2f,
  velocity : vec2f,
  color    : vec4f,
  size     : f32,
}

// Storage buffer for a list of particles
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn update(
  @builtin(global_invocation_id) global_id : vec3u
) {
  let index = global_id.x;
  
  // Guard against out-of-bounds
  if (index >= arrayLength(&particles)) {
    return;
  }

  // Basic "physics" simulation
  particles[index].pos += particles[index].velocity;
  
  // Shrink over time
  particles[index].size *= 0.99;

  // Change color slightly based on position
  particles[index].color.r = (particles[index].pos.x + 1.0) / 2.0;
}
