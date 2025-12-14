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
    uniform float uProgress;
    uniform vec2 uResolution;
    
    vec2 getUV() {
        return gl_FragCoord.xy / uResolution;
    }
    
    void main() {
        float p = uProgress;
        vec2 uv = getUV();
        vec2 c = uv - 0.5;
    
        float linePhase   = smoothstep(0.0, 0.25, p);
        float expandPhase = smoothstep(0.25, 0.6, p);
        float fillPhase   = smoothstep(0.6, 1.0, p);
    
        float band = smoothstep(
            0.02 + expandPhase * 0.4,
            0.0,
            abs(c.y)
        );
    
        float circle = smoothstep(
            expandPhase,
            expandPhase - 0.02,
            length(c)
        );
    
        float mask = max(band * linePhase, circle);
        mask = mix(mask, 1.0, fillPhase);
    
        // CRT scanline
        float scan = sin(gl_FragCoord.y * 1.5) * 0.04;
        vec3 col = vec3(mask) + scan;
    
        outColor = vec4(col, 1.0);
    }`;

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
