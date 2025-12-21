/**
 * Shader optimization utilities
 */

/**
 * Minify GLSL shader source code
 */
export function minifyShader(source: string): string {
  return (
    source
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace and newlines
      .replace(/\s+/g, ' ')
      // Remove spaces around operators
      .replace(/\s*([=<>!&|+-/*%])\s*/g, '$1')
      // Remove trailing/leading whitespace
      .trim()
  );
}

/**
 * Precompile shader for validation
 */
export function validateShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    console.error('Shader compilation error:', error);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Create shader program with validation
 */
export function createShaderProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vertexShader = validateShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = validateShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Clean up shaders after linking
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    console.error('Shader program linking error:', error);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Cache for compiled shaders
 */
class ShaderCache {
  private cache = new Map<string, WebGLProgram>();

  get(key: string): WebGLProgram | undefined {
    return this.cache.get(key);
  }

  set(key: string, program: WebGLProgram): void {
    this.cache.set(key, program);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const shaderCache = new ShaderCache();

/**
 * Get shader source with optional minification
 */
export function getShaderSource(source: string, minify = false): string {
  return minify ? minifyShader(source) : source;
}
