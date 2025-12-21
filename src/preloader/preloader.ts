import { createGLPreloader } from './shader-preload';
import GUI from 'lil-gui';
// This file wraps the raw WebGL preloader for lifecycle control.
// The actual shader logic lives in shader-preload.ts.
export function startPreloader(canvas: HTMLCanvasElement) {
  const preloader = createGLPreloader(canvas);

  const gui = new GUI();
  const params = {
    progress: 0.0,
  };

  gui
    .add(params, 'progress', 0, 1, 0.001)
    .name('uProgress')
    .onChange((value: number) => preloader.setProgress(value));

  return preloader; // возвращает { stop() }
}
export function showLoader() {
  const loader = document.getElementById('loader') as HTMLElement;
  if (loader) loader.style.display = 'flex';
}
export function hideLoader() {
  const loader = document.getElementById('loader') as HTMLElement;
  if (loader) loader.style.display = 'none';
}
