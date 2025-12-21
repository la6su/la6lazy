function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function supportsWorkerOffscreen() {
  return 'OffscreenCanvas' in window && 'Worker' in window && !isSafari();
}

export async function createCRTLoader(options: {
  canvas: HTMLCanvasElement;
  dpr?: number;
}) {
  const canvas: HTMLCanvasElement = options.canvas;
  const dpr = options.dpr ?? 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // ---------------------------------------------------------------------------
  // WORKER PATH
  // ---------------------------------------------------------------------------
  if (supportsWorkerOffscreen()) {
    const offscreen = canvas.transferControlToOffscreen();

    const worker = new Worker(new URL('./crt-worker.ts', import.meta.url), {
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
      setProgress(value: number) {
        worker.postMessage({ type: 'progress', value });
      },

      setScanlinePhase(value: number) {
        worker.postMessage({ type: 'scanlinePhase', value });
      },

      setMode(mode: string) {
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

  // ---------------------------------------------------------------------------
  // FALLBACK (MAIN THREAD)
  // ---------------------------------------------------------------------------
  const glCanvas = canvas;
  glCanvas.width = width * dpr;
  glCanvas.height = height * dpr;

  // Lazy load WebGL preloader
  const { createGLPreloader } = await import('./shader-preload');
  const preloader = createGLPreloader(glCanvas);

  return {
    setProgress(value: number) {
      preloader.setProgress(value);
    },

    setScanlinePhase(value: number) {
      preloader.setScanlinePhase(value);
    },

    setMode(mode: string) {
      preloader.setMode(mode === 'scanline' ? 1 : 0);
    },

    finish() {
      canvas.style.opacity = '0';
      preloader.destroy?.();
    },

    destroy() {
      preloader.destroy?.();
    },

    mode: 'main',
  };
}
