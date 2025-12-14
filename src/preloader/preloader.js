import { createGLPreloader } from './shader-preload.js';
import GUI from 'lil-gui';
// This file wraps the raw WebGL preloader for lifecycle control.
// The actual shader logic lives in shader-preload.js.
export function startPreloader(canvas) {
  const preloader = createGLPreloader(canvas);

  const gui = new GUI();
  const params = {
    progress: 0.0,
  };

  gui
    .add(params, 'progress', 0, 1, 0.001)
    .name('uProgress')
    .onChange(value => preloader.setProgress(value));

  return preloader; // возвращает { stop() }
}
export function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}
export function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}
