import EventEmitter from 'wolfy87-eventemitter';
import { AppPhase } from './core/app-state';

// Export for potential external use
(window as any).AppPhase = AppPhase;

// -----------------------------------------------------------------------------
// GLOBAL EVENT EMITTER
// -----------------------------------------------------------------------------
export const globalEmitter = new EventEmitter();

// -----------------------------------------------------------------------------
// IMMEDIATE CRT LOADER INITIALIZATION
// -----------------------------------------------------------------------------
(async function initCRTImmediately() {
  try {
    // Hide the HTML loader immediately
    const htmlLoader = document.getElementById('loader');
    if (htmlLoader) {
      htmlLoader.style.display = 'none';
    }

    // Preload shaders
    await import('./preloader/shaders');

    // Initialize CRT loader immediately
    const { createCRTLoader } = await import('./preloader/crt-bootstrap');
    const crtCanvas = document.getElementById('crt-canvas') as HTMLCanvasElement;

    if (crtCanvas) {
      const crt = await createCRTLoader({
        canvas: crtCanvas,
        dpr: window.devicePixelRatio,
      });

      // Start boot animation immediately
      crt.setMode('boot');
      crt.setProgress(0);

      // Animate boot progress
      let frame = 0;
      const bootFrames = 30;
      const animateBoot = () => {
        frame++;
        crt.setProgress(Math.min(1, frame / bootFrames));

        if (frame < bootFrames) {
          requestAnimationFrame(animateBoot);
        } else {
          // Switch to idle mode after boot
          crt.setMode('idle');
          crt.setProgress(1);
        }
      };
      requestAnimationFrame(animateBoot);

      // Export CRT globally for later use
      (window as any).crt = crt;
      console.log('CRT initialized and boot animation started');
    }
  } catch (error) {
    console.error('Failed to initialize CRT immediately:', error);
  }
})();

// -----------------------------------------------------------------------------
// LAZY LOAD APPLICATION CONTROLLER
// -----------------------------------------------------------------------------
const { AppController } = await import('./core/app-controller');
const appController = new AppController(globalEmitter);

// -----------------------------------------------------------------------------
// START APPLICATION
// -----------------------------------------------------------------------------
await appController.initialize();
