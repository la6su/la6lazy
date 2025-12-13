import { createGLPreloader } from "./shader-preload.js";

export function startPreloader(canvas) {
    return createGLPreloader(canvas); // возвращает { stop() }
}
export function showLoader() {
    document.getElementById("loader").style.display = "flex";
}
export function hideLoader() {
    document.getElementById("loader").style.display = "none";
}
