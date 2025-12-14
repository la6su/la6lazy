import { createGLPreloader } from './shader-preload.js';

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function supportsWorkerOffscreen() {
  return 'OffscreenCanvas' in window && 'Worker' in window && !isSafari();
}

export async function createCRTLoader({ canvas, dpr = 1 }) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // --- ВАРИАНТ A: WORKER ---
  if (supportsWorkerOffscreen()) {
    const offscreen = canvas.transferControlToOffscreen();

    const worker = new Worker(new URL('./crt-worker.js', import.meta.url), {
      type: 'module',
    });

    worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width,
        height,
        dpr,
      },
      [offscreen]
    );

    return {
      setProgress(value) {
        worker.postMessage({ type: 'progress', value: value });
      },
      setMode(mode) {
        const v = mode === 'scanline' ? 1 : 0;
        worker.postMessage({ type: 'mode', value: v });
      },
      finish() {
        worker.postMessage({ type: 'stop' });
        canvas.style.opacity = '0';
      },

      destroy() {
        worker.postMessage({ type: 'stop' });
      },

      mode: 'worker',
    };
  }

  // --- ВАРИАНТ B: FALLBACK (MAIN THREAD) ---
  const glCanvas = canvas;
  glCanvas.width = width * dpr;
  glCanvas.height = height * dpr;

  const preloader = createGLPreloader(glCanvas);

  return {
    setProgress(value) {
      preloader.setProgress(value);
    },
    setMode(mode) {
      preloader.setMode(mode === 'scanline' ? 1 : 0);
    },
    finish() {
      canvas.style.opacity = '0';
      preloader.stop?.();
    },

    destroy() {
      preloader.stop?.();
    },

    mode: 'main',
  };
}
