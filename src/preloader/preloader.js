import { createGLPreloader } from "./shader-preload.js";

export function startPreloader(canvas) {
    return createGLPreloader(canvas); // возвращает { stop() }
}
