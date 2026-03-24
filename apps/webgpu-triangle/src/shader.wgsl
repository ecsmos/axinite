struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f,
}

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> VertexOutput {
  let pos = array(
    vec2f( 0.0,  0.5),  // top center
    vec2f(-0.5, -0.5),  // bottom left
    vec2f( 0.5, -0.5)   // bottom right
  );

  let colors = array(
    vec4f(1, 0, 0, 1), // red
    vec4f(0, 1, 0, 1), // green
    vec4f(0, 0, 1, 1)  // blue
  );

  var output : VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.color = colors[vertexIndex];
  return output;
}

@fragment
fn fs(input : VertexOutput) -> @location(0) vec4f {
  return input.color;
}
