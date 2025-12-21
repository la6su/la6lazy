import crtVert from './shaders/crt.vs?raw';
import crtFrag from './shaders/crt.fs?raw';

export function createGLPreloader(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    premultipliedAlpha: false,
  });

  if (!gl) {
    console.error('WebGL2 not supported');
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
  };
}
