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
    
    uniform float uMode;
    // 0.0 = CRT power-on
    // 1.0 = scanline loader
    
    out vec4 outColor;
    
    uniform vec2  uResolution;
    uniform float uScanlinePhase; // unlock gesture
    uniform float uProgress;      // real loading
    
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
    
    float hLine(vec2 uv, float y, float thickness) {
        float d = abs(uv.y - y);
        float aa = fwidth(d);
        return smoothstep(thickness + aa, thickness - aa, d);
    }

    float vignette(vec2 uv) {
        uv = uv * 2.0 - 1.0;
        float v = dot(uv, uv);
        return smoothstep(1.2, 0.4, v);
    }
    
    void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    float p = clamp(uProgress, 0.0, 1.0);
    vec3 col = vec3(1.0);

    // =========================
    // CRT BOOT MASK (ТВОЙ КОД)
    // =========================

    float param01 = 1.0 - p;

    float cutPoint = 0.5;
    float blendRange = 0.2;

    float anim01;
    float topBlack;
    float holeMask;

    anim01 = param01 / cutPoint;
    anim01 = anim01 * anim01 * anim01 / 1.05;
    topBlack = uv2TopBottomBlack(uv, anim01);

    anim01 = (param01 - cutPoint) / (1.0 - cutPoint);
    anim01 = max(anim01, 0.0);

    float x = anim01 * anim01 * anim01 * 80.0 + 1.0;
    float y = anim01 * anim01 * 80.0 + 2.0;
    holeMask = uv2TVHoleShape(uv, vec2(x, y));

    float mixT = smoothstep(cutPoint - blendRange, cutPoint + blendRange, param01);
    float crtMask = mix(topBlack, holeMask, mixT);

    // =========================
    // SCANLINE LOADER MASK
    // =========================
    float phase = pow(uScanlinePhase, 1.4);
    float thickness = mix(0.01, 0.3, phase);
    float glow      = smoothstep(0.0, 1.0, uProgress);
    vec3 color      = mix(vec3(0.2,0.8,0.3), vec3(0.0,1.0,0.6), glow);


    float d1 = abs(uv.y - (0.5));
    float aa1 = fwidth(d1);
    float l1 = smoothstep(thickness + aa1, thickness - aa1, d1);

    float d2 = abs(uv.y - 0.52);
    float aa2 = fwidth(d2);
    float l2 = smoothstep(thickness * 0.6 + aa2, thickness * 0.6 - aa2, d2);

    float d3 = abs(uv.y - 0.48);
    float aa3 = fwidth(d3);
    float l3 = smoothstep(thickness * 0.4 + aa3, thickness * 0.4 - aa3, d3);

    float scanMask = max(l1, max(l2, l3));

    // =========================
    // MODE MIX (КЛЮЧЕВОЕ)
    // =========================

    float isScanline = step(0.5, uMode);
    float mask;

    if (uMode < 0.5) {
        // CRT BOOT
        mask = crtMask;
    } else {
        // SCANLINE
        mask = scanMask;
    }
    
    vec3 finalColor = mix(col, color, step(0.5, uMode));
    outColor = vec4(finalColor * mask, 1.0);
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
  const uScanlinePhase = gl.getUniformLocation(program, 'uScanlinePhase');
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uMode = gl.getUniformLocation(program, 'uMode');
  let progress = 0.0;
  let scanlinePhase = 0.0;
  let stopped = false;
  let mode = 0;
  //let start = performance.now();

  function frame() {
    if (stopped) return;

    // let t = (performance.now() - start) * 0.001;
    gl.uniform1f(uProgress, progress);
    gl.uniform1f(uScanlinePhase, scanlinePhase);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uMode, mode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  frame();

  return {
    setProgress(value) {
      progress = Math.min(1, Math.max(0, value));
    },
    setScanlinePhase(value) {
      scanlinePhase = Math.min(1, Math.max(0, value));
    },
    setMode(value) {
      mode = value;
    },
    stop() {
      stopped = true;
    },
  };
}
