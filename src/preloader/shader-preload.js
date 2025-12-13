export function createGLPreloader(canvas) {
    const gl = canvas.getContext("webgl2", {
        alpha: false,
        premultipliedAlpha: false,
    });

    if (!gl) {
        console.error("WebGL2 not supported");
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
    uniform float uTime;

    void main(){
        float v = abs(sin(uTime));
        outColor = vec4(0.0, v, 1.0, 1.0);
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
        console.error("Shader compilation failed");
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

    const uTime = gl.getUniformLocation(program, "uTime");

    let stopped = false;
    let start = performance.now();

    function frame() {
        if (stopped) return;

        let t = (performance.now() - start) * 0.001;
        gl.uniform1f(uTime, t);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(frame);
    }

    frame();

    return {
        stop() { stopped = true; }
    };
}
