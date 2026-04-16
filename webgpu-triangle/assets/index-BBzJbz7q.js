(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`struct VertexOutput {
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
`;async function t(){if(!navigator.gpu)throw Error(`WebGPU is not supported on this browser.`);let t=await navigator.gpu.requestAdapter();if(!t)throw Error(`No appropriate GPUAdapter found.`);let n=await t.requestDevice(),r=document.querySelector(`#c`);if(!r)throw Error(`Canvas element not found.`);let i=r.getContext(`webgpu`);if(!i)throw Error(`WebGPU context not found.`);let a=navigator.gpu.getPreferredCanvasFormat(),o=window.devicePixelRatio||1;r.width=r.clientWidth*o,r.height=r.clientHeight*o,i.configure({device:n,format:a,alphaMode:`premultiplied`});let s=n.createShaderModule({label:`Triangle Shader`,code:e}),c=n.createRenderPipeline({label:`Triangle Render Pipeline`,layout:`auto`,vertex:{module:s,entryPoint:`vs`},fragment:{module:s,entryPoint:`fs`,targets:[{format:a}]},primitive:{topology:`triangle-list`}});function l(e,t,n){function r(){let i=e.createCommandEncoder(),a={colorAttachments:[{view:t.getCurrentTexture().createView(),clearValue:{r:.1,g:.1,b:.1,a:1},loadOp:`clear`,storeOp:`store`}]},o=i.beginRenderPass(a);o.setPipeline(n),o.draw(3),o.end(),e.queue.submit([i.finish()]),requestAnimationFrame(r)}r()}new ResizeObserver(e=>{for(let t of e){let e=t.target,r=t.contentBoxSize[0].inlineSize,i=t.contentBoxSize[0].blockSize;e.width=Math.max(1,Math.min(r,n.limits.maxTextureDimension2D)),e.height=Math.max(1,Math.min(i,n.limits.maxTextureDimension2D))}}).observe(r),l(n,i,c)}t().catch(e=>{console.error(e);let t=document.querySelector(`#info`);if(t){t.textContent=`WebGPU Error: ${e.message}`;let n=document.createElement(`div`);n.textContent=`Please check if WebGPU is enabled in your browser settings.`,t.parentElement?.appendChild(n)}});