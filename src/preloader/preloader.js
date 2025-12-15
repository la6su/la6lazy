// This file wraps the raw WebGL preloader for lifecycle control.
// The actual shader logic lives in shader-preload.js.
export async function startPreloader(canvas) {
  const { createGLPreloader } = await import('./shader-preload.js');
  const preloader = createGLPreloader(canvas);

  // Dev-only GUI for debugging
  if (import.meta.env.DEV) {
    try {
      const { default: GUI } = await import('lil-gui');
      const gui = new GUI();
      const params = {
        progress: 0.0,
      };

      gui
        .add(params, 'progress', 0, 1, 0.001)
        .name('uProgress')
        .onChange(value => preloader.setProgress(value));
    } catch (error) {
      console.warn('lil-gui not available in production');
    }
  }

  return preloader; // возвращает { stop() }
}
export function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}
export function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}
