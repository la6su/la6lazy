import { createCRTLoader } from './preloader/crt-bootstrap';
import { createUnlocker } from './ui/unlocker';
import EventEmitter from 'wolfy87-eventemitter';
import { DOMUtils } from './utils/dom';
import { MemoryMonitor } from './utils/memory';

// -----------------------------------------------------------------------------
// APPLICATION PHASES
// -----------------------------------------------------------------------------
enum AppPhase {
  HTML_CSS = 'html-css',
  CRT_POWER_ON = 'crt-power-on',
  IDLE = 'idle',
  SCANLINE_LOADER = 'scanline-loader',
  SCENE = 'scene',
}

// Export for potential external use
(window as any).AppPhase = AppPhase;

class AppState {
  private currentPhase: AppPhase = AppPhase.HTML_CSS;
  private listeners: ((phase: AppPhase) => void)[] = [];

  getCurrentPhase(): AppPhase {
    return this.currentPhase;
  }

  setPhase(phase: AppPhase) {
    if (this.currentPhase !== phase) {
      console.log(`App phase transition: ${this.currentPhase} → ${phase}`);
      this.currentPhase = phase;
      this.listeners.forEach(listener => listener(phase));
    }
  }

  onPhaseChange(listener: (phase: AppPhase) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (phase: AppPhase) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}

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
let loadingStarted = false;
let crt: Awaited<ReturnType<typeof createCRTLoader>> | null = null;

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
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }

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
      if (visualProgress > 0.995) {
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
// SCENE MANAGEMENT
// -----------------------------------------------------------------------------
let controller: any = null;
let currentScene: any = null;
const assetManager = (
  await import('./utils/asset-manager')
).AssetManager.getInstance();

// Scene registry
const sceneClasses: Record<string, any> = {};

async function registerScenes() {
  const { HeroLayer } = await import('./scenes/hero-layer');
  const { DemoLayer } = await import('./scenes/demo-layer');

  sceneClasses.hero = HeroLayer;
  sceneClasses.demo = DemoLayer;
}

async function switchToScene(sceneName: string) {
  if (!controller) return;

  // Remove current scene if exists
  if (currentScene) {
    // Dispose of Three.js resources
    currentScene.scene.traverse((object: any) => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material: any) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      if (object.geometry) {
        object.geometry.dispose();
      }
    });

    // Clear the scene
    while (currentScene.scene.children.length > 0) {
      currentScene.scene.remove(currentScene.scene.children[0]);
    }

    // Remove from controller
    controller.removeLayer(currentScene.name);
    currentScene = null;
  }

  // Create and add new scene
  const SceneClass = sceneClasses[sceneName];
  if (SceneClass) {
    currentScene = new SceneClass({
      name: sceneName,
      canvas: mainCanvas!,
    });
    controller.addLayer(currentScene);

    globalEmitter.emit('sceneChanged', { sceneName, layer: currentScene });
    console.log(`Switched to scene: ${sceneName}`);
  }
}

// -----------------------------------------------------------------------------
// SCENE LOADING PIPELINE
// -----------------------------------------------------------------------------
async function startSceneLoading() {
  const { Controller } = await import('ore-three');

  setLoadProgress(0.3);

  controller = new Controller({
    pointerEventElement: mainCanvas!,
  });

  setLoadProgress(0.5);

  // Register available scenes
  await registerScenes();

  setLoadProgress(0.8);

  // Load initial scene
  await switchToScene('hero');

  setLoadProgress(1);

  // Export for global access
  (window as any).controller = controller;
  (window as any).switchToScene = switchToScene;
  (window as any).assetManager = assetManager;
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
