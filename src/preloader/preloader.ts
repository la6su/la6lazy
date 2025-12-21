import {createGLPreloader} from './shader-preload';
// This file wraps the raw WebGL preloader for lifecycle control.
// The actual shader logic lives in shader-preload.ts.
export function startPreloader(canvas: HTMLCanvasElement) {
    // Debug GUI only in development
  // Note: Removed due to import.meta.env TypeScript issues
  // GUI is now completely removed from production builds

  return createGLPreloader(canvas); // возвращает { stop() }
}
export function showLoader() {
  const loader = document.getElementById('loader') as HTMLElement;
  if (loader) loader.style.display = 'flex';
}
export function hideLoader() {
  const loader = document.getElementById('loader') as HTMLElement;
  if (loader) loader.style.display = 'none';
}
