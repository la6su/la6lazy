import { createCRTLoader } from './preloader/crt-bootstrap.js';
import { createUnlocker } from './ui/unlocker.js';

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const mainCanvas = document.getElementById('main-canvas');
const crtCanvas = document.getElementById('crt-canvas');

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------
let loadingStarted = false;

// -----------------------------------------------------------------------------
// INIT CRT
// -----------------------------------------------------------------------------
const crt = await createCRTLoader({
  canvas: crtCanvas,
  dpr: window.devicePixelRatio,
});

// -----------------------------------------------------------------------------
// CRT POWER-ON (fixed frames, no easing)
// -----------------------------------------------------------------------------
async function playCRTPowerOn(frames = 20) {
  let frame = 0;

  crt.setMode('boot');
  crt.setProgress(0);

  return new Promise(resolve => {
    function tick() {
      frame++;
      crt.setProgress(Math.min(1, frame / frames));

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
let rafId = null;

/**
 * Запросить изменение прогресса загрузки.
 * Прогресс всегда монотонный (не откатывается назад).
 */
function setLoadProgress(value) {
  targetProgress = Math.min(1, Math.max(targetProgress, value));
  startProgressSmoothing();
}

function startProgressSmoothing() {
  if (rafId !== null) return;

  function tick() {
    visualProgress += (targetProgress - visualProgress) * 0.18;
    crt.setProgress(visualProgress);

    if (Math.abs(targetProgress - visualProgress) > 0.002) {
      rafId = requestAnimationFrame(tick);
    } else {
      visualProgress = targetProgress;
      crt.setProgress(visualProgress);
      rafId = null;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// -----------------------------------------------------------------------------
// PRELOAD MINIMUM (без визуального loader)
// -----------------------------------------------------------------------------
(async function preloadMinimal() {
  await import('./preloader/shader-preload.js');
  await import('./preloader/preloader.js');
})();

// -----------------------------------------------------------------------------
// UNLOCK → REAL ASSET LOADING (scanline mode)
// -----------------------------------------------------------------------------
createUnlocker(document.getElementById('unlocker'), {
  onStart: () => {
    if (loadingStarted) return;
    loadingStarted = true;
    //  console.log('unlock start');

    crt.setMode('scanline');

    // стартуем загрузку, но не ждём
    void startSceneLoading();
  },
  onProgress: p => {
    // console.log('unlock progress', p);
    crt.setScanlinePhase(p);
  },

  onUnlock: () => {
    // гарантируем завершение прогресса
    setLoadProgress(1);
    // console.log('unlock end');
    const waitForFinish = () => {
      if (visualProgress > 0.995) {
        crt.finish();
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
  try {
    const { Controller } = await import('ore-three');
    setLoadProgress(0.5);

    const { HeroLayer } = await import('./scenes/hero-layer.js');
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
  } catch (error) {
    console.error('Failed to load scene:', error);
    setLoadProgress(1); // Complete progress even on error
  }
}
