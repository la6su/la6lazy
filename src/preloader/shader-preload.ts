import crtVert from './shaders/crt.vs?raw';
import crtFrag from './shaders/crt.fs?raw';
import { getShaderSource } from '../utils/shader';

export function createGLPreloader(canvas: HTMLCanvasElement) {
  // Try WebGL2 first, fallback to WebGL1
  let gl = canvas.getContext('webgl2', {
    alpha: false,
    premultipliedAlpha: false,
  }) as WebGL2RenderingContext | WebGLRenderingContext | null;

  if (!gl) {
    console.warn('WebGL2 not supported, trying WebGL1');
    gl = canvas.getContext('webgl', {
      alpha: false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
  }

  if (!gl) {
    console.error('Neither WebGL2 nor WebGL1 supported');
    return { setProgress() {}, setScanlinePhase() {}, setMode() {}, stop() {} };
  }

  // ---------- VERTEX ----------
  const vsSrc = crtVert;

  // ---------- FRAGMENT ----------
  const fsSrc = crtFrag;

  // ---------- Compile ----------
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) return null;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error(gl!.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);

  if (!vs || !fs) {
    console.error('Shader compilation failed');
    return { setProgress() {}, setScanlinePhase() {}, setMode() {}, stop() {} };
  }

  const program = gl!.createProgram();
  if (!program)
    return { setProgress() {}, setScanlinePhase() {}, setMode() {}, stop() {} };
  gl!.attachShader(program, vs!);
  gl!.attachShader(program, fs!);
  gl!.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return { setProgress() {}, setScanlinePhase() {}, setMode() {}, stop() {} };
  }

  gl!.useProgram(program);

  // const uTime = gl.getUniformLocation(program, "uTime");
  const uProgress = gl!.getUniformLocation(program, 'uProgress');
  const uResolution = gl!.getUniformLocation(program, 'uResolution');
  const uScanlinePhase = gl!.getUniformLocation(program, 'uScanlinePhase');
  const uMode = gl!.getUniformLocation(program, 'uMode');
  let progress = 0.0;
  let scanlinePhase = 0.0;
  let stopped = false;
  let mode = 0;
  //let start = performance.now();

  function frame() {
    if (stopped) return;

    // let t = (performance.now() - start) * 0.001;
    gl!.uniform1f(uProgress, progress);
    gl!.uniform2f(uResolution, canvas.width, canvas.height);
    gl!.uniform1f(uScanlinePhase, scanlinePhase);
    gl!.uniform1f(uMode, mode);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  frame();

  return {
    setProgress(value: number) {
      progress = Math.min(1, Math.max(0, value));
    },
    setScanlinePhase(value: number) {
      scanlinePhase = Math.min(1, Math.max(0, value));
    },
    setMode(value: number) {
      mode = value;
    },
    stop() {
      stopped = true;
    },
    destroy() {
      stopped = true;

      // Clean up WebGL resources
      if (gl && program) {
        // Delete shaders
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);

        // Delete program
        gl.deleteProgram(program);

        // Clear buffers and textures if any
        // Note: In this simple case, we don't have VBOs or textures to clean up

        // Reset state
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.useProgram(null);
      }

      // Clear references
      // Note: preloader reference cleanup handled by caller
    },
  };
}
