export function createGLPreloader(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    premultipliedAlpha: false,
  });

  if (!gl) {
    console.error('WebGL2 not supported');
    return { stop() {} };
  }

  // ---------- VERTEX ----------
  const vsSrc = `#version 300 es
    precision highp float;

    const vec2 pos[3] = vec2[3](
        vec2(-1.0, -1.0),
        vec2( 3.0, -1.0),
        vec2(-1.0,  3.0)
    );

    void main(){
        gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
    }`;

  // ---------- FRAGMENT ----------
  const fsSrc = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2  uResolution;
uniform float uProgress; // 0 = off, 1 = fully on

float uv2TVHoleShape(vec2 uv, vec2 scale)
{
    uv = uv * 2.0 - 1.0;
    uv = abs(uv);
    uv *= scale;

    float y = smoothstep(1.0, 0.0, uv.x);

    // distance to the ideal hard edge
    float d = uv.y - y;

    // anti-alias using fwidth
    float edge = fwidth(d) * 1.0; // tweak multiplier for softness
    return smoothstep(edge, -edge, d);
}

float uv2TopBottomBlack(vec2 uv, float amount01)
{
    uv.y = uv.y * 2.0 - 1.0;
    uv.y = abs(uv.y);

    float edgeVal = 1.0 - amount01;
    float d = uv.y - edgeVal;

    float edge = fwidth(d) * 1.0;
    return smoothstep(edge, -edge, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    // base green-ish color (or replace with your texture)
    vec3 col = vec3(1.0, 1.0, 1.0);

    // use linear progress, 0 -> 1
    float param01 = 1.0 - clamp(uProgress, 0.0, 1.0);

    float cutPoint = 0.5;
    float blendRange = 0.2;

    float anim01;
    float topBlack;
    float holeMask;

    // -------- TOP/BOTTOM MASK --------
    anim01 = param01 / cutPoint;
    anim01 = anim01 * anim01 * anim01 / 1.05;
    topBlack = uv2TopBottomBlack(uv, anim01);

    // -------- TV HOLE MASK --------
    anim01 = (param01 - cutPoint) / (1.0 - cutPoint);
    anim01 = max(anim01, 0.0);

    float x = anim01 * anim01 * anim01 * 80.0 + 1.0;
    float y = anim01 * anim01 * 80.0 + 2.0;
    holeMask = uv2TVHoleShape(uv, vec2(x, y));

    float mixT = smoothstep(cutPoint - blendRange, cutPoint + blendRange, param01);
    float mask = mix(topBlack, holeMask, mixT);

    outColor = vec4(col * mask, 1.0);
}
`;

  // ---------- Compile ----------
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);

  if (!vs || !fs) {
    console.error('Shader compilation failed');
    return { stop() {} };
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return { stop() {} };
  }

  gl.useProgram(program);

  // const uTime = gl.getUniformLocation(program, "uTime");
  const uProgress = gl.getUniformLocation(program, 'uProgress');
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  let progress = 0.0;
  let stopped = false;
  //let start = performance.now();

  function frame() {
    if (stopped) return;

    // let t = (performance.now() - start) * 0.001;
    gl.uniform1f(uProgress, progress);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  frame();

  return {
    setProgress(value) {
      progress = Math.min(1, Math.max(0, value));
    },
    stop() {
      stopped = true;
    },
  };
}
