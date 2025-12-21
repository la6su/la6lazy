import { createGLPreloader } from './shader-preload';

interface Preloader {
  setProgress(value: number): void;
  setScanlinePhase(value: number): void;
  setMode(value: number): void;
  stop(): void;
}

let preloader: Preloader | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, value, canvas, width, height, dpr } = e.data;

  switch (type) {
    case 'init': {
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      preloader = createGLPreloader(canvas);
      break;
    }

    case 'progress': {
      preloader?.setProgress(value);
      break;
    }

    case 'scanlinePhase': {
      preloader?.setScanlinePhase(value);
      break;
    }

    case 'mode': {
      preloader?.setMode(value);
      break;
    }

    case 'stop': {
      preloader?.stop?.();
      self.close();
      break;
    }
  }
};
