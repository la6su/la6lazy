import { createCRTLoader } from './preloader/crt-bootstrap';
import { createUnlocker } from './ui/unlocker';

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const mainCanvasEl = document.getElementById('main-canvas');
const crtCanvasEl = document.getElementById('crt-canvas');

if (!mainCanvasEl || !(mainCanvasEl instanceof HTMLCanvasElement))
  throw new Error('Main canvas not found');
if (!crtCanvasEl || !(crtCanvasEl instanceof HTMLCanvasElement))
  throw new Error('CRT canvas not found');

const mainCanvas = mainCanvasEl;
const crtCanvas = crtCanvasEl;

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------
let loadingStarted = false;
let crt: Awaited<ReturnType<typeof createCRTLoader>> | null = null;

// -----------------------------------------------------------------------------
// INIT CRT
// -----------------------------------------------------------------------------
try {
  crt = await createCRTLoader({
    canvas: crtCanvas,
    dpr: window.devicePixelRatio,
  });
} catch (error) {
  console.error('Failed to initialize CRT loader:', error);
  // Graceful degradation: hide CRT canvas and proceed with basic scene
  crtCanvas.style.display = 'none';
  crt = null;
}

// -----------------------------------------------------------------------------
// CRT POWER-ON (fixed frames, no easing)
// -----------------------------------------------------------------------------
async function playCRTPowerOn(frames = 20) {
  if (!crt) return; // Skip if CRT failed to initialize

  let frame = 0;

  crt!.setMode('boot');
  crt!.setProgress(0);

  return new Promise<void>(resolve => {
    function tick() {
      frame++;
      crt!.setProgress(Math.min(1, frame / frames));

      if (frame < frames) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

// запускаем CRT сразу
await playCRTPowerOn();

// -----------------------------------------------------------------------------
// LOAD PROGRESS CONTROLLER (single source of truth)
// -----------------------------------------------------------------------------
let visualProgress = 0;
let targetProgress = 0;
let rafId: number | null = null;

/**
 * Запросить изменение прогресса загрузки.
 * Прогресс всегда монотонный (не откатывается назад).
 */
function setLoadProgress(value: number) {
  targetProgress = Math.min(1, Math.max(targetProgress, value));
  startProgressSmoothing();
}

function startProgressSmoothing() {
  if (rafId !== null) return;

  function tick() {
    visualProgress += (targetProgress - visualProgress) * 0.18;
    if (crt) crt.setProgress(visualProgress);

    if (Math.abs(targetProgress - visualProgress) > 0.002) {
      rafId = requestAnimationFrame(tick);
    } else {
      visualProgress = targetProgress;
      if (crt) crt.setProgress(visualProgress);
      rafId = null;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// -----------------------------------------------------------------------------
// PRELOAD MINIMUM (без визуального loader)
// -----------------------------------------------------------------------------
(async function preloadMinimal() {
  await import('./preloader/shader-preload');
  await import('./preloader/preloader');
})();

// -----------------------------------------------------------------------------
// UNLOCK → REAL ASSET LOADING (scanline mode)
// -----------------------------------------------------------------------------
const unlockerEl = document.getElementById('unlocker');

if (!unlockerEl) throw new Error('Unlocker element not found');

createUnlocker(unlockerEl, {
  onStart: () => {
    if (loadingStarted) return;
    loadingStarted = true;
    //  console.log('unlock start');

    if (crt) crt.setMode('scanline');

    // стартуем загрузку, но не ждём
    void startSceneLoading();
  },
  onProgress: (p: any) => {
    // console.log('unlock progress', p);
    if (crt) crt.setScanlinePhase(p);
  },

  onUnlock: () => {
    // гарантируем завершение прогресса
    setLoadProgress(1);
    // console.log('unlock end');
    const waitForFinish = () => {
      if (visualProgress > 0.995) {
        if (crt) crt.finish();
        crtCanvas.style.display = 'none';
      } else {
        requestAnimationFrame(waitForFinish);
      }
    };

    waitForFinish();
  },
});

// -----------------------------------------------------------------------------
// SCENE LOADING PIPELINE
// -----------------------------------------------------------------------------
async function startSceneLoading() {
  const { Controller } = await import('ore-three');
  setLoadProgress(0.5);

  const { HeroLayer } = await import('./scenes/hero-layer');
  setLoadProgress(0.8);

  const controller = new Controller({
    pointerEventElement: mainCanvas,
  });

  controller.addLayer(
    new HeroLayer({
      name: 'HeroLayer',
      canvas: mainCanvas,
    })
  );

  setLoadProgress(1);
}
