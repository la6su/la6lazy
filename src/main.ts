import { createCRTLoader } from './preloader/crt-bootstrap';
import { createUnlocker } from './ui/unlocker';
import EventEmitter from 'wolfy87-eventemitter';
import { DOMUtils } from './utils/dom';
import { MemoryMonitor } from './utils/memory';
import { AppState, AppPhase } from './core/app-state';
import { ProgressController } from './core/progress-controller';
import { SceneManager } from './scenes/scene-manager';

// Export for potential external use
(window as any).AppPhase = AppPhase;

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const mainCanvas = DOMUtils.getElementById('main-canvas', HTMLCanvasElement);
const crtCanvas = DOMUtils.getElementById('crt-canvas', HTMLCanvasElement);

if (!mainCanvas) throw new Error('Main canvas not found');
if (!crtCanvas) throw new Error('CRT canvas not found');

// -----------------------------------------------------------------------------
// GLOBAL EVENT EMITTER
// -----------------------------------------------------------------------------
export const globalEmitter = new EventEmitter();

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------
const appState = new AppState();
const progressController = new ProgressController();
let loadingStarted = false;
let crt: Awaited<ReturnType<typeof createCRTLoader>> | null = null;
let sceneManager: SceneManager;

// Export for use in other modules
(window as any).appEmitter = globalEmitter;
(window as any).appState = appState;

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

// Set initial phase
appState.setPhase(AppPhase.HTML_CSS);

// -----------------------------------------------------------------------------
// CRT POWER-ON (fixed frames, no easing)
// -----------------------------------------------------------------------------
async function playCRTPowerOn(frames = 20) {
  if (!crt) return; // Skip if CRT failed to initialize

  appState.setPhase(AppPhase.CRT_POWER_ON);

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
        appState.setPhase(AppPhase.IDLE);
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

// запускаем CRT сразу
await playCRTPowerOn();

// -----------------------------------------------------------------------------
// PROGRESS MANAGEMENT
// -----------------------------------------------------------------------------
progressController.setProgressUpdateCallback(progress => {
  if (crt) crt.setProgress(progress);
});

function setLoadProgress(value: number) {
  progressController.setTargetProgress(value);
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
const unlockerEl = DOMUtils.getElementById('unlocker');

if (!unlockerEl) throw new Error('Unlocker element not found');

createUnlocker(unlockerEl, {
  onStart: () => {
    if (loadingStarted) return;
    loadingStarted = true;
    appState.setPhase(AppPhase.SCANLINE_LOADER);

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
      if (progressController.getCurrentProgress() > 0.995) {
        if (crt) crt.finish();
        crtCanvas.style.display = 'none';
        appState.setPhase(AppPhase.SCENE);
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

  setLoadProgress(0.3);

  const controller = new Controller({
    pointerEventElement: mainCanvas!,
  });

  setLoadProgress(0.5);

  // Initialize scene manager
  sceneManager = new SceneManager(controller, mainCanvas!, globalEmitter);

  // Register scenes
  const { HeroLayer } = await import('./scenes/hero-layer');
  const { DemoLayer } = await import('./scenes/demo-layer');

  sceneManager.registerScenes({
    hero: HeroLayer,
    demo: DemoLayer,
  });

  setLoadProgress(0.8);

  // Load initial scene
  await sceneManager.switchToScene('hero');

  setLoadProgress(1);

  // Export for global access
  (window as any).sceneManager = sceneManager;
  (window as any).switchToScene = sceneManager.switchToScene.bind(sceneManager);
}

// -----------------------------------------------------------------------------
// MEMORY MONITORING (dev only)
// -----------------------------------------------------------------------------
if (MemoryMonitor.isSupported()) {
  const memoryMonitor = MemoryMonitor.getInstance();
  memoryMonitor.startMonitoring(10000); // Check every 10 seconds

  memoryMonitor.onMemoryUpdate(info => {
    console.log(
      `Memory: ${formatBytes(info.usedJSHeapSize)} / ${formatBytes(info.jsHeapSizeLimit)}`
    );
  });

  // Export for debugging
  (window as any).memoryMonitor = memoryMonitor;
}

// Import formatBytes for console logging
import { formatBytes } from './utils/memory';
