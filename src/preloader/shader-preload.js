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
    
    out vec2 vUv;
    
    const vec2 pos[3] = vec2[](
        vec2(-1.0, -1.0),
        vec2( 3.0, -1.0),
        vec2(-1.0,  3.0)
    );
    
    void main() {
        vec2 p = pos[gl_VertexID];
        vUv = p * 0.5 + 0.5;
        gl_Position = vec4(p, 0.0, 1.0);
    }
`;


    // ---------- FRAGMENT ----------
    const fsSrc = `#version 300 es
    precision highp float;

    uniform float uTime;
    uniform float uProgress;
    
    in vec2 vUv;
    out vec4 outColor;
    
    /* ---------- helpers ---------- */
    
    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) +
               (c - a) * u.y * (1.0 - u.x) +
               (d - b) * u.x * u.y;
    }
    
    /* ---------- main ---------- */
    
    void main() {
    
        vec2 uv = vUv;
    
        // center space
        uv -= 0.5;
    
        // mirror reflection
        uv.x = abs(uv.x);
    
        // phase distortion (dies with progress)
        float phase = (1.0 - uProgress);
        uv.x += sin(uv.y * 18.0 + uTime * 1.5) * 0.12 * phase;
    
        // scan noise
        float n = noise(uv * 6.0 + uTime * 0.4);
        uv += (n - 0.5) * 0.15 * phase;
    
        // digital scan lines
        float scan = sin((uv.y + uTime * 0.2) * 120.0) * 0.5 + 0.5;
        scan = mix(scan, 0.5, uProgress);
    
        // procedural structure
        float d = length(uv * vec2(1.0, 1.4));
        float shape = smoothstep(0.45, 0.2, d);
    
        // stabilization
        shape *= smoothstep(0.0, 0.25, uProgress);
    
        // final color
        vec3 col = vec3(shape);
        col *= scan;
    
        // subtle glow
        col += pow(shape, 3.0) * 0.4;
    
        outColor = vec4(col, 1.0);
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

    // const uTime = gl.getUniformLocation(program, "uTime");
    const uProgress = gl.getUniformLocation(program, 'uProgress');

    let progress = 0.0;
    let stopped = false;
    //let start = performance.now();

    function frame() {
        if (stopped) return;

        // let t = (performance.now() - start) * 0.001;
        gl.uniform1f(uProgress, progress);

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
        }
    };
}
